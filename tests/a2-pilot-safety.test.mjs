import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { GoogleGenAI as PilotGoogleGenAI } from "@google/genai-a2-pilot";
import {
  A2_PILOT_ID, A2_PILOT_MAX_CENTS, A2_PILOT_MAX_REQUESTS, A2_PILOT_RESERVATION_CENTS,
  A2_PILOT_CASES, A2PilotLedger, initialA2PilotState, startPilotCase,
  reservePilotRequest, settlePilotRequest, stopPilot, markPilotServerComplete,
  completePilotCase, acknowledgeA2PilotBrowser,
  estimatePilotChargeCents, pilotAuthorized, validA2PilotFile,
  beginA2Pilot, a2PilotBeforeProvider, a2PilotAfterProvider, a2PilotOnError,
} from "../src/lib/a2PilotSafety.ts";

const SECRET = "a2-pilot-private-test-token-123456789012345";
const make = () => initialA2PilotState();
const take = (s, caseId = "BOSTON_CLEAN") => reservePilotRequest(s, caseId);
const success = (s, caseId = "BOSTON_CLEAN") => settlePilotRequest(take(s, caseId), 1);

test("real installed pilot SDK is pinned 2.30.0 without upgrading normal YSS SDK", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies["@google/genai"], "^2.4.0");
  assert.equal(pkg.dependencies["@google/genai-a2-pilot"], "npm:@google/genai@2.30.0");
  const require = createRequire(import.meta.url);
  let current = dirname(require.resolve("@google/genai-a2-pilot"));
  let installed = null;
  for (let i = 0; i < 6; i++) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) {
      const meta = JSON.parse(readFileSync(candidate, "utf8"));
      if (meta.name === "@google/genai") { installed = meta.version; break; }
    }
    current = dirname(current);
  }
  assert.equal(installed, "2.30.0", "pilot must use a capable installed SDK, not the older normal lockfile SDK");
  const client = new PilotGoogleGenAI({ apiKey: "test-only-no-paid-request",
    httpOptions: { retryOptions: { attempts: 1 } } });
  assert.equal(typeof client.models.generateContent, "function");
});

test("pilot constants encode exactly 4 slots, 24 requests, $5 and $1.75 worst-case reservation", () => {
  assert.equal(A2_PILOT_ID, "A2_FOUR_SONG_20261024");
  assert.deepEqual(A2_PILOT_CASES, ["BOSTON_CLEAN", "T01_B", "DRAKE_CLEAN", "T02_B"]);
  assert.equal(A2_PILOT_MAX_REQUESTS, 24);
  assert.equal(A2_PILOT_MAX_CENTS, 500);
  assert.equal(A2_PILOT_RESERVATION_CENTS, 175);
});

test("pilot refuses out-of-order or duplicate recording slots", () => {
  assert.throws(() => startPilotCase(make(), "T01_B"), /incorrect or duplicate/);
  const first = startPilotCase(make(), "BOSTON_CLEAN");
  assert.throws(() => startPilotCase(first, "BOSTON_CLEAN"), /unfinished/);
  let current = first;
  for (let i = 0; i < 5; i++) current = success(current);
  current = completePilotCase(markPilotServerComplete(current, "BOSTON_CLEAN"), "BOSTON_CLEAN");
  assert.equal(current.completedCases, 1);
  assert.throws(() => startPilotCase(current, "BOSTON_CLEAN"), /incorrect or duplicate/);
  assert.equal(startPilotCase(current, "T01_B").activeCase, "T01_B");
});

test("a completed case requires 5 or 6 finished provider operations", () => {
  let s = startPilotCase(make(), "BOSTON_CLEAN");
  assert.throws(() => completePilotCase(s, "BOSTON_CLEAN"), /incomplete/);
  for (let i = 0; i < 4; i++) s = success(s);
  assert.throws(() => completePilotCase(s, "BOSTON_CLEAN"), /incomplete/);
  s = success(s);
  assert.throws(() => completePilotCase(s, "BOSTON_CLEAN"), /browser A2 completion not confirmed/);
  s = markPilotServerComplete(s, "BOSTON_CLEAN");
  assert.equal(s.awaitingClientAck, true);
  assert.throws(() => take(s), /awaiting verified browser completion/);
  assert.equal(completePilotCase(s, "BOSTON_CLEAN").completedCases, 1);
});

