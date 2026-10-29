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
  // Diagnostic mirror only. A missing second-pass check is UNKNOWN, not a
  // failed or absent instrument; no result here influences the N/A gate.
  const factorMap = ls?.gateFactors;
  const factorValues = factorMap && typeof factorMap === "object" && !Array.isArray(factorMap)
    ? Object.values(factorMap) : null;
  const knownPasses = factorValues?.filter(value => value === true).length ?? 0;
  const knownFailures = factorValues?.filter(value => value === false).length ?? 0;
  const unknownFactors = factorValues?.filter(value => value !== true && value !== false).length ?? 0;
  add("Low-End Division", "Gate evidence coverage (not an applicability verdict)",
    !factorValues ? "NOT_CAPTURED" : factorValues.length === 25 ? "ALL_25_CHECK_SLOTS_RECORDED" : "PARTIAL_FACTOR_RECORD");
  add("Low-End Division", "Gate factors true / false / unknown",
    !factorValues ? "NOT_CAPTURED" : `${knownPasses} / ${knownFailures} / ${unknownFactors}`);
  add("Low-End Division", "Second-pass presence (not proof of instrument absence)",
    !factorValues ? "NOT_CAPTURED"
      : factorMap.SECOND_PASS_AVAILABLE === true ? "RECORDED"
      : factorMap.SECOND_PASS_AVAILABLE === false ? "UNAVAILABLE" : "NOT_CAPTURED");
  add("Low-End Division", "Factor/decision review flag (not scored)",
    !factorValues || typeof low?.applicable !== "boolean" ? "NOT_CAPTURED"
      : low.applicable === true && (knownFailures > 0 || unknownFactors > 0)
        ? "REVIEW_APPLICABLE_WITH_UNVERIFIED_DIAGNOSTIC_FACTORS"
        : low.applicable === false && factorValues.length === 25 && knownPasses === 25
          ? "REVIEW_NOT_APPLICABLE_DESPITE_ALL_DIAGNOSTIC_FACTORS_TRUE"
          : "NO_DETERMINISTIC_FACTOR_DECISION_CONFLICT");

  add("Vocal Layer Fit", "Diagnostic capture", vs ? "PRESENT" : "NOT_CAPTURED");
  add("Vocal Layer Fit", "Raw backing layer presence", vs?.rawLayerPresence);
  add("Vocal Layer Fit", "Raw applicable", vs?.rawApplicable);
  add("Vocal Layer Fit", "Raw original commentary", vs?.rawCommentary);
  add("Vocal Layer Fit", "Gate forced N/A", vs?.forcedNotApplicable);
  add("Vocal Layer Fit", "Decision source", vs?.decisionSource);
  add("Vocal Layer Fit", "Final applicable", lv?.applicable);
  add("Vocal Layer Fit", "Final commentary", lv?.commentary);
  // Single-pass presence is a model assertion, never independent truth.
  // A genuine instrumental overrides any presumed backing-layer applicability.
  const layerDecisionReview = !vs || !lv ||
    typeof vs.rawLayerPresence !== "boolean" || typeof lv.applicable !== "boolean"
      ? "NOT_CAPTURED"
      : critique?.performance?.vocalApplicable === false
        ? "VOCAL_PERFORMANCE_NOT_APPLICABLE"
        : vs.rawLayerPresence === false && lv.applicable === true
          ? "REVIEW_ABSENT_LAYER_MARKED_APPLICABLE"
          : vs.rawLayerPresence === true && lv.applicable === false
            ? "REVIEW_PRESENT_LAYER_MARKED_NOT_APPLICABLE"
            : "CONSISTENT_WITH_UNVERIFIED_SINGLE_PASS";
  add("Vocal Layer Fit", "Presence versus final applicability review (not scored)", layerDecisionReview);
  add("Vocal Layer Fit", "Presence evidence qualification",
    vs ? "CALL3_SINGLE_LISTEN_UNVERIFIED; cross-pass statements are assertions, not acoustic proof"
      : "NOT_CAPTURED");
  add("Genre Consistency", "Evidence-only review flag (not scored)", narrative.genreFlag);
  add("Genre Consistency", "Matched existing model descriptions", narrative.genreSignals);
  add("Midrange Consistency", "Parent/child review flag (not scored)", narrative.midrangeFlag);
  add("Midrange Consistency", "Matched existing model assertions", narrative.midrangeSignals);
  // The server creates this controlled-code snapshot before reconciliation.
  // Never reconstruct an "original" from post-browser commentary or legacy reports.
  const original = critique?.a2OriginalAssertionSnapshot;
  const captured = original?.captureStage === "SERVER_PRE_RECONCILIATION" && original?.version === 1;
  const safe = (value: unknown, allowed: readonly string[]): string =>
    typeof value === "string" && allowed.includes(value) ? value : "NOT_CAPTURED";
  const genreCodes = ["REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE",
    "NO_DETERMINISTIC_CONTRADICTION_FLAG", "INSUFFICIENT_GENRE_OR_INSTRUMENT_EVIDENCE"];
  const midrangeCodes = ["REVIEW_PARENT_CHILD_MASKING_CONTRADICTION",
    "NO_DETERMINISTIC_CONTRADICTION_FLAG", "INSUFFICIENT_NARRATIVE_EVIDENCE"];
  const layerStatuses = ["PRESENT_SINGLE_PASS_UNVERIFIED", "ABSENT_SINGLE_PASS_UNVERIFIED", "NOT_CAPTURED"];
  const layerFlags = ["REVIEW_CONFLICTING_LAYER_ASSERTIONS", "NO_DETERMINISTIC_LAYER_CONTRADICTION_FLAG",
    "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE", "AMBIGUOUS_CROSS_PASS_LAYER_DESCRIPTIONS", "NOT_CAPTURED"];
  const genreSignalCodes = ["FOLK_FAMILY_OR_SUBGENRE", "ELECTRIC_GUITARS_DESCRIBED",
    "DRUM_KIT_DESCRIBED", "HIGH_GAIN_OR_SOLO_DESCRIBED"];
  const midrangeSignalCodes = ["PARENT_ASSERTS_MIDRANGE_MASKING", "CHILD_DENIES_SIGNIFICANT_MASKING"];
  const layerSignalCodes = ["MAIN_CRITIQUE_DESCRIBES_BACKING_LAYERS",
    "MAIN_CRITIQUE_EXPLICITLY_DENIES_BACKING_LAYERS",
    "MAIN_STEREO_DESCRIBES_BACKING_LAYERS",
    "MAIN_STEREO_EXPLICITLY_DENIES_BACKING_LAYERS"];
  const safeSignals = (value: unknown, allowed: readonly string[]): string =>
    Array.isArray(value) && value.every(v => typeof v === "string" && allowed.includes(v))
      ? value.length ? value.join("; ") : "NONE" : "NOT_CAPTURED";
  const tierCodes = ["REFERENCE", "EXCEPTIONAL", "ABOVE_AVERAGE", "PROFESSIONAL_HIGH",
    "PROFESSIONAL", "LIMITED", "MATERIAL_ISSUE", "SEVERE"];
  const currentLayer = inspectA2VocalLayerEvidence(critique);
  add("Vocal Layer Fit", "Current single-pass presence status (not corroborated)", currentLayer.status);
  add("Vocal Layer Fit", "Current cross-pass assertion review flag (not scored)", currentLayer.crossPassFlag);
  add("Vocal Layer Fit", "Current cross-pass assertion codes", currentLayer.crossPassSignals);
  add("Vocal Layer Fit", "Assertion support classification (not acoustic verification)",
    classifyA2VocalLayerAssertionSupport(currentLayer));
  add("Vocal Layer Fit", "Assertion classification limitation",
    "Same-source narratives are model assertions, not independent audio corroboration; never used to change applicability.");
  add("A2 Original Assertions", "Immutable pre-reconciliation capture", captured ? "PRESENT" : "NOT_CAPTURED");
  add("A2 Original Assertions", "Capture stage",
    captured ? "SERVER_PRE_RECONCILIATION" : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original vocal-track genre review flag (not scored)",
    captured ? safe(original.originalVocalTrackGenreFlag,
      [...genreCodes, "NOT_CONFIRMED_VOCAL_TRACK"]) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original genre review flag (not scored)",
    captured ? safe(original.originalGenreFlag, genreCodes) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original genre assertion codes",
    captured ? safeSignals(original.originalGenreSignals, genreSignalCodes) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original model Midrange Spacing qualityTier",
    captured ? safe(original.originalMidrangeTier, tierCodes) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original parent/child midrange review flag (not scored)",
    captured ? safe(original.originalMidrangeFlag, midrangeCodes) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original midrange assertion codes",
    captured ? safeSignals(original.originalMidrangeSignals, midrangeSignalCodes) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original vocal-layer presence status (single pass)",
    captured ? safe(original.vocalLayerEvidenceStatus, layerStatuses) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original vocal-layer cross-pass review flag (not scored)",
    captured ? safe(original.vocalLayerCrossPassFlag, layerFlags) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Original vocal-layer assertion codes",
    captured ? safeSignals(original.vocalLayerCrossPassSignals, layerSignalCodes) : "NOT_CAPTURED");
  add("A2 Original Assertions", "Interpretation",
    "Controlled assertion codes only; no independent audio verification. Captured after server genre normalization and Call 3 gates, before parent reconciliation and browser edits; never reconstructed for legacy reports.");
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
      /^(?:unknown|none|n\/?a|not established|undetermined|percussion|drums?|other)$/i.test(name);
    const cueGeneric = /^(?:unknown|none|n\/?a|not (?:clear|established|audible)|unverified)$/i.test(cue);
    const typeMatchesName = kind === "KICK_DRUM" ? /\b(kick|bass drum)\b/i.test(name)
      : kind === "BASS_DRUM" ? /\b(bass drum|concert bass drum|gran cassa)\b/i.test(name)
      : kind === "TIMPANI_OR_LOW_TOM" ? /\b(timpani|tympani|kettledrum|kettle drum|low tom|floor tom)\b/i.test(name)
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
 * Conservative lexical review cues, not an NLP judgment or source detector.
 * Scope each cue to a clause to avoid interpreting negated instrument names,
 * e.g. "no electric guitars", as affirmative acoustic evidence. Splitting
 * adversative clauses permits "no acoustic drums, but a kick drum enters".
 */
