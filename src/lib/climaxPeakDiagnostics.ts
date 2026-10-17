/**
 * Read-only examination of competing loudness peaks.
 * Uses the exact three-adjacent-window mean and winner selection from the
 * existing Climax Trajectory DSP path. It never replaces those original values
 * or participates in the score. New tolerances below are *diagnostic only*.
 */
export interface ClimaxEnergyPoint { timeSec: number; db: number }
export interface ClimaxPeakCandidate { percent: number; deltaDb: number }
export interface ClimaxPeakDiagnostic {
  primaryPercent: number;
  alternativePeaks: ClimaxPeakCandidate[];
  longerSmoothingPeakPercent: number;
  smoothingShiftPercent: number;
}

const COMPARABLE_PEAK_TOLERANCE_DB = 0.5;
const DISTINCT_PEAK_SEPARATION_RATIO = 0.08;

export function analyzeClimaxPeakCompetition(
  rawEnvelope: unknown
): ClimaxPeakDiagnostic | null {
  if (!Array.isArray(rawEnvelope) || rawEnvelope.length < 8) return null;
  const points = rawEnvelope as ClimaxEnergyPoint[];
  if (points.some(p => !p || !Number.isFinite(p.db) || !Number.isFinite(p.timeSec))) return null;
  for (let i = 1; i < points.length; i++) {
    if (points[i].timeSec <= points[i - 1].timeSec) return null;
  }
  const values = points.map(p => p.db);
  const n = values.length;
  // Match the existing YSS 3-window smoother, including the repeated edge.
  const threeWindow = values.map((v, i) =>
    (values[Math.max(0, i - 1)] + v + values[Math.min(n - 1, i + 1)]) / 3
  );
  let primaryIdx = 0;
  for (let i = 1; i < n; i++) if (threeWindow[i] > threeWindow[primaryIdx]) primaryIdx = i;

  const localPeaks: number[] = [];
  for (let i = 0; i < n; i++) {
    const localMaximum = (i === 0 || threeWindow[i] >= threeWindow[i - 1]) &&
      (i === n - 1 || threeWindow[i] >= threeWindow[i + 1]);
    // Flat-top plateaus represent one peak event, not several "competing" peaks.
    const plateauContinuation = i > 0 && Math.abs(threeWindow[i] - threeWindow[i - 1]) < 1e-8;
    if (localMaximum && !plateauContinuation && threeWindow[primaryIdx] - threeWindow[i] <= COMPARABLE_PEAK_TOLERANCE_DB) {
      localPeaks.push(i);
    }
  }
  localPeaks.sort((a, b) => threeWindow[b] - threeWindow[a] || a - b);
  // Collapse nearby maxima into one event; a few seconds of small fluctuations
  // must not masquerade as several distinct musical sections.
  const minGap = Math.max(3, Math.ceil((n - 1) * DISTINCT_PEAK_SEPARATION_RATIO));
  const distinct: number[] = [primaryIdx];
  for (const idx of localPeaks) {
    if (distinct.length >= 5) break;
    if (distinct.every(other => Math.abs(idx - other) >= minGap)) distinct.push(idx);
  }
  const toPercent = (idx: number) => Math.round((idx / (n - 1)) * 100);
  const alternativePeaks = distinct.slice(1).map(idx => ({
    percent: toPercent(idx),
    deltaDb: Math.max(0, Number((threeWindow[primaryIdx] - threeWindow[idx]).toFixed(2))),
  }));
  // Exploratory, not an alternate truth: different smoothing changes which
  // section is selected when the recording has several nearly equal maxima.
  const longerWindow = values.map((_, i) => {
    const from = Math.max(0, i - 5);
    const to = Math.min(n, i + 5);
    const segment = values.slice(from, to);
    return segment.reduce((sum, v) => sum + v, 0) / segment.length;
  });
  let longerIdx = 0;
  for (let i = 1; i < n; i++) if (longerWindow[i] > longerWindow[longerIdx]) longerIdx = i;
  return {
    primaryPercent: toPercent(primaryIdx),
    alternativePeaks,
    longerSmoothingPeakPercent: toPercent(longerIdx),
    smoothingShiftPercent: Math.abs(toPercent(primaryIdx) - toPercent(longerIdx)),
  };
}

export function formatClimaxPeakDiagnostic(result: ClimaxPeakDiagnostic): string {
  const parts = [
    `Original three-window energy peak at ${result.primaryPercent}% of runtime (unchanged DSP measurement).`,
  ];
  if (result.alternativePeaks.length) {
    parts.push(
      `Other distinct peaks within 0.5 dB: ${result.alternativePeaks.map(p => `${p.percent}% (${p.deltaDb.toFixed(2)} dB lower)`).join("; ")}. The loudest-point location is not unique at this tolerance.`
    );
  } else {
    parts.push("No other distinct local peaks within 0.5 dB under this diagnostic.");
  }
  parts.push(
    `Exploratory ten-window smoothing selects ${result.longerSmoothingPeakPercent}%${result.smoothingShiftPercent >= 8 ? " (smoothing-sensitive peak location)" : ""}. Smoothing choice and near-equal peaks are not scoring penalties or evidence of musical quality.`
  );
  return parts.join(" ");
}
