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
