/**
 * Test-only child process for real PostgreSQL integration. It does not read
 * Gemini credentials, send HTTP requests or connect outside disposable localhost.
 */
import pg from "pg";
import {
  A2PilotLedger, startPilotCase, reservePilotRequest,
} from "../../src/lib/a2PilotSafety.ts";

const url = process.env.A2_PG_INTEGRATION_DATABASE_URL;
if (!url) throw Error("A2 disposable DB URL missing");
const parsed = new URL(url);
if (parsed.hostname !== "127.0.0.1" || parsed.pathname !== "/a2_pilot_ci" ||
    parsed.username !== "a2_ci" || parsed.port !== "5432")
  throw Error("Refusing non-ephemeral test database");
if (process.env.GEMINI_API_KEY || process.env.YSS_A2_PILOT_DATABASE_URL)
  throw Error("Unexpected production credentials");

const command = process.argv[2];
const pool = new pg.Pool({connectionString: url,max: 1});
try {
  const ledger = new A2PilotLedger(pool);
  let state;
  if (command === "start") {
    state = await ledger.transact(s => startPilotCase(s, "BOSTON_CLEAN"));
  } else if (command === "reserve") {
    state = await ledger.transact(s => reservePilotRequest(s, "BOSTON_CLEAN"));
  } else {
    throw Error("Unknown subprocess action");
  }
  console.log(JSON.stringify({ status: "SUCCESS", requests: state.requests,
    inFlight: state.inFlight, activeCase: state.activeCase }));
} catch (e) {
  console.error("EXPECTED_OR_UNEXPECTED_WORKER_FAILURE: " + String(e?.message || e));
  process.exitCode = 2;
} finally {
  await pool.end();
}
