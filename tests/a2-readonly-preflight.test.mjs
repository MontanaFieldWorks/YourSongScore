import assert from "node:assert/strict";
import { test } from "node:test";
import { a2PilotReadOnlyPreflight } from "../src/lib/a2PilotReadOnlyPreflight.ts";
import { A2_PILOT_ID, initialA2PilotState } from "../src/lib/a2PilotSafety.ts";

const env = {
  YSS_A2_PILOT_ENABLED: "false",
  YSS_A2_PILOT_DATABASE_URL: "postgres://fake-neon-only",
  YSS_A2_PILOT_TOKEN: "T".repeat(40),
};
const open = (rows = [{ state: initialA2PilotState() }], fail = false) => {
  let queried = 0, closed = 0;
  return {
    get queried() {return queried;},
    get closed() {return closed;},
    factory: (url) => {
      assert.equal(url, env.YSS_A2_PILOT_DATABASE_URL);
      return {
        async query(sql, params) {
          queried++;
          assert.equal(sql, "SELECT state FROM yss_a2_pilot_ledger WHERE id=$1");
          assert.deepEqual(params, [A2_PILOT_ID]);
          assert.doesNotMatch(sql, /INSERT|UPDATE|DELETE|FOR UPDATE|CREATE|BEGIN|COMMIT/i);
          if (fail) throw new Error("synthetic Neon timeout containing fake secret");
          return { rows };
        },
        async end() {closed++;},
      };
    },
  };
};

test("disabled pilot performs exactly one read-only query, then closes pool", async () => {
  const x=open();
  assert.equal(await a2PilotReadOnlyPreflight(env, x.factory), "PASS");
  assert.equal(x.queried, 1);
  assert.equal(x.closed, 1);
});

test("enabled pilot performs NO diagnostic connection", async () => {
  const x=open();
  assert.equal(await a2PilotReadOnlyPreflight({...env, YSS_A2_PILOT_ENABLED:"true"}, x.factory), "SKIPPED");
  assert.equal(x.queried,0);
  assert.equal(x.closed,0);
});
test("unset pilot flag performs NO diagnostic connection", async () => {
  const x=open();
  assert.equal(await a2PilotReadOnlyPreflight({...env, YSS_A2_PILOT_ENABLED:undefined}, x.factory), "SKIPPED");
  assert.equal(x.queried,0);
});
test("missing config fails before any connection", async () => {
  const x=open();
  assert.equal(await a2PilotReadOnlyPreflight({...env, YSS_A2_PILOT_TOKEN:"short"}, x.factory), "FAIL_CONFIGURATION");
  assert.equal(x.queried,0);
});
test("missing persistent ledger fails closed and closes pool", async () => {
  const x=open([]);
  assert.equal(await a2PilotReadOnlyPreflight(env,x.factory), "FAIL_LEDGER");
  assert.equal(x.queried,1); assert.equal(x.closed,1);
});
test("non-pristine committed reservation fails verification, does not reset it", async () => {
  const changed = {...initialA2PilotState(), requests:1, spentCents:175, inFlight:true};
  const x=open([{state:changed}]);
  assert.equal(await a2PilotReadOnlyPreflight(env,x.factory), "FAIL_LEDGER");
  assert.deepEqual(changed,{...initialA2PilotState(),requests:1,spentCents:175,inFlight:true});
  assert.equal(x.closed,1);
});
test("synthetic DB connectivity failure returns safe status without leaking exception", async () => {
  const x=open(undefined,true);
  assert.equal(await a2PilotReadOnlyPreflight(env,x.factory), "FAIL_DATABASE");
  assert.equal(x.queried,1);assert.equal(x.closed,1);
});
