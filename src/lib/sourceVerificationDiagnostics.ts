/**
 * Read-only diagnostic rows for source-presence investigations.
 * Never modifies critique data, scores, or applicability.
 */
export interface SourceDiagnosticRow {
  section: string;
  field: string;
  value: string;
}

const observed = (value: unknown): string => {
  if (value === undefined || value === null) return "NOT_CAPTURED";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return value.length ? value.map(String).join("; ") : "NONE";
  return String(value);
};

export function getSourceVerificationRows(critique: any): SourceDiagnosticRow[] {
  const low = critique?.subMetricsCall1?.lowEndDivision;
  const lv = critique?.subMetricsCall3?.vocalTrackingSubs?.vocalLayerFit;
  const ls = low?.sourceVerification;
  const vs = lv?.sourceVerification;
  const rows: SourceDiagnosticRow[] = [];
  const add = (section: string, field: string, value: unknown) =>
    rows.push({ section, field, value: observed(value) });

  add("Low-End Division", "Diagnostic capture", ls ? "PRESENT" : "NOT_CAPTURED");
  add("Low-End Division", "First-pass percussion type", ls?.firstPassPercussionType);
  add("Low-End Division", "Second-pass percussion type", ls?.secondPassPercussionType);
  add("Low-End Division", "First-pass bass type", ls?.firstPassBassType);
  add("Low-End Division", "Second-pass bass type", ls?.secondPassBassType);
  add("Low-End Division", "Passes corroborated", ls?.corroborated);
  add("Low-End Division", "First-pass percussion audible cue", ls?.firstPassPercussionEvidence);
  add("Low-End Division", "Second-pass percussion audible cue", ls?.secondPassPercussionEvidence);
  add("Low-End Division", "First-pass original commentary", ls?.firstPassCommentary);
  add("Low-End Division", "Gate rejection reasons", ls?.rejectionReasons);
  add("Low-End Division", "Final applicable", low?.applicable);
  add("Low-End Division", "Final commentary", low?.commentary);

  add("Vocal Layer Fit", "Diagnostic capture", vs ? "PRESENT" : "NOT_CAPTURED");
  add("Vocal Layer Fit", "Raw backing layer presence", vs?.rawLayerPresence);
  add("Vocal Layer Fit", "Raw applicable", vs?.rawApplicable);
  add("Vocal Layer Fit", "Raw original commentary", vs?.rawCommentary);
  add("Vocal Layer Fit", "Gate forced N/A", vs?.forcedNotApplicable);
  add("Vocal Layer Fit", "Decision source", vs?.decisionSource);
  add("Vocal Layer Fit", "Final applicable", lv?.applicable);
  add("Vocal Layer Fit", "Final commentary", lv?.commentary);
  return rows;
}
