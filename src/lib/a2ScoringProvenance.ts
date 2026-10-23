/**
 * Read-only A2 scoring provenance. This module never assigns a scored metric,
 * parent score, applicability flag or scoring weight.
 * The raw model output is withheld server-side before public serialization.
 */
import { isMudDiagnosticCritique } from "./mudPreventionDiagnostic.ts";

export type A2DiagnosticRow = { section: string; field: string; value: string | number };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numberOrMissing = (v: unknown): number | "NOT_CAPTURED" =>
  finite(v) ? v : "NOT_CAPTURED";
const textOrMissing = (v: unknown): string =>
  typeof v === "string" && v.trim() ? v : "NOT_CAPTURED";
const roundTo = (value: number, places = 6) =>
  Math.round((value + Number.EPSILON) * 10 ** places) / 10 ** places;

const PRODUCTION: Array<[string, number]> = [
  ["aestheticDesign", 40],
  ["spaceAndDensity", 35],
  ["paletteCohesion", 25],
];
const MIX: Array<[string, number]> = [
  ["mudPrevention", 25],
  ["midrangeSpacing", 25],
  ["lowEndDivision", 20],
  ["sibilanceShaving", 15],
  ["stereoWidth", 15],
];

const freshEntry = (critique: any, key: string): any =>
  critique?.subMetricsCall1?.a2ScoringProvenance?.[key];

/** Mirror the server's Production Index weightedAvg: finite score, no N/A filter. */
export function captureA2ServerProductionInputs(critique: any): void {
  const entry = freshEntry(critique, "spaceAndDensity");
  if (!entry) return;
  const call1 = critique.subMetricsCall1;
  const scored = PRODUCTION.filter(([key]) => finite(call1?.[key]?.score));
  const denominator = scored.reduce((sum, [, weight]) => sum + weight, 0);
  const actual = call1?.spaceAndDensity?.score;
  entry.productionWeightUnits = finite(actual) ? 35 : null;
  entry.productionDenominator = denominator || null;
  entry.productionContribution = finite(actual) && denominator
    ? (actual * 35 / denominator) : null;
  entry.productionEffectiveWeight = finite(actual) && denominator
    ? (35 * 100 / denominator) : null;
  entry.productionWeightedMean = denominator
    ? scored.reduce((total, [key, weight]) => total + call1[key].score * weight, 0) / denominator
    : null;
}

/** Mirror the server Mix Balance scorer, including Mud exclusion and N/A gates. */
export function captureA2ServerMixInputs(critique: any): void {
  const entry = freshEntry(critique, "midrangeSpacing");
  if (!entry) return;
  const mix = exactMixContribution(critique);
  entry.serverMixDenominator = mix.denominator;
  entry.serverMixContribution = mix.contribution;
  entry.serverMixEffectiveWeight = mix.effectiveWeight;
}

/** Exact fraction used by computeMixBalanceScore (before rounded parent/caps). */
export function exactMixContribution(critique: any): {
  denominator: number | null;
  contribution: number | null;
  effectiveWeight: number | null;
} {
  const call1 = critique?.subMetricsCall1;
  if (!call1) return { denominator: null, contribution: null, effectiveWeight: null };
  const included = MIX.filter(([key]) =>
    (key !== "mudPrevention" || !isMudDiagnosticCritique(critique)) &&
    call1[key]?.applicable !== false && finite(call1[key]?.score));
  const denominator = included.reduce((total, [, w]) => total + w, 0);
  const includedMidrange = included.some(([key]) => key === "midrangeSpacing");
  if (!denominator || !includedMidrange) return {
    denominator: denominator || null, contribution: null, effectiveWeight: null,
  };
  return {
    denominator,
    contribution: call1.midrangeSpacing.score * 25 / denominator,
    effectiveWeight: 100 * 25 / denominator,
  };
}

export function captureA2BeforeClient(critique: any): void {
  const trace = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!trace) return;
  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const entry = trace[key];
    if (!entry || Object.hasOwn(entry, "preClientScore")) continue;
    const score = critique.subMetricsCall1?.[key]?.score;
    entry.preClientScore = finite(score) ? score : null;
  }
}

