# A2 four-recording pilot: safety gate (DRAFT, OFF by default)

**Do not start paid A2 analyses based on this draft alone.** Separately review and
authorize merging, deploying, configuring credentials/storage, and paid generation.

Scope: only the opt-in, single-upload **A2 pilot** mode, in this exact order:
1. BOSTON_CLEAN — metadata-stripped clean *More Than a Feeling* MP3
2. T01_B — exactly T01_B.mp3, muddy/dark Boston negative control
3. DRAKE_CLEAN — metadata-stripped clean *God's Plan* MP3
4. T02_B — exactly T02_B.mp3, muddy/dark Drake negative control

This feature **does not change** YSS normal scoring, model, DSP, prompts,
applicability, or report formulas. A2 captures from PR #33 remain unchanged.

## Configuration (NOT done by this PR)

- `YSS_A2_PILOT_ENABLED=true` (off when unset)
- `YSS_A2_PILOT_DATABASE_URL` — persistent PostgreSQL database; **not** a
  temporary Render container filesystem. This pilot will not run without it.
- `YSS_A2_PILOT_TOKEN` — private 32+ character random secret. Enter it in the
  A2 pilot password field. It is transmitted only in the pilot request header;
  not persisted in the browser Locker or included in public reports.
- Existing production `GEMINI_API_KEY` remains the model credential; no new
  model or API key is introduced.
- The normal YSS SDK stays `@google/genai` at its existing dependency
  declaration. The pilot alone uses the separately installed exact alias
  `@google/genai-a2-pilot = npm:@google/genai@2.30.0`. The old checked-in
  lockfile previously pinned the normal SDK to 2.6.0, which predates the
  explicit retry and continuation controls. The full lockfile has now been
  regenerated with npm (including previously missing production dependencies),
  and the branch verification workflow uses `npm ci` for reproducible installs.
  The pilot SDK is tested directly against a no-network injected fetch to prove
  one HTTP attempt for 429/5xx, connection errors and CONTINUATION results.

Do not copy the database URL or pilot token to public code, logs, docs or XLSX.
PostgreSQL must allow atomic row locks and persistent transactions. Schema is
created on first authorized pilot request.

## Hardening

- Maximum **24 provider-generation attempts total** and **six per recording**,
  shared across all four pilot cases and all instances. Requests are reserved durably **before** the SDK
  call and are never automatically retried. The SDK client sets
  `retryOptions.attempts=1` and the pilot sets
  `automaticContinuation=false`.
- Maximum **$5 conservative estimated liability**, represented as 500 cents.
  Each admission reserves **175 cents**. No second operation is authorized
  while the first remains in flight. After a valid provider response, the
  reserve is settled using conservative recorded usage: treat **all** prompt
  tokens as audio at $1/M, output and thinking as $2.50/M, then multiply
  by 1.25 and round UP to whole cents. The 175-cent reservation bounds
  1,048,576 input + 65,536 output tokens under these assumptions.
- The application ledger is **not** a guaranteed externally enforced Google
  billing stop: pricing, charges, and response accounting are controlled by
  Google. Verify current model pricing and enforce a separate provider-level
  budget as defense in depth. Do not use this control for arbitrary songs,
  other models, higher token limits or other Gemini usage on the same project.
- Any network/provider error, malformed/missing token usage, out-of-range
  usage, instrumental-genre verification failure, schema/analysis failure, or
  broken persistent-storage transaction **stops** the pilot. Failed/in-flight reservations are NOT refunded. A server
  restart with an unfinished case remains blocked. No automatic repair/reset,
  resume, rerun or refund endpoint exists.
- Server requires valid private pilot token, valid case ID and exact sequence,
  MP3 upload, `threeX=false`, empty title/artist/genre metadata fields. A user
  must still check that clean audio corresponds to the correct reference
  master: filenames alone cannot cryptographically establish this. Browser
  preflight additionally requires auto-genre mode (no genre override).
- Normal user analysis uses the existing Gemini path and retry policy;
  controls apply ONLY to explicitly marked pilot submissions. Do not mistake
  regular uploads or the internal batch runner for a capped pilot.
- Four cases each need five standard provider operations, sometimes six if
  blind instrumental-genre verification fires. **The server does not unlock
  the next case after the last provider response.** Instead, a nonpaid,
  token-protected browser acknowledgment must confirm both A2 provenance
  stages are COMPLETED. A browser crash, failed DSP calculation or missing
  acknowledgment leaves the current case locked across restarts. 24 total
  requests and six per recording are ceilings, not targets; the pilot
  fails closed if it cannot complete within these limits.

## Evidence / operator workflow (AFTER separate authorizations)

Open production YSS > Upload > select exactly one MP3 > check
"Internal A2 four-song pilot" > select numbered case > enter private token
> clear Title/Artist/Genre > select auto genre > ensure 3X off >
**Start A&R Audit** only once. Confirm browser A2 acknowledgment succeeded.
If it fails, do not retry, start another file, or reset the ledger.
Export each workbook; inspect Source Diagnostics A2 Space/Density, Midrange
Spacing, original/raw evidence access, before/after caps, aggregate denominators
and parent scores. Record actual account billing separately.

No credentials were added and no provider/model calls were made when building
or simulating this DRAFT PR.

## Nonpaid verification

`npm run build`
`npm run lint` (compare existing TS2739 baseline)
`node --test tests/*.test.mjs`

The tests cover sequential order, duplicate cases, concurrent requests,
cross-ledger locking, request/spending reservations, persistence after a
simulated restart, fail-stop behavior, missing usage, six-per-song ceiling,
browser-acknowledgment barrier, and server/client integration. The mock HTTP
transport exercises the **real installed pilot SDK** and production-used
`executeA2PilotProviderOperation` wrapper, verifying no retries or automatic
continuation, no dispatch after provider errors and no dispatch when an
allowance is exhausted. Tests never make network calls or contact Gemini.
The SQL tests use a fake persistent row, not a real PostgreSQL server; real
PostgreSQL integration remains subject to separate authorization.
