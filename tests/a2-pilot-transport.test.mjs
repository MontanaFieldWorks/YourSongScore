import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai-a2-pilot";
import {
  A2PilotLedger, initialA2PilotState, startPilotCase,
  executeA2PilotProviderOperation, a2PilotGenerateContentOptions,
} from "../src/lib/a2PilotSafety.ts";

// Fake PostgreSQL transaction / row lock. No database, API key, network,
// paid operation, environment mutation, or authentication connector.
function fakePostgres() {
  const store = { state: initialA2PilotState() };
  let lock = Promise.resolve();
  const db = {
    async query() { return { rows: [] }; },
    async connect() {
      const previous = lock;
      let unlock;
      lock = new Promise(resolve => { unlock = resolve; });
      await previous;
      let temp = structuredClone(store.state);
      return {
        async query(sql, params) {
          if (sql === "BEGIN" || sql === "ROLLBACK") return { rows: [] };
          if (sql.includes("SELECT state")) return { rows: [{ state: structuredClone(temp) }] };
          if (sql.includes("UPDATE yss_a2_pilot_ledger")) {
            temp = JSON.parse(params[1]); return { rows: [] };
          }
          if (sql === "COMMIT") { store.state = temp; return { rows: [] }; }
          throw Error("Unrecognized mocked PostgreSQL query");
        },
        release() { unlock(); },
      };
    },
    snapshot() { return structuredClone(store.state); },
  };
  return db;
}

const responseBody = (finishReason = "STOP", usage = true) => ({
  candidates: [{
    content: { role: "model", parts: [{ text: '{"confirmed":true}' }] },
    finishReason,
    ...(finishReason === "CONTINUATION" ? { continuationToken: "ZmFrZS1jb250aW51YXRpb24=" } : {}),
  }],
  ...(usage ? { usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10,
    totalTokenCount: 110 } } : {}),
});

const input = () => a2PilotGenerateContentOptions({
  model: "gemini-2.5-flash", contents: [{ role:"user", parts:[{text:"no-network mocked analysis"}]}],
  config: { temperature: 0.1 },
});

async function fixture(onFetch) {
  const db = fakePostgres(), ledger = new A2PilotLedger(db);
  await ledger.transact(state => startPilotCase(state, "BOSTON_CLEAN"));
  const context = { caseId: "BOSTON_CLEAN", stopped: false };
  let requests = 0;
  const fetch = async (url, init) => {
    requests++;
    assert.match(String(url), /generateContent/);
    assert.equal(init.method, "POST");
    return onFetch(url, init);
  };
  const client = new GoogleGenAI({
    apiKey: "nonpaid-unit-test-placeholder",
    httpOptions: { fetch, retryOptions: { attempts: 1 } },
  });
  const invoke = () => executeA2PilotProviderOperation(
    context, ledger, () => client.models.generateContent(input()));
  return { db, ledger, context, invoke, requests: () => requests };
}

test("injected SDK transport proves no retry for 429, 500, 502, 503, 504", async () => {
  // If SDK silently retries, every variant produces a request count >1.
  for (const status of [429, 500, 502, 503, 504]) {
    const x = await fixture(() => Response.json(
      {error:{code:status,message:"simulated transport failure"}},
      {status, headers:{"content-type":"application/json"}}
    ));
    await assert.rejects(x.invoke(), /simulated transport failure|status|error|429|500|502|503|504/i);
    assert.equal(x.requests(), 1, "SDK must not automatically retry HTTP "+status);
    assert.equal(x.db.snapshot().requests, 1);
    assert.equal(x.db.snapshot().spentCents, 175);
    assert.equal(x.db.snapshot().stopped, true);
    await assert.rejects(x.invoke(), /stop|stopped/i);
    assert.equal(x.requests(), 1, "stopped pilot must never reach transport again");
  }
});

test("single network rejection does not retry and conservatively retains reserved liability", async () => {
  const x = await fixture(() => {throw new Error("SIMULATED_CONNECTION_RESET");});
  await assert.rejects(x.invoke(), /SIMULATED_CONNECTION_RESET/);
  assert.equal(x.requests(), 1);
  assert.equal(x.db.snapshot().requests, 1);
  assert.equal(x.db.snapshot().stopped, true);
  assert.equal(x.db.snapshot().spentCents, 175);
});

test("CONTINUATION finish reason does not generate an implicit second request", async () => {
  const x = await fixture(() => Response.json(responseBody("CONTINUATION")));
  const answer = await x.invoke();
  assert.equal(x.requests(), 1, "SDK automatic continuation must be disabled");
  assert.equal(answer.candidates?.[0]?.finishReason, "CONTINUATION");
  assert.equal(x.db.snapshot().requests, 1);
  assert.equal(x.db.snapshot().inFlight, false);
  assert.equal(x.db.snapshot().spentCents > 0, true);
  assert.equal(x.db.snapshot().stopped, false);
});

test("missing provider usage halts after one transport request, with no second dispatch", async () => {
  const x = await fixture(() => Response.json(responseBody("STOP", false)));
  await assert.rejects(x.invoke(), /usage metadata/);
  assert.equal(x.requests(), 1);
  assert.equal(x.db.snapshot().requests, 1);
  assert.equal(x.db.snapshot().stopped, true);
  await assert.rejects(x.invoke());
  assert.equal(x.requests(), 1);
});

test("preflight rejected ceiling dispatches zero HTTP requests", async () => {
  const x = await fixture(() => Response.json(responseBody()));
  await x.ledger.transact(s => ({ ...s, requests: 24 }));
  await assert.rejects(x.invoke(), /24-request/i);
  assert.equal(x.requests(), 0);
  assert.equal(x.db.snapshot().requests, 24);
  assert.equal(x.db.snapshot().stopped, true);
});

test("spending reservation rejects BEFORE calling SDK transport", async () => {
  const x = await fixture(() => Response.json(responseBody()));
  await x.ledger.transact(s => ({ ...s, spentCents: 326 }));
  await assert.rejects(x.invoke(), /ceiling reached/i);
  assert.equal(x.requests(), 0);
  assert.equal(x.db.snapshot().spentCents, 326);
});

test("same configured options, client and gate are used by production server", () => {
  const src = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  assert.match(src, /executeA2PilotProviderOperation\(pilot, configuredA2PilotLedger\(\)/);
  assert.match(src, /a2PilotAi\.models\.generateContent\(a2PilotGenerateContentOptions\(params\)\)/);
  assert.match(src, /new A2PilotGoogleGenAI\(/);
  const opts = input();
  assert.equal(opts.model, "gemini-2.5-flash");
  assert.equal(opts.config.automaticContinuation, false);
  assert.equal(opts.config.httpOptions.retryOptions.attempts, 1);
  assert.throws(() => a2PilotGenerateContentOptions({model:"other-model"}), /model changed/);
});