export function captureA2BrowserUnavailable(critique: any): void {
  captureA2BeforeClient(critique);
  const trace = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!trace) return;
  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const entry = trace[key];
    if (!entry) continue;
    entry.postClientScore = null;
    entry.clientCapReason = "BROWSER_DSP_UNAVAILABLE";
    entry.clientCapLimit = null;
    entry.clientCapCandidate = null;
  }
}

/** Records only the result of pre-existing client corrections. */
export function captureA2AfterClient(
  critique: any,
  caps: { midrangeCap: number | null; spaceDensityCeiling: number | null },
): void {
  const trace = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!trace) return;
  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const entry = trace[key];
    if (!entry) continue;
    const current = critique?.subMetricsCall1?.[key]?.score;
    const after = finite(current) ? current : null;
    const before = entry.preClientScore;
    const cap = key === "midrangeSpacing" ? caps.midrangeCap : caps.spaceDensityCeiling;
    const changed = finite(before) && finite(after) && after !== before;
    entry.postClientScore = after;
    entry.clientCapCandidate = finite(cap) ? cap : null;
    const attributed = changed && finite(cap) && before > cap && after === cap;
    entry.clientCapReason = !changed
      ? "NONE"
      : attributed
        ? key === "midrangeSpacing"
          ? "MIDRANGE_FLATNESS_CAP"
          : "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING"
        : "OTHER_CLIENT_CHANGE_NOT_ATTRIBUTED_TO_A2_CAP";
    entry.clientCapLimit = attributed ? cap : null;
  }
}

