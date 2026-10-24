/**
 * A2 raw-evidence vault. Unmodified Gemini text must never be shipped to
 * ordinary critique responses or ordinary Excel workbooks.
 *
 * This deliberately short-lived, process-local store is only retrievable via
 * a token-protected internal route. It does NOT provide durable audit storage;
 * entries expire after 24h or on server restart. Secret is configured separately.
 */
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";

const MAX_RECORDS = 100;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const evidence = new Map<string, { capturedAt: number; data: any }>();

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

export function a2InternalAccessAllowed(authHeader: unknown, secret: unknown): boolean {
  if (typeof secret !== "string" || secret.length < 32) return false;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) return false;
  const supplied = authHeader.slice(7);
  if (!supplied || supplied.length > 1024) return false;
  return timingSafeEqual(digest(supplied), digest(secret));
}

export function withholdA2RawEvidence(critique: any, now = Date.now()): string | null {
  const provenance = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!provenance) return null;
  const raw: Record<string, any> = {};
  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const entry = provenance[key];
    if (!entry) continue;
    if (Object.hasOwn(entry, "rawCommentary") || Object.hasOwn(entry, "rawQualityTier")) {
      raw[key] = {
        qualityTier: entry.rawQualityTier ?? null,
        commentary: entry.rawCommentary ?? null,
      };
      delete entry.rawCommentary;
      delete entry.rawQualityTier;
      entry.rawEvidenceAccess = "RESTRICTED_INTERNAL_ONLY";
    }
  }
  if (!Object.keys(raw).length) return null;
  const id = randomUUID();
  for (const [key, value] of evidence) {
    if (value.capturedAt + RETENTION_MS < now) evidence.delete(key);
  }
  while (evidence.size >= MAX_RECORDS) evidence.delete(evidence.keys().next().value!);
  evidence.set(id, { capturedAt: now, data: structuredClone(raw) });
  provenance.internalEvidenceId = id;
  return id;
}

/** A missing or expired entry produces null without disclosing existence to callers. */
export function getRestrictedA2RawEvidence(
  id: string,
  authorizationHeader: unknown,
  configuredSecret: unknown,
  now = Date.now(),
): any | null {
  if (!a2InternalAccessAllowed(authorizationHeader, configuredSecret)) return null;
  const found = evidence.get(id);
  if (!found) return null;
  if (found.capturedAt + RETENTION_MS < now) {
    evidence.delete(id);
    return null;
  }
  return structuredClone(found.data);
}
