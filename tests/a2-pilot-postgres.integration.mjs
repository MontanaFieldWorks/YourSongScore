/**
 * REAL PostgreSQL integration, deliberately excluded from tests/*.test.mjs.
 * Executes ONLY with an explicit disposable CI service DB address; no Render,
 * production secrets, Gemini key, paid model, or application deployment.
 */
import assert from "node:assert/strict";
import { test, before, beforeEach, after } from "node:test";
import pg from "pg";
import {
  A2_PILOT_ID, A2PilotLedger, initialA2PilotState, startPilotCase,
  reservePilotRequest, settlePilotRequest, markPilotServerComplete,
  completePilotCase, executeA2PilotProviderOperation, stopPilot
} from "../src/lib/a2PilotSafety.ts";

const endpoint = process.env.A2_PG_INTEGRATION_DATABASE_URL;
if (!endpoint) throw Error("Refusing real-DB integration without A2_PG_INTEGRATION_DATABASE_URL");
const target = new URL(endpoint);
if (target.hostname !== "127.0.0.1" || target.pathname !== "/a2_pilot_ci" ||
    target.username !== "a2_ci" || target.port !== "5432") {
  throw Error("Refusing to run integration against any non-local, non-disposable PostgreSQL database");
}
if (process.env.GEMINI_API_KEY || process.env.YSS_A2_PILOT_DATABASE_URL) {
  throw Error("Refusing real-DB test in a session with production model/pilot credentials");
}
const admin = new pg.Pool({ connectionString: endpoint, max: 3 });
const makePool = () => new pg.Pool({ connectionString: endpoint, max: 2 });
const persisted = async () => {
  const result = await admin.query("SELECT state FROM yss_a2_pilot_ledger WHERE id=$1", [A2_PILOT_ID]);
  assert.equal(result.rowCount, 1, "one persistent pilot ledger row");
  return result.rows[0].state;
};
async function createInitialCase(pool) {
  const ledger = new A2PilotLedger(pool);
  await ledger.transact(s => startPilotCase(s, "BOSTON_CLEAN"));
  return ledger;
}
const context = () => ({ caseId: "BOSTON_CLEAN", stopped: false });

before(async () => {
  await admin.query("DROP TABLE IF EXISTS yss_a2_pilot_ledger");
  await new A2PilotLedger(admin).transact(state => state);
});
beforeEach(async () => {
  await admin.query("DELETE FROM yss_a2_pilot_ledger WHERE id=$1", [A2_PILOT_ID]);
});
after(async () => {
  // Ephemeral PostgreSQL service is discarded with CI runner. Explicit cleanup too.
  try { await admin.query("DROP TABLE IF EXISTS yss_a2_pilot_ledger"); } finally { await admin.end(); }
});

test("PostgreSQL creates exactly one durable JSONB record with initial limits", async () => {
  const pool = makePool();
  try {
    const ledger = new A2PilotLedger(pool);
    const state = await ledger.transact(s => s);
    assert.deepEqual(state, initialA2PilotState());
    assert.deepEqual(await persisted(), initialA2PilotState());
    const info = await admin.query("SELECT data_type FROM information_schema.columns WHERE table_name = 'yss_a2_pilot_ledger' AND column_name = 'state'");
    assert.equal(info.rows[0].data_type, "jsonb");
  } finally { await pool.end(); }
});

test("simultaneous first-song admissions from independent pools authorize exactly one", async () => {
  const a = makePool(), b = makePool();
  try {
    const [first, second] = await Promise.allSettled([
      new A2PilotLedger(a).transact(s => startPilotCase(s, "BOSTON_CLEAN")),
      new A2PilotLedger(b).transact(s => startPilotCase(s, "BOSTON_CLEAN")),
    ]);
    assert.equal([first, second].filter(r => r.status === "fulfilled").length, 1);
    assert.equal([first, second].filter(r => r.status === "rejected").length, 1);
    const saved = await persisted();
    assert.equal(saved.activeCase, "BOSTON_CLEAN");
    assert.equal(saved.completedCases, 0);
    assert.equal(saved.requests, 0);
  } finally { await a.end(); await b.end(); }
});

test("PostgreSQL FOR UPDATE serializes concurrent paid-operation admissions; losing one sends zero calls", async () => {
  const a = makePool(), b = makePool();
  try {
    const la = await createInitialCase(a), lb = new A2PilotLedger(b);
    let allowTransport;
    let signalEntered;
    const holdTransport = new Promise(resolve => { allowTransport = resolve; });
    const entered = new Promise(resolve => { signalEntered = resolve; });
    let firstCalls = 0, competingCalls = 0;
    const admitted = executeA2PilotProviderOperation(context(), la, async () => {
      firstCalls++;
      signalEntered();
      await holdTransport;
      return { usageMetadata: { promptTokenCount:100, candidatesTokenCount:50, totalTokenCount:150 } };
    });
    await entered; // provider transport starts ONLY AFTER durable reservation commits
    const mid = await persisted();
    assert.equal(mid.requests, 1);
    assert.equal(mid.spentCents, 175);
    assert.equal(mid.inFlight, true);
    const competitor = executeA2PilotProviderOperation(context(), lb, async () => {
      competingCalls++;
      return { usageMetadata:{promptTokenCount:1,candidatesTokenCount:1,totalTokenCount:2} };
    });
    await assert.rejects(competitor, /in flight/);
    assert.equal(competingCalls, 0);
    assert.equal(firstCalls, 1);
    allowTransport();
    await admitted;
    const after = await persisted();
    assert.equal(after.requests, 1);
    assert.equal(after.callsThisCase, 1);
    assert.equal(after.inFlight, false);
    assert.equal(after.spentCents, 1);
  } finally { await a.end(); await b.end(); }
});

