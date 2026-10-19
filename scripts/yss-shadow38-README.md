# YSS Gemini 3.8 shadow validation runner (REVIEW ONLY)

This is a standalone script and never imports or starts production server.ts.
Default mode is a **zero-network, zero-generation dry run** with deterministic fixtures.
Production prompts, response schemas, scoring functions and reconciliation logic
are extracted via git show from frozen main commit 9d32e31, not PR #29.

## Exact model configuration
Pin gemini-3.8-flash, MEDIUM thinking, structured JSON, no tools/grounding,
no automatic retry, no fallback model. Legacy 2.5 temperature and seed are
intentionally omitted; all other supported production request fields are retained.

## Controls
Only two SHA-256-verified MP3s: 06 - Si - copy(1).mp3 and Braden 2024.mp3.
Maximum 11 counted attempts including possible instrumental genre recheck.
$5 cost-estimate gate with $0.50 reserved per next request, using Google pricing
of $0.75/M input and $3.75/M output plus thinking. This is NOT a provider
billing limit; unexpected usage or missing usage metadata stops the runner.
No API key printed or written. Results and token ledger remain local.

IMPORTANT: Browser-computed DSP fields and visuals are absent in this isolated
test. It tests schema and audio pipeline compatibility, not full production
score parity. Readiness for a production model upgrade requires additional
controlled testing after this preliminary shadow smoke test.

## Dry run, no Google calls
Use a checkout containing the pinned commit and run npm ci.
node scripts/yss-shadow38.mjs --chandelier /path/06-Si.mp3 --braden /path/Braden.mp3 --out ./shadow38-dry
node --test tests/yss-shadow38.test.mjs

## Paid mode (NOT approved now)
Requires a separate user approval in the conversation and the existing
GEMINI_API_KEY exposed only via the local process environment.
Append --execute --confirm RUN_YSS_SHADOW38_PAID to the dry-run invocation.
Never run that command before new explicit approval. The script does not
change GitHub main, PR #29, Render, scoring thresholds, applicability or exports.

## Limitations
No paid calls were made during development. Live 3.8 structured JSON compatibility,
real response shape, token counts and latency are not verified until approved.
Two recordings and one run each cannot establish score accuracy or repeatability.