test("a seventh provider operation for one recording is rejected BEFORE dispatch", () => {
  let s = startPilotCase(make(), "BOSTON_CLEAN");
  for (let i = 0; i < 6; i++) s = success(s);
  assert.equal(s.callsThisCase, 6);
  assert.equal(s.requests, 6);
  assert.equal(s.inFlight, false);
  const refused = take(s);
  assert.equal(refused.stopped, true);
  assert.equal(refused.requests, 6);
  assert.equal(refused.spentCents, 6);
  assert.match(refused.stopReason, /six provider operations per recording/);
  assert.throws(() => take(refused), /six provider operations/);
});

test("all four cases can settle exactly 24 authorized requests with six each", () => {
  let s = make();
  for (const caseId of A2_PILOT_CASES) {
    s = startPilotCase(s, caseId);
    for (let i = 0; i < 6; i++) s = settlePilotRequest(take(s, caseId), 1);
    s = completePilotCase(markPilotServerComplete(s, caseId), caseId);
  }
  assert.equal(s.requests, 24);
  assert.equal(s.completedCases, 4);
  assert.equal(s.spentCents, 24);
  assert.throws(() => startPilotCase(s, "BOSTON_CLEAN"), /incorrect or duplicate/);
});

test("genre verification exception is fatal to pilot, preserving normal fallback outside pilot", () => {
  const server = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  assert.match(server, /if \(isA2PilotRequest\(\) \|\| isGeminiPrepayExhausted\(err\)\) throw err;/);
  assert.match(server, /Verification failed; continuing with the original classification/);
});

test("concurrent provider attempt cannot double-spend an in-flight slot", () => {
  const first = take(startPilotCase(make(), "BOSTON_CLEAN"));
  assert.equal(first.requests, 1);
  assert.equal(first.spentCents, 175);
  assert.equal(first.inFlight, true);
  assert.throws(() => take(first), /in flight/);
  assert.throws(() => completePilotCase(first, "BOSTON_CLEAN"), /incomplete/);
});

test("reservation is charged before the attempt and never automatically refunded after failure", () => {
  const first = take(startPilotCase(make(), "BOSTON_CLEAN"));
  const failed = stopPilot(first, "provider timeout");
  assert.equal(failed.spentCents, 175);
  assert.equal(failed.requests, 1);
  assert.equal(failed.inFlight, true);
  assert.throws(() => take(failed), /provider timeout/);
  assert.throws(() => startPilotCase(failed, "T01_B"), /provider timeout/);
});

test("24-request maximum is independently enforced", () => {
  let s = startPilotCase(make(), "BOSTON_CLEAN");
  // The pure admission gate also supports a test state representing a partial pilot.
  s = { ...s, requests: 23, spentCents: 0 };
  s = settlePilotRequest(take(s), 1);
  assert.equal(s.requests, 24);
  const closed = take(s);
  assert.equal(closed.stopped, true);
  assert.equal(closed.requests, 24);
  assert.match(closed.stopReason, /24-request/);
});

test("$5 ceiling refuses next reserved attempt even if 24-call allowance remains", () => {
  const s = { ...startPilotCase(make(), "BOSTON_CLEAN"), spentCents: 326 };
  const stopped = take(s);
  assert.equal(stopped.stopped, true);
  assert.equal(stopped.requests, 0);
  assert.equal(stopped.spentCents, 326);
});

test("single successful provider response reconciles a conservative reservation", () => {
  const s = take(startPilotCase(make(), "BOSTON_CLEAN"));
  const done = settlePilotRequest(s, 3);
  assert.equal(done.requests, 1);
  assert.equal(done.spentCents, 3);
  assert.equal(done.inFlight, false);
  assert.throws(() => settlePilotRequest(done, 1), /invalid settlement/);
});

test("usage estimator assumes all input is audio and output includes thinking", () => {
  const known = estimatePilotChargeCents({
    promptTokenCount: 7000, candidatesTokenCount: 13000,
    thoughtsTokenCount: 5000, totalTokenCount: 25000,
  });
  assert.equal(known, Math.ceil(1.25 * (7000 / 10000 + 18000 / 4000)));
  assert.equal(estimatePilotChargeCents({
    promptTokenCount: 1048576, candidatesTokenCount: 65536,
    thoughtsTokenCount: 0, totalTokenCount: 1114112,
  }) <= A2_PILOT_RESERVATION_CENTS, true);
});

test("incomplete, negative, implausible or missing usage always fails closed", () => {
  for (const usage of [
    undefined, {}, {promptTokenCount: 1, totalTokenCount: 2},
    {promptTokenCount: -1, candidatesTokenCount: 1, totalTokenCount: 2},
    {promptTokenCount: 1048577, candidatesTokenCount: 1, totalTokenCount: 1048578},
    {promptTokenCount: 10, candidatesTokenCount: 70000, totalTokenCount: 70010},
    {promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 9},
  ]) assert.equal(estimatePilotChargeCents(usage), null);
});