const clauses = (source: string): string[] =>
  source.split(/[.!?;\n]+|\b(?:but|however|though|although|whereas|yet)\b/gi)
    .map(part => part.trim()).filter(Boolean);

/**
 * Only an explicit, nearby denial can suppress a positive cue. Ambiguous
 * clauses are deliberately not promoted to ground-truth claims. "Not only"
 * and "not just" are affirmative intensifiers, not absence assertions.
 */
function deniedAt(clause: string, start: number, end: number): boolean {
  const before = clause.slice(Math.max(0, start - 110), start);
  const negators = /\b(?:no|not|never|neither|nor|without|lacks?|lacking|absence\s+of|free\s+of|avoids?|prevents?|prevented|eliminates?|eliminated|doesn't|don't|isn't|aren't|cannot|can't)\b/gi;
  const found = [...before.matchAll(negators)];
  const last = found[found.length - 1];
  if (last) {
    const tail = before.slice((last.index ?? 0) + last[0].length);
    if (!/^(?:\s+(?:only|just|merely|simply))\b/i.test(tail) &&
        (tail.match(/\b[\w'-]+\b/g) || []).length <= 8) return true;
  }
  const after = clause.slice(end, end + 60);
  // Postposed absence: "the drums are absent" / "guitars are not audible".
  return /^\W*(?:\b(?:is|are|was|were|remain)\s+)?(?:not\s+(?:present|audible|heard)|absent|missing|unheard)\b/i.test(after);
}

function hasAffirmedCue(source: string, pattern: RegExp): boolean {
  for (const clause of clauses(source)) {
    // All patterns here are compiled as fresh /g expressions.
    for (const match of clause.matchAll(pattern)) {
      const start = match.index ?? 0;
      if (!deniedAt(clause, start, start + match[0].length)) return true;
    }
  }
  return false;
}

function hasExplicitMaskingDenial(source: string): boolean {
  for (const clause of clauses(source)) {
    for (const match of clause.matchAll(/\bmask(?:ing|ed|s)?\b|\bblurring\b/gi)) {
      const start = match.index ?? 0;
      if (deniedAt(clause, start, start + match[0].length)) return true;
      const before = clause.slice(Math.max(0, start - 36), start);
      if (/\b(?:minimal|negligible|little|no significant|no noticeable)\s*$/i.test(before)) return true;
    }
  }
  return false;
}

/**
 * Conservative review hints from existing, sanitized model assertions only.
 * No reclassification, scoring, NLP API calls, or raw restricted evidence.
 * A missing flag never asserts that a genre or mix judgment was correct.
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
  ].join(". ").trim();
  const folkLabel = /folk|singer.songwriter/i.test(family) || /folk/i.test(subgenre);
  // A generic mood adjective is not instrumentation evidence.
  const usableGenreEvidence = !!(family.trim() || subgenre.trim()) && 
    /\b(?:guitars?|drums?|drumming|kick|snare|bass|vocals?|synths?|piano|strings|percussion|instrumentation|acoustic|electric|distorted|overdriven|overdrive|solo)\b/i.test(evidence);
  const electricGuitar = hasAffirmedCue(evidence, /\belectric guitars?\b/gi);
  const drumKit = hasAffirmedCue(evidence, /\bdrum(?:s|ming|mer)?\b|\bkick drum\b|\bsnare\b/gi);
  const highGainOrSolo = hasAffirmedCue(evidence, /\bdistorted\b|\boverdriv(?:e|en)\b|\bhigh.gain\b|\bguitar solo\b/gi);
  const genreSignals = [
    ...(folkLabel ? ["FOLK_FAMILY_OR_SUBGENRE"] : []),
    ...(electricGuitar ? ["ELECTRIC_GUITARS_DESCRIBED"] : []),
    ...(drumKit ? ["DRUM_KIT_DESCRIBED"] : []),
    ...(highGainOrSolo ? ["HIGH_GAIN_OR_SOLO_DESCRIBED"] : []),
  ];
  const genreFlag = !usableGenreEvidence ? "INSUFFICIENT_GENRE_OR_INSTRUMENT_EVIDENCE"
    : folkLabel && electricGuitar && drumKit && highGainOrSolo
      ? "REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE"
      : "NO_DETERMINISTIC_CONTRADICTION_FLAG";

  const parent = [
    say(critique?.mixQuality?.frequencyBalance?.midrange),
    say(critique?.mixQuality?.dominanceIssues),
  ].join(". ").trim();
  const child = say(critique?.subMetricsCall1?.midrangeSpacing?.commentary).trim();
  const parentMasking = hasAffirmedCue(parent, /\bmask(?:ing|ed|s)?\b/gi);
  const childDenies = hasExplicitMaskingDenial(child);
  const midrangeSignals = [
    ...(parentMasking ? ["PARENT_ASSERTS_MIDRANGE_MASKING"] : []),
    ...(childDenies ? ["CHILD_DENIES_SIGNIFICANT_MASKING"] : []),
  ];
  const midrangeFlag = !parent || !child ? "INSUFFICIENT_NARRATIVE_EVIDENCE"
    : parentMasking && childDenies ? "REVIEW_PARENT_CHILD_MASKING_CONTRADICTION"
    : "NO_DETERMINISTIC_CONTRADICTION_FLAG";
  return { genreFlag, genreSignals, midrangeFlag, midrangeSignals };
}


/**
 * Read-only review classification of already-observed model assertions.
 * "CORROBORATING" means other model narrative statements agree, NOT a new
 * listening pass, independent acoustic confirmation or eligibility decision.
 */
export function classifyA2VocalLayerAssertionSupport(evidence: ReturnType<typeof inspectA2VocalLayerEvidence>): string {
  if (evidence.status === "NOT_CAPTURED") return "NOT_CAPTURED";
  if (evidence.crossPassFlag === "REVIEW_CONFLICTING_LAYER_ASSERTIONS")
    return "CONFLICTING_MODEL_ASSERTIONS";
  if (evidence.crossPassFlag === "AMBIGUOUS_CROSS_PASS_LAYER_DESCRIPTIONS")
    return "MIXED_MODEL_ASSERTIONS";
  if (evidence.crossPassFlag === "NO_DETERMINISTIC_LAYER_CONTRADICTION_FLAG" &&
      evidence.crossPassSignals.length > 0)
    return "CORROBORATING_MODEL_ASSERTIONS_UNVERIFIED";
  return "INSUFFICIENT_INDEPENDENT_EVIDENCE";
}

/**
 * Current-export Streaming Readiness lineage, exclusively informational.
 *
 * Caller supplies the ACTUAL scorecard and category-score outputs of the
 * unchanged scoring functions. The logic below describes branch precedence
 * and their arithmetic; it never supplies feature values to the scorer.
 * This cannot reconstruct the originally selected branch for historical
 * reports with missing inputs: mark those inputs NOT_CAPTURED.
 */
export function getStreamingReadinessLineageRows(
  critique: any,
  profile: any,
  actualScorecard: Array<{label: string; value: number; min: number; max: number; matchPercent: number}>,
  actualSummary: {streamingReadiness: number},
  verifiedFinishCeiling: number | null,
): SourceDiagnosticRow[] {
  const rows: SourceDiagnosticRow[] = [];
  const add = (section: string, field: string, value: unknown) =>
    rows.push({section, field, value: observed(value)});
  const n = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? String(value) : "NOT_CAPTURED";
  const isRecorded = (value: unknown) => value !== undefined && value !== null;
  const part = (label: string) => actualScorecard.find(item => item.label === label);
  const base = (a: string, b: string) => Math.round((((profile?.[a] ?? 0) + (profile?.[b] ?? 0)) / 2) * 100);
  const live = critique?.liveMetrics;
  const scores = critique?.scores;
  const call2 = critique?.subMetricsCall2;
  const overrides = critique?.spotifyOverrides;
  const mix = critique?.mixQuality?.score ?? 75;
  const production = scores?.overallProduction ?? 75;
  const flow = critique?.arrangement?.flowScore ?? 75;
  const instrumental = critique?.performance?.instrumentalScore ?? 75;
  const theory = critique?.musicTheory?.score ?? 72;
  const lyrics = critique?.lyricalImpact?.score ?? 70;
  const energyOffset = Math.round(((production || 75) % 15) - 4);
  const acousticOffset = Math.round(((instrumental || 70) % 15) - 7);
  const liveOffset = Math.round(((mix || 75) % 10) - 4);
  const danceOffset = Math.round(((flow || 70) - 72) * 0.4);
  const valenceOffset = Math.round(((theory || 72) - 72) * 0.3);
  const speechOffset = Math.round(((lyrics || 70) - 70) * 0.2);
  const descriptors: Array<{
    label: string; source: string; inputs: string; baseline: number;
    fallbackFormula: string; fallbackOffset: number | null;
    fallbackInput: string;
  }> = [];
  const push = (label: string, source: string, inputs: string, baseline: number,
    fallbackFormula: string, fallbackOffset: number | null, fallbackInput: string) => {
    descriptors.push({label, source, inputs, baseline, fallbackFormula, fallbackOffset, fallbackInput});
  };

  push("Danceability", "SCORE_DERIVED_FLOW",
    "arrangement.flowScore=" + n(critique?.arrangement?.flowScore),
    base("danceMin", "danceMax"),
    "round(((flowScore || 70) - 72) * 0.4); clamp(base + offset, 15, 95)",
    danceOffset, "flowScore=" + n(critique?.arrangement?.flowScore) + "; effective=" + flow);
  const acousticSource = isRecorded(overrides?.acousticness) ? "MANUAL_OVERRIDE"
    : isRecorded(call2?.acousticness?.score) ? "GEMINI_CALL2"
    : live?.calculatedBassEnergy !== undefined && live?.calculatedHighEnergy !== undefined && !!live
      ? "DSP_BASS_HIGH_ENERGY_RATIO" : "FALLBACK_INSTRUMENTAL_MOD15";
  push("Acousticness", acousticSource,
    acousticSource === "MANUAL_OVERRIDE" ? "spotifyOverrides.acousticness=" + n(overrides?.acousticness)
      : acousticSource === "GEMINI_CALL2" ? "subMetricsCall2.acousticness.score=" + n(call2?.acousticness?.score)
      : acousticSource === "DSP_BASS_HIGH_ENERGY_RATIO"
        ? "liveMetrics.calculatedBassEnergy=" + n(live?.calculatedBassEnergy) +
          "; calculatedHighEnergy=" + n(live?.calculatedHighEnergy)
        : "performance.instrumentalScore=" + n(critique?.performance?.instrumentalScore),
    base("acousticMin", "acousticMax"),
    "round(((instrumentalScore || 70) % 15) - 7); clamp(base + offset, 5, 95)",
    acousticSource === "FALLBACK_INSTRUMENTAL_MOD15" ? acousticOffset : null,
    "instrumentalScore=" + n(critique?.performance?.instrumentalScore) + "; effective=" + instrumental);
  const energySource = live?.calculatedLufs !== undefined &&
    live?.calculatedHighEnergy !== undefined && !!live
    ? "DSP_LUFS_HIGH_ENERGY" : "FALLBACK_PRODUCTION_MOD15";
  push("Energy", energySource,
    energySource === "DSP_LUFS_HIGH_ENERGY"
      ? "liveMetrics.calculatedLufs=" + n(live?.calculatedLufs) +
        "; calculatedHighEnergy=" + n(live?.calculatedHighEnergy)
      : "scores.overallProduction=" + n(scores?.overallProduction),
    base("energyMin", "energyMax"),
    "round(((overallProduction || 75) % 15) - 4); clamp(base + offset, 10, 96)",
    energySource === "FALLBACK_PRODUCTION_MOD15" ? energyOffset : null,
    "overallProduction=" + n(scores?.overallProduction) + "; effective=" + production);
  const valenceSource = isRecorded(overrides?.valence) ? "MANUAL_OVERRIDE"
    : isRecorded(call2?.moodValence?.score) ? "GEMINI_CALL2" : "FALLBACK_THEORY_SCORE";
  push("Mood Valence", valenceSource,
    valenceSource === "MANUAL_OVERRIDE" ? "spotifyOverrides.valence=" + n(overrides?.valence)
      : valenceSource === "GEMINI_CALL2" ? "subMetricsCall2.moodValence.score=" + n(call2?.moodValence?.score)
      : "musicTheory.score=" + n(critique?.musicTheory?.score),
    base("valenceMin", "valenceMax"),
    "round(((theoryScore || 72) - 72) * 0.3); clamp(base + offset, 8, 95)",
    valenceSource === "FALLBACK_THEORY_SCORE" ? valenceOffset : null,
    "theoryScore=" + n(critique?.musicTheory?.score) + "; effective=" + theory);
  const speechSource = isRecorded(call2?.speechiness?.score) ? "GEMINI_CALL2" : "FALLBACK_LYRICS_SCORE";
  push("Speechiness", speechSource,
    speechSource === "GEMINI_CALL2" ? "subMetricsCall2.speechiness.score=" + n(call2?.speechiness?.score)
      : "lyricalImpact.score=" + n(critique?.lyricalImpact?.score),
    base("speechMin", "speechMax"),
    "round(((lyricsScore || 70) - 70) * 0.2); clamp(base + offset, 2, 92)",
    speechSource === "FALLBACK_LYRICS_SCORE" ? speechOffset : null,
    "lyricsScore=" + n(critique?.lyricalImpact?.score) + "; effective=" + lyrics);

  const manualInstrumental = overrides?.instrumentalness;
  const vocalStatus = critique?.performance?.vocalApplicable;
  const vocalSubs = critique?.subMetricsCall3?.vocalTrackingSubs;
  const statuses = [vocalSubs?.pitchAccuracy?.applicable, vocalSubs?.dynamicDelivery?.applicable];
  const instrumentalSource = typeof manualInstrumental === "number" && Number.isFinite(manualInstrumental)
    ? "MANUAL_OVERRIDE"
    : vocalStatus === false || (vocalStatus == null && statuses.every(status => status === false))
      ? "VOCAL_STATUS_ABSENT_PROXY_98"
      : vocalStatus === true || (vocalStatus == null && statuses.some(status => status === true))
        ? "VOCAL_STATUS_PRESENT_PROXY_2"
        : "FALLBACK_INSTRUMENTAL_SCORE";
  const instOffset = Math.round(((instrumental || 75) - 75) * 0.3);
  push("Instrumentalness", instrumentalSource,
    instrumentalSource === "MANUAL_OVERRIDE" ? "spotifyOverrides.instrumentalness=" + n(manualInstrumental)
      : instrumentalSource.startsWith("VOCAL_STATUS")
        ? "performance.vocalApplicable=" + observed(vocalStatus) +
          "; pitchAccuracy.applicable=" + observed(statuses[0]) +
          "; dynamicDelivery.applicable=" + observed(statuses[1])
        : "performance.instrumentalScore=" + n(critique?.performance?.instrumentalScore),
    base("instMin", "instMax"),
    "round(((instrumentalScore || 75) - 75) * 0.3); clamp(base + offset, 1, 98); vocal status proxies 2/98",
    instrumentalSource === "FALLBACK_INSTRUMENTAL_SCORE" ? instOffset : null,
    "instrumentalScore=" + n(critique?.performance?.instrumentalScore) + "; effective=" + instrumental);
  const liveSource = isRecorded(overrides?.liveness) ? "MANUAL_OVERRIDE"
    : live?.calculatedStereoCorrelation !== undefined && !!live
      ? "DSP_STEREO_CORRELATION_PROXY" : "FALLBACK_MIX_MOD10";
  push("Liveness", liveSource,
    liveSource === "MANUAL_OVERRIDE" ? "spotifyOverrides.liveness=" + n(overrides?.liveness)
      : liveSource === "DSP_STEREO_CORRELATION_PROXY"
        ? "liveMetrics.calculatedStereoCorrelation=" + n(live?.calculatedStereoCorrelation)
        : "mixQuality.score=" + n(critique?.mixQuality?.score),
    base("liveMin", "liveMax"),
    "round(((mixScore || 75) % 10) - 4); clamp(base + offset, 5, 95); DSP alternative=round(clamp((1-correlation)*100,5,95))",
    liveSource === "FALLBACK_MIX_MOD10" ? liveOffset : null,
    "mixScore=" + n(critique?.mixQuality?.score) + "; effective=" + mix);

  add("Streaming Readiness Lineage", "Capture scope",
    "CURRENT_EXPORT_REPLAY_ONLY; no immutable earlier feature-source trace exists; historical selected paths are not independently captured");
  add("Streaming Readiness Lineage", "Subgenre profile",
    critique?.vibe?.genre && critique?.vibe?.subgenre
      ? "GENRE_AND_SUBGENRE_PRESENT" : "NOT_CAPTURED");
  for (const descriptor of descriptors) {
    const section = "Streaming Profile: " + descriptor.label;
    const actual = part(descriptor.label);
    add(section, "Selected source branch (current export)", descriptor.source);
    const selectedFormula: Record<string, string> = {
      SCORE_DERIVED_FLOW: "round(clamp(base + round(((flowScore || 70) - 72) * 0.4), 15, 95))",
      MANUAL_OVERRIDE: "explicit spotifyOverrides input (no score-based inference)",
      GEMINI_CALL2: "subMetricsCall2 model-generated score (not DSP-verified)",
      DSP_BASS_HIGH_ENERGY_RATIO: "bassRatio=bassEnergy/max(1,highEnergy); round(clamp((bassRatio/3)*100, 5,95))",
      DSP_LUFS_HIGH_ENERGY: "lufsFactor=clamp((LUFS+22)/16,0,1); highFactor=min(1,highEnergy/50); round(clamp((lufsFactor*0.6+highFactor*0.4)*100,10,96))",
      FALLBACK_INSTRUMENTAL_MOD15: descriptor.fallbackFormula,
      FALLBACK_PRODUCTION_MOD15: descriptor.fallbackFormula,
      FALLBACK_THEORY_SCORE: descriptor.fallbackFormula,
      FALLBACK_LYRICS_SCORE: descriptor.fallbackFormula,
      VOCAL_STATUS_ABSENT_PROXY_98: "vocal presence explicitly absent; return proxy 98 (NOT observed live instrumentalness)",
      VOCAL_STATUS_PRESENT_PROXY_2: "vocal presence explicitly true; return proxy 2 (NOT measured instrumentalness)",
      FALLBACK_INSTRUMENTAL_SCORE: descriptor.fallbackFormula,
      DSP_STEREO_CORRELATION_PROXY: "round(clamp((1-stereoCorrelation)*100,5,95)); not a validated live-performance detector",
      FALLBACK_MIX_MOD10: descriptor.fallbackFormula,
    };
    add(section, "Actual selected derivation", selectedFormula[descriptor.source] ?? "NOT_CAPTURED");
    add(section, "Selected source inputs (raw; missing = NOT_CAPTURED)", descriptor.inputs);
    add(section, "Profile baseline (before fallback offset)", descriptor.baseline);
    add(section, "Fallback expression (may not have executed)", descriptor.fallbackFormula);
    add(section, "Fallback source score", descriptor.fallbackInput);
    add(section, "Fallback offset USED", descriptor.fallbackOffset === null ? "NOT_APPLICABLE" : descriptor.fallbackOffset);
    add(section, "Final feature value from existing scorecard", actual?.value);
    add(section, "Profile target corridor (inclusive)", actual ? actual.min + " to " + actual.max : "NOT_CAPTURED");
    add(section, "Match percent from existing scorecard", actual?.matchPercent);
    add(section, "Contribution to Streaming Readiness BEFORE ROUNDING (points)",
      typeof actual?.matchPercent === "number" ? Math.round(actual.matchPercent * 0.30 / 7 * 1e6) / 1e6 : "NOT_CAPTURED");
  }

  // Replicate for PROVENANCE ONLY, never supply these values to computeCategoryScores.
  const commercial = scores?.commercialReadiness ?? 75;
  let skipModifier = 0;
  if (live) {
    if (live.calculatedLufs !== undefined && live.calculatedLufs < -12.5)
      skipModifier += Math.round(Math.abs(live.calculatedLufs + 12.5) * 1.8);
    if (live.calculatedStereoCorrelation !== undefined && live.calculatedStereoCorrelation < -0.15)
      skipModifier += 14;
  }
  const skip = Math.min(85, Math.max(0, 91 - Math.round(commercial * 0.70 + production * 0.20) + skipModifier));
  const completion = Math.min(100, Math.max(15, 100 - skip));
  const validMatches = actualScorecard.map(x => x.matchPercent ?? 0);
  const matchAverage = validMatches.length ? validMatches.reduce((sum, x) => sum + x, 0) / validMatches.length : 75;
  const preCap = Math.round(completion * 0.40 + matchAverage * 0.30 + commercial * 0.30);
  const postCap = verifiedFinishCeiling === null ? preCap : Math.min(preCap, verifiedFinishCeiling);
  const group = "Streaming Readiness Lineage";
  add(group, "Original input Engagement Power", n(scores?.commercialReadiness));
  add(group, "Original input Production Index", n(scores?.overallProduction));
  add(group, "Effective input Engagement Power (default 75 if missing)", commercial);
  add(group, "Effective input Production Index (default 75 if missing)", production);
  add(group, "Estimated skip modifier (LUFS / negative stereo correlation)", skipModifier);
  add(group, "Estimated skip probability", skip);
  add(group, "Estimated completion rate", completion);
  add(group, "Completion weighted contribution (40%; points)", Math.round(completion * .40 * 1e6)/1e6);
  add(group, "Seven-dimension profile match unrounded", matchAverage);
  add(group, "Profile match weighted contribution (30%; points)", Math.round(matchAverage * .30 * 1e6)/1e6);
  add(group, "Engagement weighted contribution (30%; points)", Math.round(commercial * .30 * 1e6)/1e6);
  add(group, "Weighted total BEFORE ROUNDING", Math.round((completion * .40 + matchAverage * .30 + commercial * .30)*1e6)/1e6);
  add(group, "Rounded Streaming Readiness BEFORE verified-finish cap", preCap);
  add(group, "Verified-finish ceiling applied", verifiedFinishCeiling === null ? "NONE" : verifiedFinishCeiling);
  add(group, "Replayed Streaming Readiness AFTER cap", postCap);
  add(group, "Actual unchanged exported Streaming Readiness", actualSummary?.streamingReadiness);
  add(group, "Diagnostic arithmetic parity",
    actualSummary && postCap === actualSummary.streamingReadiness ? "MATCH"
      : "REVIEW_REPLAY_MISMATCH_OR_MISSING_VALUE");
  add(group, "Interpretation",
    "Genre compatibility is an estimated profile match, NOT a verified streaming-platform measurement; audio-feature paths can reuse other YSS scores and contain modulo discontinuities.");
  return rows;
}

/** Assertion audit only: model text cues are uncertain, never factual ground truth. */
export function inspectA2VocalLayerEvidence(critique: any): {
  status: "PRESENT_SINGLE_PASS_UNVERIFIED" | "ABSENT_SINGLE_PASS_UNVERIFIED" | "NOT_CAPTURED";
  crossPassFlag: string;
  crossPassSignals: string[];
} {
  const presence = critique?.subMetricsCall3?.vocalTrackingSubs?.vocalLayerFit?.backingVocalLayersPresent;
  const status = presence === true ? "PRESENT_SINGLE_PASS_UNVERIFIED" :
    presence === false ? "ABSENT_SINGLE_PASS_UNVERIFIED" : "NOT_CAPTURED";
  // The main critique is a separate model operation. Its vocal and stereo
  // descriptions can each mention backing layers. Never use Call 3's own
  // vocal-layer commentary to corroborate its presence decision.
  const mainVocal = say(critique?.performance?.vocalsCritique);
  const mainStereo = say(critique?.mixQuality?.stereoField);
  const layerCue = /\bback(?:ing|ground)\s+(?:vocals?|harmon(?:y|ies))\b|\bvocal\s+harmon(?:y|ies)\b|\b(?:vocal|voice)\s+doubl(?:ing|ed|es?)\b|\bdoubl(?:ed|ing)\s+vocals?\b|\b(?:stacked|layered)\s+vocals?\b|\bchoir\b|\bmultiple\s+vocal\s+(?:voices|layers)\b/gi;
  // Hedged language is not a positive or negative assertion. Otherwise "there may
  // be backing vocals" spuriously contradicts a definite Call 3 absence result.
  const speculativeAt = (clause: string, start: number, end: number): boolean => {
    const near = (clause.slice(Math.max(0, start - 95), start).match(/\b[\w'-]+\b/g) || []).slice(-6).join(" ");
    const after = clause.slice(end, end + 45);
    return /\b(?:may|might|could|perhaps|possibly|potentially|seems?|appears?|suggests?|suspected|maybe)\b/i.test(near) ||
      /^\W*(?:(?:is|are|was|were)\s+)?(?:maybe|possibly|perhaps|potentially|may|might|could|uncertain)\b/i.test(after);
  };
  const inspectField = (source: string) => {
    let affirmed = false;
    let denied = false;
    for (const clause of clauses(source)) {
      for (const match of clause.matchAll(layerCue)) {
        const start = match.index ?? 0;
        if (speculativeAt(clause, start, start + match[0].length)) continue;
        if (deniedAt(clause, start, start + match[0].length)) denied = true;
        else affirmed = true;
      }
    }
    return { affirmed, denied };
  };
  const vocal = inspectField(mainVocal);
  const stereo = inspectField(mainStereo);
  const affirmed = vocal.affirmed || stereo.affirmed;
  const denied = vocal.denied || stereo.denied;
  const crossPassSignals = [
    ...(vocal.affirmed ? ["MAIN_CRITIQUE_DESCRIBES_BACKING_LAYERS"] : []),
    ...(vocal.denied ? ["MAIN_CRITIQUE_EXPLICITLY_DENIES_BACKING_LAYERS"] : []),
    ...(stereo.affirmed ? ["MAIN_STEREO_DESCRIBES_BACKING_LAYERS"] : []),
    ...(stereo.denied ? ["MAIN_STEREO_EXPLICITLY_DENIES_BACKING_LAYERS"] : []),
  ];
  const crossPassFlag = status === "NOT_CAPTURED" || (!affirmed && !denied)
    ? "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE"
    : affirmed && denied ? "AMBIGUOUS_CROSS_PASS_LAYER_DESCRIPTIONS"
    : (presence === false && affirmed) || (presence === true && denied)
      ? "REVIEW_CONFLICTING_LAYER_ASSERTIONS"
      : "NO_DETERMINISTIC_LAYER_CONTRADICTION_FLAG";
  return {status, crossPassFlag, crossPassSignals};
}

/**
 * Captured after model calls, genre-pair normalization and Call 3's vocal
 * applicability gate, but before parent-score reconciliation and browser DSP edits.
 * Serialize only allow-listed codes. A frozen in-memory object detaches this
 * immutable historical record from all subsequently mutable critique fields.
 */
export function captureA2OriginalAssertionSnapshot(critique: any): Readonly<{
  version: 1;
  captureStage: "SERVER_PRE_RECONCILIATION";
  originalGenreFlag: string;
  originalVocalTrackGenreFlag: string;
  originalGenreSignals: readonly string[];
  originalMidrangeFlag: string;
  originalMidrangeSignals: readonly string[];
  originalMidrangeTier: string;
  vocalLayerEvidenceStatus: string;
  vocalLayerCrossPassFlag: string;
  vocalLayerCrossPassSignals: readonly string[];
}> {
  const narrative = inspectA2NarrativeConflicts(critique);
  const layer = inspectA2VocalLayerEvidence(critique);
  const tier = critique?.subMetricsCall1?.midrangeSpacing?.qualityTier;
  const tierCodes = ["REFERENCE", "EXCEPTIONAL", "ABOVE_AVERAGE",
    "PROFESSIONAL_HIGH", "PROFESSIONAL", "LIMITED", "MATERIAL_ISSUE", "SEVERE"];
  const snapshot = {
    version: 1 as const,
    captureStage: "SERVER_PRE_RECONCILIATION" as const,
    originalGenreFlag: narrative.genreFlag,
    originalVocalTrackGenreFlag: critique?.performance?.vocalApplicable === true
      ? narrative.genreFlag : "NOT_CONFIRMED_VOCAL_TRACK",
    originalGenreSignals: Object.freeze([...narrative.genreSignals]),
    originalMidrangeFlag: narrative.midrangeFlag,
    originalMidrangeSignals: Object.freeze([...narrative.midrangeSignals]),
    originalMidrangeTier: typeof tier === "string" && tierCodes.includes(tier) ? tier : "NOT_CAPTURED",
    vocalLayerEvidenceStatus: layer.status,
    vocalLayerCrossPassFlag: layer.crossPassFlag,
    vocalLayerCrossPassSignals: Object.freeze([...layer.crossPassSignals]),
  };
  return Object.freeze(snapshot);
}
