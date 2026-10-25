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
  const narrative = inspectA2NarrativeConflicts(critique);
  const clientKey = critique?.liveMetrics?.a2KeyDetectionProvenance;
  const serverKey = critique?.a2KeyServerProvenance;
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
  // Do not infer a failed condition from the generic historical rejection code.
  add("Low-End Division", "First-pass named percussion source", ls?.firstPassPercussionName);
  add("Low-End Division", "Second-pass named percussion source", ls?.secondPassPercussionName);
  add("Low-End Division", "First-pass low-percussion certainty", ls?.firstPassPercussionCertainty);
  add("Low-End Division", "Second-pass low-percussion certainty", ls?.secondPassPercussionCertainty);
  add("Low-End Division", "First-pass role independence", ls?.firstPassRolesIndependent);
  add("Low-End Division", "Second-pass role independence", ls?.secondPassRolesIndependent);
  add("Low-End Division", "Precise gate checks captured", ls?.gateFactors ? "PRESENT" : "NOT_CAPTURED");
  for (const [name, passed] of Object.entries(ls?.gateFactors || {})) {
    add("Low-End Division", "Gate check: " + name, passed);
  }
  add("Low-End Division", "Precise failed checks", ls?.specificRejectionReasons);

  add("Vocal Layer Fit", "Diagnostic capture", vs ? "PRESENT" : "NOT_CAPTURED");
  add("Vocal Layer Fit", "Raw backing layer presence", vs?.rawLayerPresence);
  add("Vocal Layer Fit", "Raw applicable", vs?.rawApplicable);
  add("Vocal Layer Fit", "Raw original commentary", vs?.rawCommentary);
  add("Vocal Layer Fit", "Gate forced N/A", vs?.forcedNotApplicable);
  add("Vocal Layer Fit", "Decision source", vs?.decisionSource);
  add("Vocal Layer Fit", "Final applicable", lv?.applicable);
  add("Vocal Layer Fit", "Final commentary", lv?.commentary);
  add("Genre Consistency", "Evidence-only review flag (not scored)", narrative.genreFlag);
  add("Genre Consistency", "Matched existing model descriptions", narrative.genreSignals);
  add("Midrange Consistency", "Parent/child review flag (not scored)", narrative.midrangeFlag);
  add("Midrange Consistency", "Matched existing model assertions", narrative.midrangeSignals);
  add("A2 Key Detection", "Browser provenance captured", clientKey ? "PRESENT" : "NOT_CAPTURED");
  add("A2 Key Detection", "Browser detector", clientKey?.detector);
  add("A2 Key Detection", "Browser detector result status", clientKey?.status);
  add("A2 Key Detection", "Browser estimated key", clientKey?.estimatedKey);
  add("A2 Key Detection", "Raw detector strength (NOT confidence)", clientKey?.rawStrength);
  add("A2 Key Detection", "Detected key included in upload", clientKey?.payloadKeyIncluded);
  add("A2 Key Detection", "Server key provenance captured", serverKey ? "PRESENT" : "NOT_CAPTURED");
  add("A2 Key Detection", "Server-received detected key", serverKey?.receivedDetectedKey);
  add("A2 Key Detection", "Main critique constrained by supplied key", serverKey?.mainCritiqueKeyConstrained);
  add("A2 Key Detection", "Chord call constrained by supplied key", serverKey?.chordCallKeyConstrained);
  add("A2 Key Detection", "Constrained chord response key before override", serverKey?.constrainedChordResponseKey);
  add("A2 Key Detection", "Server reapplied supplied key after chord call", serverKey?.serverReappliedKey);
  add("A2 Key Detection", "Interpretation", "Detector estimate only; no independent audio key ground truth or accuracy confidence");
  return rows;
}

/**
 * A2 Phase 1: strictly diagnostic-only predicates. The scoring gate in server.ts
 * remains authoritative and unmodified; none of these results are fed to scoring.
 * The same instrument-evidence validator is injected so reason codes cannot
 * silently diverge from source-name/cue requirements.
 */