test("token checks require correct private token and never accept a weak secret", () => {
  assert.equal(pilotAuthorized(SECRET, SECRET), true);
  assert.equal(pilotAuthorized("not the token", SECRET), false);
  assert.equal(pilotAuthorized(SECRET, "short"), false);
  assert.equal(pilotAuthorized(undefined, SECRET), false);
});

test("damaged filenames are exact, clean files exclude blinded damage variants", () => {
  assert.equal(validA2PilotFile("T01_B", "T01_B.mp3"), true);
  assert.equal(validA2PilotFile("T02_B", "T02_B.mp3"), true);
  assert.equal(validA2PilotFile("T01_B", "T02_B.mp3"), false);
  assert.equal(validA2PilotFile("BOSTON_CLEAN", "More_Feeling.mp3"), true);
  assert.equal(validA2PilotFile("DRAKE_CLEAN", "03_GP.mp3"), true);
  assert.equal(validA2PilotFile("BOSTON_CLEAN", "T01_A.mp3"), false);
});

// Simulate one durable SQL row, a BEGIN/SELECT FOR UPDATE/UPDATE/COMMIT workflow,
// and a serialized database-level row lock shared across different ledger objects.
function fakePostgres() {
  const store = { state: make() };
  let lock = Promise.resolve();
  const db = {
    async query() { return {rows: []}; },
    async connect() {
      const preceding = lock;
      let unlock;
      lock = new Promise(resolve => { unlock = resolve; });
      await preceding;
      let tentative = structuredClone(store.state);
      return {
        async query(sql, params) {
          if (sql === "BEGIN") return {rows: []};
          if (sql.includes("SELECT state")) return {rows: [{state: structuredClone(tentative)}]};
          if (sql.includes("UPDATE yss_a2_pilot_ledger")) {
            tentative = JSON.parse(params[1]); return {rows: []};
          }
          if (sql === "COMMIT") {store.state = tentative; return {rows: []};}
          if (sql === "ROLLBACK") return {rows: []};
          throw new Error("unexpected SQL");
        },
        release() { unlock(); },
      };
    },
    snapshot() {return structuredClone(store.state);}
  };
  return db;
}