/** The worksheet may be downloaded publicly: NEVER render raw model commentary. */
export function getA2ScoringProvenanceRows(critique: any): A2DiagnosticRow[] {
  const call1 = critique?.subMetricsCall1;
  const raw = call1?.a2ScoringProvenance;
  const live = critique?.liveMetrics;
  const finish = critique?.productionFinishEvidence;
  const mixEvidence = critique?.mixBalanceEvidence;
  const rows: A2DiagnosticRow[] = [];
  const add = (section: string, field: string, value: number | string) =>
    rows.push({ section, field, value });

  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const label = key === "spaceAndDensity" ? "A2 Space & Density" : "A2 Midrange Spacing";
    const entry = raw?.[key];
    const item = call1?.[key];
    const isSpace = key === "spaceAndDensity";
    const pre = entry?.preClientScore;
    const post = entry?.postClientScore;
    const browserAvailable = entry?.clientCapReason !== "BROWSER_DSP_UNAVAILABLE";
    const denominator = isSpace ? entry?.productionDenominator : exactMixContribution(critique).denominator;
    const effectiveWeight = isSpace ? entry?.productionEffectiveWeight : exactMixContribution(critique).effectiveWeight;
    const trueContribution = isSpace ? entry?.productionContribution : exactMixContribution(critique).contribution;
    const serverMix = entry?.serverMixContribution;

    add(label, "A2 capture", entry ? "PRESENT" : "NOT_CAPTURED (legacy report or Call 1 unavailable)");
    add(label, "Raw Gemini qualityTier/commentary access", entry?.rawEvidenceAccess || (entry ? "NOT_CAPTURED" : "NOT_CAPTURED"));
    add(label, "Internal evidence reference (requires server token)", textOrMissing(raw?.internalEvidenceId));
    add(label, "Original raw Gemini commentary in ordinary export", "REDACTED — available only from token-protected server evidence vault");
    add(label, "Model-selected qualityTier (existing public metric)", textOrMissing(item?.qualityTier));
    add(label, "Canonical mapped score before server caps", numberOrMissing(entry?.canonicalMappedScore));
    add(label, "Server-side cap", isSpace
      ? finite(entry?.serverCap) ? entry.serverCap : entry && entry.serverCap === null ? "NONE" : "NOT_CAPTURED"
      : entry ? "NOT_APPLICABLE" : "NOT_CAPTURED");
    add(label, "Server-side cap reason", isSpace ? textOrMissing(entry?.serverCapReason) : entry ? "NOT_APPLICABLE" : "NOT_CAPTURED");
    add(label, "Pre-client score after server reconciliation", numberOrMissing(pre));
    add(label, "Post-client child score", numberOrMissing(post));
    add(label, "Browser scoring stage", entry ? browserAvailable ? "COMPLETED" : "BROWSER_DSP_UNAVAILABLE" : "NOT_CAPTURED");
    add(label, "Client cap reason", textOrMissing(entry?.clientCapReason));
    add(label, "Selected client cap (even when unapplied)", numberOrMissing(entry?.clientCapCandidate));
    add(label, "Applied client cap", finite(entry?.clientCapLimit)
      ? entry.clientCapLimit : entry?.clientCapReason === "NONE" ? "NONE"
      : entry?.clientCapReason === "BROWSER_DSP_UNAVAILABLE" ? "NOT_CAPTURED" : "NOT_CAPTURED");
    add(label, "Current score shown in report", numberOrMissing(item?.score));
    add(label, "Metric applicability", !item ? "NOT_CAPTURED" : item.applicable === false ? "false" : "true");

    add(label, "Actual aggregation denominator (weight units)", numberOrMissing(denominator));
    add(label, "Effective aggregate weight (%; computed from exact ratio)", finite(effectiveWeight)
      ? roundTo(effectiveWeight) : "NOT_CAPTURED");
    add(label, "Exact pre-round weighted contribution (points)", finite(trueContribution)
      ? roundTo(trueContribution) : "NOT_CAPTURED");
    if (isSpace) {
      add(label, "Contribution basis", "SERVER ORIGINAL AGGREGATION (not recomputed from post-client score)");
      add(label, "Server weighted mean before rounding", numberOrMissing(entry?.productionWeightedMean));
      add(label, "Server original parent score after ceiling", numberOrMissing(entry?.serverProductionParentScore));
      add(label, "Final Production Index after browser penalties", numberOrMissing(critique?.scores?.overallProduction));
      add(label, "Post-client child change not necessarily reflected in Production Index",
        finite(pre) && finite(post) && pre !== post ? "YES — inspect original parent and final parent separately" : "NO_OR_UNAVAILABLE");
      add(label, "DSP relative finish mid/sub/air (%)",
        [live?.calculatedFinishMidPct, live?.calculatedFinishSubPct, live?.calculatedFinishAirPct]
          .map(v => numberOrMissing(v)).join(" / "));
      add(label, "DSP crest factor (dB)", numberOrMissing(live?.calculatedCrestFactorDb));
      add(label, "Finish evidence summary", textOrMissing(finish?.summary));
      add(label, "Finish ceiling", finite(finish?.ceiling) ? finish.ceiling : finish?.ceiling === null ? "NONE" : "NOT_CAPTURED");
    } else {
      add(label, "Contribution basis", browserAvailable ? "POST-CLIENT MIX RECOMPUTATION BEFORE PARENT CEILING" : "SERVER MIX INPUTS ONLY (BROWSER UNAVAILABLE)");
      add(label, "Server Mix Balance contribution before browser correction", numberOrMissing(serverMix));
      add(label, "Final Mix Balance score after browser corrections", numberOrMissing(critique?.mixQuality?.score));
      add(label, "DSP midrange flatness", numberOrMissing(live?.calculatedMidrangeFlatness));
      add(label, "DSP midrange flux", numberOrMissing(live?.calculatedMidrangeFlux));
      add(label, "DSP low-mid/core-mid energy", [live?.calculatedLowMidsBandEnergy, live?.calculatedCoreMidsBandEnergy]
        .map(v => numberOrMissing(v)).join(" / "));
      add(label, "Browser Mix Balance evidence summary", textOrMissing(mixEvidence?.summary));
    }
    add(label, "Contribution interpretation",
      "Unrounded score × original integer weight / actual applicable denominator. Parent rounding, finish ceilings and penalties can change the final parent.");
  }
  return rows;
}
