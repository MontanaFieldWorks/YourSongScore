/**
 * Audit-only capture of Climax Trajectory score provenance and original Call 2
 * listening evidence. Does not calculate, assign, or mutate any score.
 *
 * This record is deliberately separate from the measured DSP peak diagnostic.
 */
export type ClimaxEvidenceRow = {
  section: string;
  field: string;
  value: string | number;
};

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const capturedText = (value: unknown): string =>
  typeof value === "string" && value.trim().length > 0 ? value : "NOT_CAPTURED";

const capturedNumber = (value: unknown): number | "NOT_CAPTURED" =>
  finite(value) ? value : "NOT_CAPTURED";

export function getClimaxTrajectoryEvidenceRows(critique: any): ClimaxEvidenceRow[] {
  const call2 = critique?.subMetricsCall2?.acousticTension?.climaxTrajectory;
  const dsp = critique?.liveMetrics;
  const hasGeminiScore = finite(call2?.score);
  const hasFallbackScore = finite(dsp?.calculatedClimaxTrajectoryScore);

  const scoreOrigin = hasGeminiScore
    ? "Gemini Call 2 tier-mapped quality score (used for scored metric; NOT calculated from DSP peak timing)"
    : hasFallbackScore
      ? "Legacy DSP fallback score (used only because Gemini Call 2 score is unavailable)"
      : "Neither Call 2 score nor DSP fallback captured; UI may show a display default. Do not infer a verified score.";

  const percent = finite(dsp?.calculatedClimaxPositionRatio)
    ? `${(dsp.calculatedClimaxPositionRatio * 100).toFixed(1)}% of runtime`
    : "NOT_CAPTURED";

  const buildDb = finite(dsp?.calculatedClimaxBuildDb)
    ? `${dsp.calculatedClimaxBuildDb} dB above opening baseline`
    : "NOT_CAPTURED";

  return [
    { section: "Climax Trajectory", field: "Score provenance (Gemini vs DSP fallback)", value: scoreOrigin },
    { section: "Climax Trajectory", field: "Gemini Call 2 qualityTier (model judgment)", value: capturedText(call2?.qualityTier) },
    { section: "Climax Trajectory", field: "Gemini Call 2 numeric score (mapped tier)", value: capturedNumber(call2?.score) },
    { section: "Climax Trajectory", field: "Original Gemini Call 2 commentary (UNVERIFIED)", value: capturedText(call2?.commentary) },
    { section: "Climax Trajectory", field: "Legacy DSP fallback score (not used when Call 2 is present)", value: capturedNumber(dsp?.calculatedClimaxTrajectoryScore) },
    { section: "Climax Trajectory", field: "DSP measured energy peak position (not a quality score)", value: percent },
    { section: "Climax Trajectory", field: "DSP measured energy build (not a quality score)", value: buildDb },
    { section: "Climax Trajectory", field: "Evidence interpretation", value: "Gemini qualityTier, score, and original commentary are unverified listening judgments. DSP peak position, build, and competing peaks are independent measurements and do not validate the quality tier." },
  ];
}
