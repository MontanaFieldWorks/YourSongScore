/**
 * Four-recording A2 diagnostic pilot guard, intentionally disabled by default.
 * No part of normal scoring or regular Gemini request routing depends on it.
 * A PostgreSQL row serializes authorization, reservation and settlement across
 * Node processes/restarts. Pending rows are NOT automatically resumed.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, timingSafeEqual } from "node:crypto";
import pg from "pg";

export const A2_PILOT_ID = "A2_FOUR_SONG_20261024";
export const A2_PILOT_MODEL = "gemini-2.5-flash";
export const A2_PILOT_MAX_REQUESTS = 24;
export const A2_PILOT_MAX_CENTS = 500;
export const A2_PILOT_RESERVATION_CENTS = 175;
export const A2_PILOT_CASES = ["BOSTON_CLEAN", "T01_B", "DRAKE_CLEAN", "T02_B"] as const;
export type A2PilotCase = typeof A2_PILOT_CASES[number];

export interface A2PilotState {
  requests: number;
  spentCents: number;
  completedCases: number;
  activeCase: A2PilotCase | null;
  callsThisCase: number;
  inFlight: boolean;
  stopped: boolean;
  stopReason: string | null;
}
export interface A2PilotContext { caseId: A2PilotCase; stopped: boolean }
export const a2PilotContext = new AsyncLocalStorage<A2PilotContext>();

export const initialA2PilotState = (): A2PilotState => ({
  requests: 0, spentCents: 0, completedCases: 0, activeCase: null,
  callsThisCase: 0, inFlight: false, stopped: false, stopReason: null,
});

function deny(message: string): never { throw new Error("A2 PILOT STOP: " + message); }
function ensureNotStopped(state: A2PilotState): void {
  if (state.stopped) deny(state.stopReason || "pilot was stopped");
}
export function startPilotCase(state: A2PilotState, caseId: A2PilotCase): A2PilotState {
  ensureNotStopped(state);
  if (state.inFlight || state.activeCase) deny("another pilot case is unfinished");
  if (state.completedCases >= A2_PILOT_CASES.length ||
      A2_PILOT_CASES[state.completedCases] !== caseId) deny("incorrect or duplicate case order");
  return { ...state, activeCase: caseId, callsThisCase: 0 };
}
export function reservePilotRequest(state: A2PilotState, caseId: A2PilotCase): A2PilotState {
  ensureNotStopped(state);
  if (state.activeCase !== caseId) deny("no active authorized pilot case");
  if (state.inFlight) deny("a provider request remains in flight");
  if (state.requests >= A2_PILOT_MAX_REQUESTS ||
      state.spentCents + A2_PILOT_RESERVATION_CENTS > A2_PILOT_MAX_CENTS) {
    return { ...state, stopped: true, stopReason: "24-request or $5 conservative reservation ceiling reached" };
  }
  return { ...state, requests: state.requests + 1,
    spentCents: state.spentCents + A2_PILOT_RESERVATION_CENTS,
    callsThisCase: state.callsThisCase + 1, inFlight: true };
}
/**
 * Upper-bound standard-price input as all audio ($1/M tokens), output including
 * thoughts ($2.50/M), with 25% extra headroom. Reject absent/implausible usage.
 * Reserved $1.75 covers 1,048,576 prompt and 65,536 output tokens at these rates.
 * This is an application-level conservative ledger, not a Google billing guarantee.
 */
export function estimatePilotChargeCents(usage: any): number | null {
  const prompt = usage?.promptTokenCount;
  const total = usage?.totalTokenCount;
  const candidates = usage?.candidatesTokenCount;
  const thoughts = usage?.thoughtsTokenCount ?? 0;
  if (![prompt, total, candidates, thoughts].every(n =>
    typeof n === "number" && Number.isSafeInteger(n) && n >= 0)) return null;
  if (prompt > 1048576 || total < prompt || total - prompt > 65536 ||
      candidates + thoughts > 65536) return null;
  const output = Math.max(total - prompt, candidates + thoughts);
  const cents = Math.max(1, Math.ceil(1.25 * (prompt / 10000 + output / 4000)));
  return cents <= A2_PILOT_RESERVATION_CENTS ? cents : null;
}
export function settlePilotRequest(state: A2PilotState, cents: number): A2PilotState {
  if (!state.inFlight || !Number.isInteger(cents) || cents < 1 ||
      cents > A2_PILOT_RESERVATION_CENTS) deny("invalid settlement");
  return { ...state, inFlight: false,
    spentCents: state.spentCents - A2_PILOT_RESERVATION_CENTS + cents };
}
export function stopPilot(state: A2PilotState, reason: string): A2PilotState {
  return { ...state, stopped: true, stopReason: reason.slice(0, 180) };
}
export function completePilotCase(state: A2PilotState, caseId: A2PilotCase): A2PilotState {
  ensureNotStopped(state);
  if (state.activeCase !== caseId || state.inFlight ||
      state.callsThisCase < 5 || state.callsThisCase > 6) {
    deny("incomplete pilot analysis or outstanding request");
  }
  return { ...state, activeCase: null, callsThisCase: 0,
    completedCases: state.completedCases + 1 };
}
export function validA2PilotFile(caseId: A2PilotCase, filename: string): boolean {
  const safe = filename.trim().replace(/\\/g, "/").split("/").pop() || "";
  if (!/\.mp3$/i.test(safe)) return false;
  if (caseId === "T01_B") return /^T01_B\.mp3$/i.test(safe);
  if (caseId === "T02_B") return /^T02_B\.mp3$/i.test(safe);
  return !/^T\d\d[_-]/i.test(safe);
}
export function pilotAuthorized(token: unknown, secret: unknown): boolean {
  if (typeof secret !== "string" || secret.length < 32 ||
      typeof token !== "string" || token.length < 32 || token.length > 1024) return false;
  const hash = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(hash(token), hash(secret));
}

type DbClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }>; release: () => void };
type DbPool = { connect: () => Promise<DbClient>; query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };
export class A2PilotLedger {
  private initialized: Promise<void> | null = null;
  constructor(private db: DbPool) {}
  private async setup(): Promise<void> {
    if (!this.initialized) {
      this.initialized = (async () => {
        await this.db.query("CREATE TABLE IF NOT EXISTS yss_a2_pilot_ledger (id text PRIMARY KEY, state jsonb NOT NULL)");
        await this.db.query("INSERT INTO yss_a2_pilot_ledger (id, state) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING",
          [A2_PILOT_ID, JSON.stringify(initialA2PilotState())]);
      })();
    }
    return this.initialized; // reject closed if Postgres setup was interrupted
  }
  async transact(mutator: (current: A2PilotState) => A2PilotState): Promise<A2PilotState> {
    await this.setup();
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT state FROM yss_a2_pilot_ledger WHERE id=$1 FOR UPDATE", [A2_PILOT_ID]);
      if (selected.rows.length !== 1) deny("persistent ledger missing");
      const old = selected.rows[0].state as A2PilotState;
      if (!Number.isSafeInteger(old.requests) || !Number.isSafeInteger(old.spentCents) ||
          typeof old.inFlight !== "boolean") deny("invalid persistent ledger");
      const next = mutator(old);
      await client.query("UPDATE yss_a2_pilot_ledger SET state=$2::jsonb WHERE id=$1",
        [A2_PILOT_ID, JSON.stringify(next)]);
      await client.query("COMMIT");
      return next;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}
let ledger: A2PilotLedger | null = null;
export function configuredA2PilotLedger(): A2PilotLedger {
  if (process.env.YSS_A2_PILOT_ENABLED !== "true" ||
      !process.env.YSS_A2_PILOT_DATABASE_URL ||
      !process.env.YSS_A2_PILOT_TOKEN ||
      process.env.YSS_A2_PILOT_TOKEN.length < 32) deny("disabled or persistent storage/token not configured");
  if (!ledger) ledger = new A2PilotLedger(new pg.Pool({
    connectionString: process.env.YSS_A2_PILOT_DATABASE_URL,
    max: 3, connectionTimeoutMillis: 6000,
  }));
  return ledger;
}
export async function beginA2Pilot(req: any, res: any, next: () => void): Promise<void> {
  const caseId = req.body?.a2PilotCase;
  const bearer = req.get?.("X-YSS-A2-Pilot-Token");
  if (!caseId && !bearer) return next();
  try {
    if (!A2_PILOT_CASES.includes(caseId) ||
        !pilotAuthorized(bearer, process.env.YSS_A2_PILOT_TOKEN) ||
        !validA2PilotFile(caseId, req.file?.originalname || "") ||
        req.body?.threeX !== "false" ||
        req.body?.metaTitle || req.body?.metaArtist || req.body?.metaGenre) {
      return void res.status(403).json({error: "A2 pilot authorization/case/filename rejected"});
    }
    const store = configuredA2PilotLedger();
    await store.transact(state => startPilotCase(state, caseId));
    a2PilotContext.run({caseId, stopped: false}, next);
  } catch (e: any) {
    res.status(409).json({ error: String(e?.message || e) });
  }
}
export async function a2PilotBeforeProvider(context: A2PilotContext): Promise<void> {
  if (context.stopped) deny("request failed earlier in this pilot case");
  const state = await configuredA2PilotLedger().transact(s => reservePilotRequest(s, context.caseId));
  if (state.stopped) { context.stopped = true; deny(state.stopReason!); }
}
export async function a2PilotAfterProvider(context: A2PilotContext, response: any): Promise<void> {
  const cents = estimatePilotChargeCents(response?.usageMetadata);
  if (cents === null) {
    context.stopped = true;
    await configuredA2PilotLedger().transact(s => stopPilot(s, "missing, inconsistent or over-budget Gemini usage metadata"));
    deny("missing, inconsistent or over-budget Gemini usage metadata");
  }
  await configuredA2PilotLedger().transact(s => settlePilotRequest(s, cents));
}
export async function a2PilotOnError(context: A2PilotContext): Promise<void> {
  context.stopped = true;
  // Do not refund reserved charges or automatically reopen after errors.
  try {
    await configuredA2PilotLedger().transact(s => stopPilot(s, "Gemini/provider/ledger error; manual review required"));
  } catch { /* failed persistence itself also blocks subsequent calls */ }
}
export async function finishA2PilotIfActive(): Promise<void> {
  const context = a2PilotContext.getStore();
  if (!context) return;
  if (context.stopped) deny("provider error");
  await configuredA2PilotLedger().transact(s => completePilotCase(s, context.caseId));
}
export function isA2PilotRequest(): boolean { return !!a2PilotContext.getStore(); }
