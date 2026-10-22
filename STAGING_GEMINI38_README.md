# YSS Gemini 3.8 — isolated staging

**Research only. Do NOT merge this branch, PR #31, or its guard into production.**

## Deployment

Create a **separate** Render Node web service targeting branch `research/yss-gemini38-staging-20261022`; auto-deploy **off**, free instance if available. Build command: `npm install --no-audit --no-fund && npm run build`. Start command: `npm run start`.

Create a **separate Render Postgres** instance to retain the attempt ledger through web-service restarts. A free Render Postgres instance expires after 30 days and supports no backups; a dedicated instance is suitable only for this short test. Do **not** use production YSS's database. Configure its internal connection URL as `YSS_STAGING_DATABASE_URL` in the staging web service. The production service is unchanged.

Configure staging-service environment variables privately in the Render dashboard:

- `YSS_GEMINI_MODEL` = `gemini-3.8-flash`
- `YSS_STAGING_ACCESS_PASSWORD` = a new randomly generated password of at least 16 characters. Browser HTTP Basic user is `yss`.
- `YSS_STAGING_DATABASE_URL` = the dedicated staging Postgres internal connection URL.
- `GEMINI_API_KEY` = the existing YSS Gemini API key, entered directly into Render, not ChatGPT.

**Do not configure the API key until the staging build and access controls have been verified.** No key is committed to Git.

## One-song validation

1. Visit the staging URL over HTTPS; use Basic Auth username `yss` and the configured staging password.
2. Visit `/api/staging-status`: check `ready:true` and `state:READY` before uploading. Otherwise stop without uploading.
3. Return to the staging YSS home page. Upload **the original SHA-256-pinned Chandelier MP3**, not a re-encoded copy. The server validates SHA-256 before any AI call.
4. Run exactly one normal analysis. Keep the browser open. No retries.
5. Download the generated YSS Excel report. Also open `/api/staging-status` to see request count and conservative cost estimate.
6. If failed or interrupted, **do not retry**. Database status remains STOPPED or RUNNING to prevent further attempts; obtain diagnostics from Render without sharing secrets.

## Safety

- Original prior Gemini attempt = 1; original unknown charge = conservatively reserved $1.25.
- New attempts <= 6 (lifetime attempts <= 11), new estimate <= $3.75 (combined <= $5). These are **self-imposed estimates**, not guaranteed Google billing limits.
- Attempt records are committed in the dedicated Postgres DB **before** each `generateContent`. Aborted and interrupted runs cannot reset counters.
- Only POST `/api/critique-file` is allowed while staging; other POST endpoints are blocked.
- Only the exact SHA-pinned Chandelier MP3 can begin an analysis; no Braden.
- Model is `gemini-3.8-flash` using Medium thinking and 32768 max output tokens; retries are disabled for staging. Existing prompts, DSP, and scoring rules remain unchanged.
- If usage metadata lacks a valid `totalTokenCount`, fail closed without treating missing thinking tokens as free.
- The full YSS pipeline is preserved, but a new model can reject legacy structured schemas. If so, stop and inspect without making further paid requests.
- Runtime access password and API key are staged secrets. Not shared in reports, source, or chat.

Existing YSS production service, main, PR #29, and PR #30 are untouched.