test("committed pre-provider reservation survives pool restart and cannot be refunded or repeated", async () => {
  const firstPool = makePool();
  try {
    const ledger = await createInitialCase(firstPool);
    await ledger.transact(s => reservePilotRequest(s, "BOSTON_CLEAN"));
    assert.equal((await persisted()).inFlight, true);
  } finally { await firstPool.end(); }
  const restartedPool = makePool();
  try {
    const ledger = new A2PilotLedger(restartedPool);
    await assert.rejects(ledger.transact(s => reservePilotRequest(s, "BOSTON_CLEAN")), /in flight/);
    const saved = await persisted();
    assert.equal(saved.requests, 1);
    assert.equal(saved.spentCents, 175);
    assert.equal(saved.inFlight, true);
    assert.equal(saved.stopped, false);
  } finally { await restartedPool.end(); }
});

test("five settled operations require server completion AND browser acknowledgment across independent pools", async () => {
  const first = makePool();
  try {
    const ledger = await createInitialCase(first);
    for (let i=0; i<5; i++) {
      await ledger.transact(s => reservePilotRequest(s, "BOSTON_CLEAN"));
      await ledger.transact(s => settlePilotRequest(s, 1));
    }
    await ledger.transact(s => markPilotServerComplete(s, "BOSTON_CLEAN"));
  } finally { await first.end(); }
  const second = makePool();
  try {
    const ledger = new A2PilotLedger(second);
    const saved = await persisted();
    assert.equal(saved.awaitingClientAck, true);
    assert.equal(saved.requests, 5);
    await assert.rejects(ledger.transact(s => startPilotCase(s, "T01_B")), /unfinished/);
    await assert.rejects(ledger.transact(s => reservePilotRequest(s, "BOSTON_CLEAN")), /awaiting verified browser/);
    const acknowledged = await ledger.transact(s => completePilotCase(s, "BOSTON_CLEAN"));
    assert.equal(acknowledged.completedCases, 1);
    const next = await ledger.transact(s => startPilotCase(s, "T01_B"));
    assert.equal(next.activeCase, "T01_B");
    assert.equal(next.requests, 5);
  } finally { await second.end(); }
});

test("failed transport permanently stops ledger with one retained paid-attempt reservation", async () => {
  const a = makePool();
  try {
    const ledger = await createInitialCase(a);
    let attempts = 0;
    await assert.rejects(executeA2PilotProviderOperation(context(), ledger, async () => {
      attempts++; throw Error("synthetic provider timeout");
    }), /synthetic provider timeout/);
    assert.equal(attempts, 1);
  } finally { await a.end(); }
  const b = makePool();
  try {
    const ledger = new A2PilotLedger(b);
    const saved = await persisted();
    assert.equal(saved.stopped, true);
    assert.equal(saved.requests, 1);
    assert.equal(saved.spentCents, 175);
    assert.equal(saved.inFlight, true);
    await assert.rejects(ledger.transact(s => reservePilotRequest(s, "BOSTON_CLEAN")), /manual review required/);
    await assert.rejects(ledger.transact(s => startPilotCase(s, "T01_B")), /manual review required/);
  } finally { await b.end(); }
});

test("database transaction rollback preserves state and prevents dispatch after admission failure", async () => {
  const a = makePool();
  try {
    const ledger = await createInitialCase(a);
    const beforeState = await persisted();
    let attemptedTransport = 0;
    await assert.rejects(ledger.transact(s => {
      const wouldReserve = reservePilotRequest(s, "BOSTON_CLEAN");
      assert.equal(wouldReserve.requests, 1);
      throw Error("synthetic failure before COMMIT");
    }), /synthetic failure before COMMIT/);
    assert.deepEqual(await persisted(), beforeState);
    const brokenPool = makePool();
    await brokenPool.end();
    await assert.rejects(executeA2PilotProviderOperation(context(),
      new A2PilotLedger(brokenPool), async () => {attemptedTransport++; return {}; }));
    assert.equal(attemptedTransport, 0);
    assert.deepEqual(await persisted(), beforeState);
  } finally { await a.end(); }
});

test("PostgreSQL enforces atomic budget refusal before provider dispatch, retaining stopped state", async () => {
  const a = makePool();
  try {
    const ledger = await createInitialCase(a);
    await ledger.transact(s => ({...s, spentCents: 326}));
    let dispatches = 0;
    await assert.rejects(executeA2PilotProviderOperation(context(), ledger, async () => {
      dispatches++; return {};
    }), /24-request or \$5/);
    assert.equal(dispatches, 0);
    const state = await persisted();
    assert.equal(state.stopped, true);
    assert.equal(state.spentCents, 326);
    assert.equal(state.requests, 0);
  } finally { await a.end(); }
});

test("separate connection observes committed stop; fails closed under further concurrent admissions", async () => {
  const a = makePool(), b = makePool(), c = makePool();
  try {
    const initial = await createInitialCase(a);
    await initial.transact(s => stopPilot(s, "synthetic forced stop"));
    const replies = await Promise.allSettled([
      new A2PilotLedger(b).transact(s=>reservePilotRequest(s,"BOSTON_CLEAN")),
      new A2PilotLedger(c).transact(s=>startPilotCase(s,"T01_B")),
    ]);
    assert.equal(replies.filter(r => r.status==="rejected").length,2);
    assert.equal((await persisted()).stopped,true);
    assert.equal((await persisted()).requests,0);
  } finally { await a.end(); await b.end(); await c.end(); }
});