export function describeLowEndGateFactors(
  first: any,
  second: any,
  hasSpecificEvidence: (kind: any, source: any, cue: any) => boolean,
): { factors: Record<string, boolean | null>; failedChecks: string[] } {
  const validBass = (kind: any) =>
    ["DEDICATED_BASS_INSTRUMENT", "DEDICATED_SYNTH_OR_SUB", "INDEPENDENT_ORCHESTRAL_BASS"].includes(kind);

  // Explain the authoritative validator result in finer granularity without
  // using these mirror checks for any score or applicability decision.
  const evidenceDetails = (kind: any, rawName: any, rawCue: any) => {
    const name = String(rawName || "").trim();
    const cue = String(rawCue || "").trim();
    const nameGeneric = /(?:transient(?:-like)?|pulse|ostinato|attack-like|percussive[- ](?:sounding|element)|rhythmic (?:element|layer)|low[- ]frequency (?:element|energy|sound|activity))/i.test(name) ||
      /^(?:unknown|none|n\\/?a|not established|undetermined|percussion|drums?|other)$/i.test(name);
    const cueGeneric = /^(?:unknown|none|n\\/?a|not (?:clear|established|audible)|unverified)$/i.test(cue);
    const typeMatchesName = kind === "KICK_DRUM" ? /\\b(kick|bass drum)\\b/i.test(name)
      : kind === "BASS_DRUM" ? /\\b(bass drum|concert bass drum|gran cassa)\\b/i.test(name)
      : kind === "TIMPANI_OR_LOW_TOM" ? /\\b(timpani|tympani|kettledrum|kettle drum|low tom|floor tom)\\b/i.test(name)
      : kind === "OTHER_NAMED_LOW_PERCUSSION";
    return {
      SOURCE_NAME_PRESENT: name.length > 0,
      SOURCE_NAME_SPECIFIC: name.length > 0 && !nameGeneric,
      SOURCE_NAME_MATCHES_PERCUSSION_TYPE: typeMatchesName,
      AUDIBLE_CUE_PRESENT: cue.length > 0,
      AUDIBLE_CUE_AT_LEAST_12_CHARS: cue.length >= 12,
      AUDIBLE_CUE_NOT_GENERIC_PLACEHOLDER: cue.length > 0 && !cueGeneric,
    };
  };
  const firstEvidence = hasSpecificEvidence(first?.lowTransientSourceType, first?.lowTransientSourceName, first?.lowTransientAudibleCue);
  const secondEvidence = second
    ? hasSpecificEvidence(second.percussionType, second.percussionSourceName, second.percussionAudibleCue) : null;
  const factors: Record<string, boolean | null> = {
    FIRST_PASS_PERCUSSION_ROLE_PRESENT: first?.kickLikePercussionRolePresent === true,
    FIRST_PASS_PERCUSSION_CERTAINTY_CLEAR: first?.lowTransientCertainty === "CLEAR",
    FIRST_PASS_ROLES_INDEPENDENT: first?.lowEndRolesIndependent === true,
    FIRST_PASS_NAMED_PERCUSSION_EVIDENCE_VALID: firstEvidence,
    FIRST_PASS_BASS_ROLE_PRESENT: first?.sustainedBassRolePresent === true,
    FIRST_PASS_BASS_ROLES_INDEPENDENT: first?.lowEndRolesIndependent === true,
    FIRST_PASS_BASS_FOUNDATION_TYPE_VALID: validBass(first?.bassFoundationSourceType),
    SECOND_PASS_AVAILABLE: !!second,
    SECOND_PASS_PERCUSSION_CERTAINTY_CLEAR: second ? second.percussionCertainty === "CLEAR" : null,
    SECOND_PASS_ROLES_INDEPENDENT: second ? second.rolesIndependent === true : null,
    SECOND_PASS_PERCUSSION_TYPE_MATCH: second ? second.percussionType === first?.lowTransientSourceType : null,
    SECOND_PASS_BASS_TYPE_MATCH: second ? second.bassFoundationType === first?.bassFoundationSourceType : null,
    SECOND_PASS_NAMED_PERCUSSION_EVIDENCE_VALID: secondEvidence,
    ...Object.fromEntries(Object.entries(evidenceDetails(
      first?.lowTransientSourceType, first?.lowTransientSourceName, first?.lowTransientAudibleCue,
    )).map(([name, result]) => ["FIRST_PASS_" + name, result])),
    ...(second ? Object.fromEntries(Object.entries(evidenceDetails(
      second.percussionType, second.percussionSourceName, second.percussionAudibleCue,
    )).map(([name, result]) => ["SECOND_PASS_" + name, result]))
      : Object.fromEntries(Object.keys(evidenceDetails("", "", "")).map(name => ["SECOND_PASS_" + name, null]))),
  };
  return {
    factors,
    failedChecks: Object.entries(factors).filter(([, passed]) => passed === false).map(([name]) => name),
  };
}

