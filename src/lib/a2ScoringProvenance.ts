/**
 * A2 diagnostic-only provenance for Space & Density and Midrange Spacing.
 * No score is calculated or assigned by the capture helpers: all changes to the
 * actual scores continue through the existing server and browser pathways.
 * Row generation is pure and only consumed by the internal Source Diagnostics tab.
 */
import { getMixBalanceEffectiveWeight, isMudDiagnosticCritique } from "./mudPreventionDiagnostic.ts";

const A2_KEYS = ["spaceAndDensity", "midrangeSpacing"] as const;
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const num = (v: unknown): number | "NOT_CAPTURED" => finite(v) ? v : "NOT_CAPTURED";
const txt = (v: unknown): string =>
  typeof v === "string" && v.trim() ? v : "NOT_CAPTURED";

export function captureA2BeforeClient(critique: any): void {
  const p = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!p) return;
  for (const key of A2_KEYS) {
    const entry = p[key];
    if (!entry || Object.hasOwn(entry, "preClientScore")) continue;
    const value = critique?.subMetricsCall1?.[key]?.score;
    entry.preClientScore = finite(value) ? value : null;
  }
}

export function captureA2AfterClient(
  critique: any,
  caps: { midrangeCap: number | null; spaceDensityCeiling: number | null },
): void {
  const p = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!p) return;
  for (const key of A2_KEYS) {
    const entry = p[key];
    if (!entry) continue;
    const current = critique?.subMetricsCall1?.[key]?.score;
    const after = finite(current) ? current : null;
    entry.postClientScore = after;
    const before = entry.preClientScore;
    const limit = key === "midrangeSpacing" ? caps.midrangeCap : caps.spaceDensityCeiling;
    const changed = finite(before) && finite(after) && after !== before;
    entry.clientCapReason = !changed
      ? "NONE"
      : finite(limit) && before > limit && after === limit
        ? (key === "midrangeSpacing"
            ? "MIDRANGE_FLATNESS_CAP"
            : "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING")
        : "OTHER_CLIENT_CHANGE_NOT_ATTRIBUTED_TO_A2_CAP";
    entry.clientCapLimit = changed && finite(limit) ? limit : null;
  }
}

export type A2DiagnosticRow = { section: string; field: string; value: string | number };

export function getA2ScoringProvenanceRows(critique: any): A2DiagnosticRow[] {
  const call1 = critique?.subMetricsCall1;
  const p = call1?.a2ScoringProvenance;
  const live = critique?.liveMetrics;
  const finish = critique?.productionFinishEvidence;
  const mix = critique?.mixBalanceEvidence;
  const rows: A2DiagnosticRow[] = [];
  const add = (section: string, field: string, value: string | number) =>
    rows.push({ section, field, value });

  for (const key of A2_KEYS) {
    const section = key === "spaceAndDensity" ? "A2 Space & Density" : "A2 Midrange Spacing";
    const entry = p?.[key];
    const current = call1?.[key];
    const hasLedger = !!entry;
    const finalScore = finite(current?.score) ? current.score : null;
    const before = entry?.preClientScore;
    const after = entry?.postClientScore;
    const effectiveWeight = key === "spaceAndDensity"
      ? 35
      : isMudDiagnosticCritique(critique)
        ? getMixBalanceEffectiveWeight(call1, "midrangeSpacing")
        : null;
    const contribution = finite(after) && finite(effectiveWeight) && current?.applicable !== false
      ? Math.round((after * effectiveWeight / 100) * 1000) / 1000
      : null;

    add(section, "A2 capture", hasLedger ? "PRESENT" : "NOT_CAPTURED (legacy report or Call 1 unavailable)");
    add(section, "Raw Gemini Call 1 qualityTier (UNVERIFIED)", txt(entry?.rawQualityTier));
    add(section, "Original Gemini Call 1 commentary (UNVERIFIED)", txt(entry?.rawCommentary));
    add(section, "Server canonical tier-mapped score (before server ceiling)", num(entry?.canonicalMappedScore));
    add(section, "Server-side production-finish cap", finite(entry?.serverCap) ? entry.serverCap : entry?.serverCap === null ? "NONE" : "NOT_CAPTURED");
    add(section, "Server-side cap reason", txt(entry?.serverCapReason));
    add(section, "Pre-client score (after server reconciliation)", num(before));
    add(section, "Post-client score (after all client guardrails)", num(after));
    add(section, "Reported current child score", num(finalScore));
    add(section, "Client score-change/cap reason", txt(entry?.clientCapReason));
    add(section, "Client cap limit (if applied)", num(entry?.clientCapLimit));
    add(section, "Applicable in parent", current?.applicable === false ? "false" : current ? "true" : "NOT_CAPTURED");
    add(section, "Effective parent weight (percent)", num(effectiveWeight));
    add(section, "Weighted point contribution BEFORE parent ceiling/penalties", num(contribution));
    add(section, "Final parent total (may include other children/caps/penalties)",
      num(key === "spaceAndDensity" ? critique?.scores?.overallProduction : critique?.mixQuality?.score));
    add(section, "Contribution interpretation",
      "Contribution is post-client child score × effective child weight; it is NOT the child's marginal impact after parent ceilings, penalties, or rounding.");

    if (key === "spaceAndDensity") {
      add(section, "DSP relative finish mid-band energy (%)", num(live?.calculatedFinishMidPct));
      add(section, "DSP relative finish sub-band energy (%)", num(live?.calculatedFinishSubPct));
      add(section, "DSP relative finish air-band energy (%)", num(live?.calculatedFinishAirPct));
      add(section, "DSP crest factor (dB)", num(live?.calculatedCrestFactorDb));
      add(section, "Production-finish evidence summary", txt(finish?.summary));
      add(section, "Production-finish ceiling",
        finite(finish?.ceiling) ? finish.ceiling : finish?.ceiling === null ? "NONE" : "NOT_CAPTURED");
    } else {
      add(section, "DSP midrange spectral flatness", num(live?.calculatedMidrangeFlatness));
      add(section, "DSP midrange spectral flux", num(live?.calculatedMidrangeFlux));
      add(section, "DSP low-mid band energy (normalized 0–100)", num(live?.calculatedLowMidsBandEnergy));
      add(section, "DSP core-mid band energy (normalized 0–100)", num(live?.calculatedCoreMidsBandEnergy));
      add(section, "Client midrange evidence summary", txt(mix?.summary));
      add(section, "Midrange cap selected by client", num(mix?.midrangeCap));
    }
  }
  return rows;
}
