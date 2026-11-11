# YSS Gemini 3.8 shadow validation runner (DRAFT — REVIEW ONLY)

Standalone research script; never imports or starts production server.ts. Default
mode is a **zero-Google-request dry run** using deterministic fixtures. Production
prompts, schemas, scoring and reconciliation are extracted from pinned main
`9d32e31` by `git show`, **not from PR #29**. PR #30 must remain draft and
must not be merged or deployed without a separate decision.

## Purpose and exact scope

The **two-song model-compatibility smoke test** consists only of the frozen,
SHA-256-verified `06 - Si - copy(1).mp3` (Sia / Chandelier) and
`Braden 2024.mp3` (unmixed instrumental control). It is deliberately smaller
than the **separate four-recording Stage B2 rubric-comparison proposal** that
also named God's Plan and Seven Sisters. It does not replace or change that
proposal; those two other songs are intentionally not part of this experiment.

Each song normally requires five primary requests: critique, submetric Call 1,
chord/key, submetric Call 2 and submetric Call 3. Production's optional
instrumental-genre verification may add one per song. Eleven total requests
are permitted — **never twelve**. Before starting Braden, the runner
reserves **six remaining request slots** and $3 of estimated spend headroom.
If Chandelier unexpectedly uses six calls, Braden is not started; the run
stops with a documented partial-result status instead of beginning a song it
cannot finish. No retries or fallback model.

## Model configuration and confounds

The runner sends `gemini-3.8-flash` with **MEDIUM** thinking, JSON structured
responses, no tools/grounding, and maximum output tokens 32,768.
It accepts source requests originally written for `gemini-2.5-flash`.
The shadow deliberately **omits production temperature and seed parameters**,
leaving sampling at the provider default. Production submetric requests use
temperature 0; chord/key uses 0.1. Thus the pilot changes **model, thinking,
sampling and available evidence** — not model alone. The results record this
delta, including absent browser-computed DSP, visuals and verified-key context.

Compatibility smoke testing is *not* production score parity, independent
accuracy validation, broad music-quality benchmarking or repeatability proof.

## Spending, failures and run ledger

Estimated 2026 introductory rates, to be rechecked before paid execution:
**$0.75 per million input tokens; $3.75 per million output/thinking tokens**.
These constants drive a self-imposed **$5 estimated-cost stop** with $0.50
reservation before each possible request. A provider may charge more than the
estimate; the local gate is **NOT a provider-enforced or guaranteed billing cap**.
Every attempted provider call, including failures, counts toward eleven. Token
usage, thinking tokens, latency, per-call estimated cost and failure status
are recorded. Invalid/missing schema or usage, unexpected cost, provider error
or quota error stops the entire experiment with no retries.

In paid mode, `--out` is mandatory, must be **absolute** and must reside
on a persistent filesystem **outside the OS temporary directory and outside
the git checkout**. The operator must ensure the location survives restart
and is backed up; the software cannot guarantee physical storage durability.
`ledger.jsonl` is created exclusively using atomic `wx`, preventing replay
or simultaneous paid launches against the same output path. Never delete or
rename a paid-run ledger merely to retry: a partially consumed budget needs
separate review. Per-song JSON, summary with stop reason (even for mid-run
failure), and ledger remain local with restrictive permissions. Do not commit
result files, audio or API keys to GitHub.

## Offline verification (NO Google API requests)

Use a Node.js 22 checkout of the draft branch containing the pinned
`9d32e31` git objects; run `npm ci`.

```bash
node --test tests/yss-shadow38.test.mjs
node scripts/yss-shadow38.mjs --chandelier "/path/to/06 - Si - copy(1).mp3" --braden "/path/to/Braden 2024.mp3" --out "./shadow38-dry"
```

Verify `summary.json` says `DRY_RUN_NO_API_CALLS`, `COMPLETED`,
11 requests and that both `chandelier.json` and `braden.json` exist.
The integration test also generates these artifacts with **synthetic audio
bytes** and temporary test-only SHA-256 substitutions; it is not a real
audio-analysis or paid provider test.

## Paid mode — NOT APPROVED

A paid run additionally requires **a new explicit user approval**, the
real exact-hash audio files, an accessible `GEMINI_API_KEY` environment
variable and a deliberately selected persistent output directory.

After approval and final preflight, the operator would add
`--execute --confirm RUN_YSS_SHADOW38_PAID` and use a persistent
absolute `--out` path (example: `"$HOME/yss-shadow38-paid-20261020"`,
assuming the home filesystem is persistent). Do not execute this command
on the basis of the README alone. No deployment, merge, scoring, DSP,
applicability, prompt, report-export, production model or PR #29 changes
are authorized by this runner.

## Known limitations

No paid calls were made while creating or testing the runner. The tests cannot
establish live model access, the exact returned schema, true latency, provider
spend, repeatability or improved metric scoring. A separately authorized
shadow run and broader later validation would be necessary before proposing
any production model replacement.
