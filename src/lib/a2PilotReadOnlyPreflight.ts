/**
 * A2 deployment preflight only. A single read-only SQL statement verifies that
 * the *deployed Render process* can reach its dedicated Neon PostgreSQL ledger.
 * This is deliberately independent of the pilot's enabled-only admission path.
 * No model or audio calls, no HTTP endpoint, no SQL writes, no secret logging.
 */
import pg from "pg";
import { A2_PILOT_ID, initialA2PilotState } from "./a2PilotSafety";

type ReadOnlyPool = {
  query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }>;
  end: () => Promise<void>;
};
export type A2ReadOnlyPreflightStatus =
  "SKIPPED" | "PASS" | "FAIL_CONFIGURATION" | "FAIL_DATABASE" | "FAIL_LEDGER";

/**
 * Restricted to the explicitly disabled pilot. Failure never opens or resets
 * the persistent ledger, never marks a recording authorized, and never blocks
 * normal YSS analysis. All returned statuses are safe to write to app logs.
 */
export async function a2PilotReadOnlyPreflight(
  env: NodeJS.ProcessEnv = process.env,
  openPool: (url: string) => ReadOnlyPool = (url) => new pg.Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 6000,
    idleTimeoutMillis: 1000,
    statement_timeout: 4000,
  }),
): Promise<A2ReadOnlyPreflightStatus> {
  if (env.YSS_A2_PILOT_ENABLED !== "false") return "SKIPPED";
  if (!env.YSS_A2_PILOT_DATABASE_URL ||
      !env.YSS_A2_PILOT_TOKEN ||
      env.YSS_A2_PILOT_TOKEN.length < 32) return "FAIL_CONFIGURATION";

  let pool: ReadOnlyPool | undefined;
  try {
    pool = openPool(env.YSS_A2_PILOT_DATABASE_URL);
    const result = await pool.query(
      "SELECT state FROM yss_a2_pilot_ledger WHERE id=$1",
      [A2_PILOT_ID],
    );
    if (result.rows.length !== 1) return "FAIL_LEDGER";
    const state = (result.rows[0] as any)?.state;
    const pristine = initialA2PilotState();
    if (!state || typeof state !== "object" ||
        Object.entries(pristine).some(([key, value]) => state[key] !== value)) {
      return "FAIL_LEDGER";
    }
    return "PASS";
  } catch {
    return "FAIL_DATABASE";
  } finally {
    // Never retain a live connection; leave the real pilot's pool untouched.
    try { await pool?.end(); } catch { /* no exception or credentials in logs */ }
  }
}