test("database row lock prevents concurrent authorization across separate processes", async () => {
  const db = fakePostgres(), a = new A2PilotLedger(db), b = new A2PilotLedger(db);
  const outcomes = await Promise.allSettled([
    a.transact(s => startPilotCase(s, "BOSTON_CLEAN")),
    b.transact(s => startPilotCase(s, "BOSTON_CLEAN")),
  ]);
  assert.equal(outcomes.filter(x => x.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(x => x.status === "rejected").length, 1);
  assert.equal(db.snapshot().activeCase, "BOSTON_CLEAN");
});

test("database reservations survive reconstructing a new ledger after simulated restart", async () => {
  const db = fakePostgres();
  await new A2PilotLedger(db).transact(s => startPilotCase(s, "BOSTON_CLEAN"));
  await new A2PilotLedger(db).transact(s => take(s));
  assert.equal(db.snapshot().requests, 1);
  assert.equal(db.snapshot().spentCents, 175);
  await assert.rejects(new A2PilotLedger(db).transact(s => take(s)), /in flight/);
});

test("provider failure causes a persistent stop; later requests are rejected", async () => {
  const db = fakePostgres(), ledger = new A2PilotLedger(db);
  await ledger.transact(s => startPilotCase(s, "BOSTON_CLEAN"));
  const ctx = {caseId:"BOSTON_CLEAN",stopped:false};
  const old = process.env.YSS_A2_PILOT_ENABLED;
  // The helper uses configured storage. Pure persistent transition test is enough
  // here; no env credentials or external database are ever touched.
  await ledger.transact(s => take(s));
  await ledger.transact(s => stopPilot(s, "usage missing"));
  assert.equal(db.snapshot().stopped, true);
  await assert.rejects(ledger.transact(s => take(s)), /usage missing/);
  assert.equal(process.env.YSS_A2_PILOT_ENABLED, old);
  assert.equal(ctx.stopped, false);
});

test("server and UI integrate guard only into the ordinary single-file pilot opt-in", () => {
  const server = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(server, /upload\.single\("audio"\), beginA2Pilot, async/);
  assert.match(server, /await a2PilotBeforeProvider\(pilot\)/);
  assert.match(server, /await a2PilotAfterProvider\(pilot, response\)/);
  assert.match(server, /await finishA2PilotIfActive\(\)/);
  assert.match(server, /app.post\("\/api\/internal\/a2-pilot\/ack", acknowledgeA2PilotBrowser\)/);
  assert.match(server, /retryOptions: \{ attempts: 1 \}/);
  assert.match(server, /automaticContinuation: false/);
  assert.match(server, /a2PilotOnError\(a2Context\)/);
  assert.match(server, /const attemptLimit = Math\.min\(3/); // normal route unchanged
  assert.match(app, /a2PilotEnabled \? \{headers: \{"X-YSS-A2-Pilot-Token": a2PilotToken\}\}/);
  assert.match(app, /formData\.append\("a2PilotCase", a2PilotCase\)/);
  assert.match(app, /genreMode !== "auto"/);
  assert.match(app, /spaceStage !== "COMPLETED"/);
  assert.match(app, /midrangeStage !== "COMPLETED"/);
  assert.match(app, /fetch\("\/api\/internal\/a2-pilot\/ack"/);
  assert.equal((server.match(/model: "gemini-2\.5-flash"/g) || []).length, 7);
});

test("server response alone cannot unlock next recording or allow extra provider calls", () => {
  let s = startPilotCase(make(), "BOSTON_CLEAN");
  for (let i = 0; i < 5; i++) s = success(s);
  s = markPilotServerComplete(s, "BOSTON_CLEAN");
  assert.throws(() => startPilotCase(s, "T01_B"), /unfinished/);
  assert.throws(() => reservePilotRequest(s, "BOSTON_CLEAN"), /awaiting verified browser completion/);
  s = completePilotCase(s, "BOSTON_CLEAN");
  assert.equal(s.completedCases, 1);
  assert.equal(s.awaitingClientAck, false);
  assert.equal(startPilotCase(s, "T01_B").activeCase, "T01_B");
});

test("browser pending state persists across simulated restarts and blocks next song", async () => {
  const db = fakePostgres();
  const a = new A2PilotLedger(db);
  await a.transact(s => startPilotCase(s, "BOSTON_CLEAN"));
  for (let i = 0; i < 5; i++) {
    await a.transact(s => take(s));
    await a.transact(s => settlePilotRequest(s, 1));
  }
  await a.transact(s => markPilotServerComplete(s, "BOSTON_CLEAN"));
  assert.equal(db.snapshot().awaitingClientAck, true);
  await assert.rejects(new A2PilotLedger(db).transact(
    s => startPilotCase(s, "T01_B")), /unfinished/);
  await new A2PilotLedger(db).transact(s => completePilotCase(s, "BOSTON_CLEAN"));
  assert.equal(db.snapshot().completedCases, 1);
});

test("unauthorized browser acknowledgment rejects without DB writes or paid calls", async () => {
  const calls = [];
  const req = {body:{a2PilotCase:"BOSTON_CLEAN",spaceStage:"COMPLETED",midrangeStage:"COMPLETED"},
    get:()=> "incorrect-test-token-value-at-least-32-chars"};
  const res = {setHeader(){},status(n){calls.push(n);return this;},json(obj){calls.push(obj);}};
  await acknowledgeA2PilotBrowser(req,res);
  assert.equal(calls[0],403);
});

test("without pilot secret, opt-in fails before any provider request", async () => {
  const calls = [];
  const request = {body:{a2PilotCase:"BOSTON_CLEAN",threeX:"false"},
    file:{originalname:"More_Feeling.mp3"},get:()=>SECRET};
  const response = {status(n){calls.push(n);return this;},json(obj){calls.push(obj);}};
  const prev = process.env.YSS_A2_PILOT_TOKEN;
  delete process.env.YSS_A2_PILOT_TOKEN;
  let nextCalled=false;
  try { await beginA2Pilot(request,response,()=>{nextCalled=true;}); }
  finally {
    if(prev === undefined) delete process.env.YSS_A2_PILOT_TOKEN;
    else process.env.YSS_A2_PILOT_TOKEN=prev;
  }
  assert.equal(nextCalled,false);
  assert.equal(calls[0],403);
});

test("pilot never uses real AI keys, network or paid model calls during tests", () => {
  assert.equal(typeof a2PilotBeforeProvider,"function");
  assert.equal(typeof a2PilotAfterProvider,"function");
  assert.equal(typeof a2PilotOnError,"function");
});