const say = (v: unknown): string => typeof v === "string" ? v : "";

/**
 * Conservative review hints from existing, sanitized model assertions only.
 * No reclassification, scoring, NLP API calls, or raw restricted evidence.
 * No flag is NOT a statement of ground-truth correctness.
 */
export function inspectA2NarrativeConflicts(critique: any): {
  genreFlag: string;
  genreSignals: string[];
  midrangeFlag: string;
  midrangeSignals: string[];
} {
  const family = say(critique?.vibe?.genre);
  const subgenre = say(critique?.vibe?.subgenre);
  const evidence = [
    say(critique?.subMetricsCall1?.dynamicVariety?.commentary),
    say(critique?.subMetricsCall1?.spaceAndDensity?.commentary),
    say(critique?.mixQuality?.frequencyBalance?.midrange),
    say(critique?.arrangement?.instrumentation),
  ].join(" ");
  const folkLabel = /folk|singer.songwriter/i.test(family) || /folk/i.test(subgenre);
  const electricGuitar = /\belectric guitars?\b/i.test(evidence);
  const drumKit = /\bdrumm?(?:ing|er|s)?\b|\bkick drum\b|\bsnare\b/i.test(evidence);
  const highGainOrSolo = /\bdistorted\b|\boverdriv(?:e|en)\b|\bhigh.gain\b|\bguitar solo\b/i.test(evidence);
  const genreSignals = [
    ...(folkLabel ? ["FOLK_FAMILY_OR_SUBGENRE"] : []),
    ...(electricGuitar ? ["ELECTRIC_GUITARS_DESCRIBED"] : []),
    ...(drumKit ? ["DRUM_KIT_DESCRIBED"] : []),
    ...(highGainOrSolo ? ["HIGH_GAIN_OR_SOLO_DESCRIBED"] : []),
  ];
  const genreFlag = folkLabel && electricGuitar && drumKit && highGainOrSolo
    ? "REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE"
    : "NO_DETERMINISTIC_CONTRADICTION_FLAG";

  const parent = [
    say(critique?.mixQuality?.frequencyBalance?.midrange),
    say(critique?.mixQuality?.dominanceIssues),
  ].join(" ");
  const child = say(critique?.subMetricsCall1?.midrangeSpacing?.commentary);
  const parentMasking = /\b(?:can lead to|causes?|creates?|noticeable|significant|some|occasional)\b.{0,35}\bmasking\b|\bmask(?:s|ed|ing)\b.{0,65}\b(?:vocal|lead|clarity)\b/i.test(parent);
  const childDenies = /\bno\s+(?:significant\s+)?(?:\w+\s+){0,2}(?:masking|blurring)\b|\bwithout\s+(?:significant\s+)?(?:\w+\s+){0,2}masking\b|\bminimal\s+masking\b/i.test(child);
  const midrangeSignals = [
    ...(parentMasking ? ["PARENT_ASSERTS_MIDRANGE_MASKING"] : []),
    ...(childDenies ? ["CHILD_DENIES_SIGNIFICANT_MASKING"] : []),
  ];
  const midrangeFlag = !parent.trim() || !child.trim() ? "INSUFFICIENT_NARRATIVE_EVIDENCE"
    : parentMasking && childDenies ? "REVIEW_PARENT_CHILD_MASKING_CONTRADICTION"
    : "NO_DETERMINISTIC_CONTRADICTION_FLAG";
  return {genreFlag, genreSignals, midrangeFlag, midrangeSignals};
}
