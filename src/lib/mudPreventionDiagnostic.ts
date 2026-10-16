// Beta scoring contract. Historical critiques without this version retain their
// original Mud Prevention score and parent totals when opened or exported.
export const MUD_DIAGNOSTIC_SCORING_VERSION = "scoring-tier-v8-mud-diagnostic";
export const MUD_DIAGNOSTIC_STATUS = "DIAGNOSTIC_ONLY";

export function isMudDiagnosticCritique(critique: any): boolean {
  return critique?.productionScoringVersion === MUD_DIAGNOSTIC_SCORING_VERSION ||
    critique?.subMetricsCall1?.mudPrevention?.scoringStatus === MUD_DIAGNOSTIC_STATUS;
}

export function markMudPreventionDiagnosticOnly(critique: any): void {
  const mud = critique?.subMetricsCall1?.mudPrevention;
  if (!mud) return;
  mud.scoringStatus = MUD_DIAGNOSTIC_STATUS;
  mud.score = null; // No numeric Mud Prevention score in newly generated critiques.
}

export function computeMixBalanceScore(call1: any, excludeMud: boolean): number | null {
  if (!call1) return null;
  const parts: Array<[any, number]> = [
    ...(excludeMud ? [] : [[call1.mudPrevention, 25] as [any, number]]),
    [call1.midrangeSpacing, 25],
    [call1.lowEndDivision, 20],
    [call1.sibilanceShaving, 15],
    [call1.stereoWidth, 15],
  ];
  const scored = parts.filter(([metric]) => metric?.applicable !== false &&
    typeof metric?.score === "number" && Number.isFinite(metric.score));
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round(scored.reduce((sum, [metric, weight]) => sum + metric.score * weight, 0) / total);
}

// The visible weights must reflect existing N/A decisions, not just the
// nominal 75-point denominator of an all-applicable beta report.
export function getMixBalanceEffectiveWeight(
  call1: any,
  key: "midrangeSpacing" | "lowEndDivision" | "sibilanceShaving" | "stereoWidth",
): number | null {
  if (!call1) return null;
  const parts: Array<[string, number]> = [
    ["midrangeSpacing", 25],
    ["lowEndDivision", 20],
    ["sibilanceShaving", 15],
    ["stereoWidth", 15],
  ];
  const applicable = parts.filter(([field]) => call1[field]?.applicable !== false &&
    typeof call1[field]?.score === "number" && Number.isFinite(call1[field].score));
  const part = applicable.find(([field]) => field === key);
  if (!part) return null;
  const total = applicable.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round((part[1] / total) * 1000) / 10;
}
