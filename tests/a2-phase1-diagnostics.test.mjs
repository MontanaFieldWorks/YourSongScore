import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeEngineeringDiagnosticsInWorker } from "../src/lib/batchAudioWorker.ts";
import ExcelJS from "exceljs";
import { analyzeStage1aMeterReference, analyzeStage2aSpectralPower, analyzeStage2b1LowFrequency, analyzeStage2b2Stereo, assembleStage2c1EngineeringEvidence, interpretStage2d1EngineeringEvidence, interpretStage2d3CrossMeasurementEvidence, runStage2c2aBrowserDiagnostics } from "../src/lib/liveAudioAnalyzer.ts";
import { appendA2ProvenanceToSourceDiagnostics } from "../src/lib/a2ScoringProvenance.ts";
import {
  describeLowEndGateFactors,
  inspectA2NarrativeConflicts,
  inspectA2VocalLayerEvidence,
  classifyA2VocalLayerAssertionSupport,
  getStreamingReadinessLineageRows,
  captureA2OriginalAssertionSnapshot,
  getSourceVerificationRows,
} from "../src/lib/sourceVerificationDiagnostics.ts";

const sourceEvidence = (kind, name, cue) =>
  typeof cue === "string" && cue.length >= 12 &&
  (kind === "KICK_DRUM" ? /\b(kick|bass drum)\b/i.test(name || "") :
   kind === "BASS_DRUM" ? /\bbass drum\b/i.test(name || "") :
   kind === "OTHER_NAMED_LOW_PERCUSSION");

const first = {
  kickLikePercussionRolePresent: true,
  lowTransientCertainty: "CLEAR",
  lowEndRolesIndependent: true,
  lowTransientSourceType: "KICK_DRUM",
  lowTransientSourceName: "kick drum",
  lowTransientAudibleCue: "A distinctly unpitched thud from the kick drum.",
  sustainedBassRolePresent: true,
  bassFoundationSourceType: "DEDICATED_BASS_INSTRUMENT",
};
const second = {
  percussionCertainty: "CLEAR",
  rolesIndependent: true,
  percussionType: "KICK_DRUM",
  percussionSourceName: "kick drum",
  percussionAudibleCue: "Clearly unpitched, separate kick drum impact.",
  bassFoundationType: "DEDICATED_BASS_INSTRUMENT",
};

const values = rows => Object.fromEntries(rows.map(row => [row.section + "/" + row.field, row.value]));

test("all twenty-five independent and source-validity checks pass for corroborated sources", () => {
  const before1 = structuredClone(first), before2 = structuredClone(second);
  const result = describeLowEndGateFactors(first, second, sourceEvidence);
  assert.equal(Object.keys(result.factors).length, 25);
  assert.ok(Object.values(result.factors).every(x => x === true));
  assert.deepEqual(result.failedChecks, []);
  assert.deepEqual(first, before1); assert.deepEqual(second, before2);
});
test("exact reason records independence failure despite matching drum and bass types", () => {
  const result = describeLowEndGateFactors(first, {...second, rolesIndependent: false}, sourceEvidence);
  assert.equal(result.factors.SECOND_PASS_PERCUSSION_TYPE_MATCH, true);
  assert.equal(result.factors.SECOND_PASS_BASS_TYPE_MATCH, true);
  assert.deepEqual(result.failedChecks, ["SECOND_PASS_ROLES_INDEPENDENT"]);
});
test("named percussion/cue failure is reported separately from source types", () => {
  const result = describeLowEndGateFactors(first, {...second, percussionSourceName: "low pulse"}, sourceEvidence);
  assert.equal(result.factors.SECOND_PASS_PERCUSSION_TYPE_MATCH, true);
  assert.ok(result.failedChecks.includes("SECOND_PASS_NAMED_PERCUSSION_EVIDENCE_VALID"));
  assert.ok(result.failedChecks.includes("SECOND_PASS_SOURCE_NAME_SPECIFIC"));
  assert.ok(result.failedChecks.includes("SECOND_PASS_SOURCE_NAME_MATCHES_PERCUSSION_TYPE"));
  assert.equal(result.failedChecks.includes("SECOND_PASS_PERCUSSION_TYPE_MATCH"), false);
});
test("cue that is too short is diagnosed without changing the positive source-name match", () => {
  const got = describeLowEndGateFactors(first, {...second, percussionAudibleCue:"short"}, sourceEvidence);
  assert.ok(got.failedChecks.includes("SECOND_PASS_NAMED_PERCUSSION_EVIDENCE_VALID"));
  assert.ok(got.failedChecks.includes("SECOND_PASS_AUDIBLE_CUE_AT_LEAST_12_CHARS"));
  assert.equal(got.factors.SECOND_PASS_SOURCE_NAME_MATCHES_PERCUSSION_TYPE, true);
});
test("absent audit fields are NOT_CAPTURED not inferred a source mismatch", () => {
  const result = describeLowEndGateFactors(first, null, sourceEvidence);
  assert.deepEqual(result.failedChecks, ["SECOND_PASS_AVAILABLE"]);
  assert.equal(result.factors.SECOND_PASS_PERCUSSION_TYPE_MATCH, null);
});

const genreAndMask = {
  vibe: {genre: "Folk / Singer-Songwriter",subgenre:"Folk Rock"},
  subMetricsCall1: {
    dynamicVariety: {commentary:"Electric guitars introduce bigger choruses, with active drumming and a guitar solo."},
    midrangeSpacing: {commentary:"There is no significant blurring or masking even in the denser chorus."},
  },
  mixQuality: {frequencyBalance:{midrange:"The distorted electric guitars can lead to some masking, particularly affecting vocal clarity."}},
};
test("Boston-like genre and masking contradictions are review flags, not new scores", () => {
  const input = structuredClone(genreAndMask);
  const got = inspectA2NarrativeConflicts(input);
  assert.equal(got.genreFlag, "REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE");
  assert.equal(got.midrangeFlag, "REVIEW_PARENT_CHILD_MASKING_CONTRADICTION");
  assert.deepEqual(input, genreAndMask);
});
test("flags do not force a genre verdict on a folk acoustic song", () => {
  const got = inspectA2NarrativeConflicts({
    vibe: {genre:"Folk / Singer-Songwriter",subgenre:"Contemporary Folk"},
    subMetricsCall1:{dynamicVariety:{commentary:"Sparse acoustic guitar and vocal, no drum kit."}},
    mixQuality:{frequencyBalance:{midrange:"Clear balance between acoustic guitar and vocal."}},
  });
  assert.equal(got.genreFlag,"NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.equal(got.midrangeFlag,"INSUFFICIENT_NARRATIVE_EVIDENCE");
});
test("midrange assertion absent does not invent a contradiction", () => {
  const got = inspectA2NarrativeConflicts({
    ...genreAndMask,
    mixQuality:{frequencyBalance:{midrange:"Guitars and vocals are clear."}},
  });
  assert.equal(got.midrangeFlag,"NO_DETERMINISTIC_CONTRADICTION_FLAG");
});
test("legacy reports distinguish missing diagnostics from negative findings", () => {
  const got=values(getSourceVerificationRows({}));
  assert.equal(got["Low-End Division/Precise gate checks captured"],"NOT_CAPTURED");
  assert.equal(got["A2 Key Detection/Browser provenance captured"],"NOT_CAPTURED");
  assert.equal(got["A2 Key Detection/Server key provenance captured"],"NOT_CAPTURED");
  assert.equal(got["Midrange Consistency/Parent/child review flag (not scored)"],"INSUFFICIENT_NARRATIVE_EVIDENCE");
  assert.equal(got["Genre Consistency/Evidence-only review flag (not scored)"],"INSUFFICIENT_GENRE_OR_INSTRUMENT_EVIDENCE");
});
test("negated electric guitars, drums, and guitar solo never trigger a false Folk/Rock review", () => {
  const input = {
    vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"},
    subMetricsCall1:{dynamicVariety:{commentary:
      "There are no electric guitars, no drums and no distorted leads or guitar solo."}},
    mixQuality:{frequencyBalance:{midrange:
      "An acoustic guitar and solo vocal stay balanced, without distortion or masking."}},
  };
  const before=structuredClone(input);
  const got=inspectA2NarrativeConflicts(input);
  assert.equal(got.genreFlag,"NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.deepEqual(got.genreSignals,["FOLK_FAMILY_OR_SUBGENRE"]);
  assert.deepEqual(input,before);
});
test("explicit instrument absence after a noun is not treated as rock evidence", () => {
  const input={
    vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Contemporary Folk"},
    subMetricsCall1:{spaceAndDensity:{commentary:
      "Electric guitars are absent; drums are not audible; the guitar solo is missing."}},
  };
  const got=inspectA2NarrativeConflicts(input);
  assert.equal(got.genreFlag,"NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.deepEqual(got.genreSignals,["FOLK_FAMILY_OR_SUBGENRE"]);
});
test("qualified positive instruments after 'but' remain reviewable", () => {
  const input={
    vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"},
    subMetricsCall1:{dynamicVariety:{commentary:
      "No electric guitars in the intro, but distorted electric guitars, drums and a guitar solo drive the chorus."}},
  };
  assert.equal(inspectA2NarrativeConflicts(input).genreFlag,
    "REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE");
});
test("absence language in one model commentary cannot negate a different source's positive cues", () => {
  const input={
    vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"},
    subMetricsCall1:{
      dynamicVariety:{commentary:"There are no acoustic drum fills."},
      spaceAndDensity:{commentary:"Distorted electric guitars and kick drums drive the chorus with a guitar solo."},
    },
  };
  assert.equal(inspectA2NarrativeConflicts(input).genreFlag,
    "REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE");
});
test("parent denial of masking does not conflict with child denial", () => {
  const input={
    mixQuality:{frequencyBalance:{midrange:"There is no significant masking of lead vocal or guitars."}},
    subMetricsCall1:{midrangeSpacing:{commentary:"There is no significant blurring or masking."}},
  };
  const got=inspectA2NarrativeConflicts(input);
  assert.equal(got.midrangeFlag,"NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.deepEqual(got.midrangeSignals,["CHILD_DENIES_SIGNIFICANT_MASKING"]);
});
test("parent 'do not mask' or 'without masking' claims cannot be positive masking evidence", () => {
  for (const parent of [
    "The guitars do not mask the lead vocal.",
    "A polished mix without masking of vocal clarity.",
    "This approach prevents masking in the midrange.",
    "The vocal is not masked by the guitars.",
  ]) {
    const input={
      mixQuality:{frequencyBalance:{midrange:parent}},
      subMetricsCall1:{midrangeSpacing:{commentary:"No significant masking between lead and guitars."}},
    };
    const got=inspectA2NarrativeConflicts(input);
    assert.equal(got.midrangeFlag,"NO_DETERMINISTIC_CONTRADICTION_FLAG",parent);
  }
});
test("positive Boston parent masking and separately negated child masking remain flagged", () => {
  for (const child of [
    "There is no significant blurring or masking in the dense chorus.",
    "The lead vocal is not masked by distorted guitars.",
    "Vocals remain clear without any masking from the guitars.",
  ]) {
    const input={
      mixQuality:{frequencyBalance:{midrange:"Distorted guitars can lead to some masking of vocal clarity."}},
      subMetricsCall1:{midrangeSpacing:{commentary:child}},
    };
    assert.equal(inspectA2NarrativeConflicts(input).midrangeFlag,
      "REVIEW_PARENT_CHILD_MASKING_CONTRADICTION",child);
  }
});
test("missing genre and instrumentation are distinguished from a checked non-conflict", () => {
  for(const input of [
    {},
    {vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"}},
    {vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"},
      subMetricsCall1:{dynamicVariety:{commentary:"Warm and cinematic; uplifting mood."}}},
    {subMetricsCall1:{dynamicVariety:{commentary:"Electric guitars and drums with distortion."}}},
  ]) {
    const got=inspectA2NarrativeConflicts(input);
    assert.equal(got.genreFlag,"INSUFFICIENT_GENRE_OR_INSTRUMENT_EVIDENCE");
  }
  const present={
    vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Contemporary Folk"},
    subMetricsCall1:{spaceAndDensity:{commentary:"Acoustic guitar and solo vocal, no drums."}},
  };
  assert.equal(inspectA2NarrativeConflicts(present).genreFlag,
    "NO_DETERMINISTIC_CONTRADICTION_FLAG");
});
test("legacy Source Diagnostics marks missing genre evidence, with no score mutation", () => {
  const legacy={vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"}};
  const before=structuredClone(legacy);
  const rows=values(getSourceVerificationRows(legacy));
  assert.equal(rows["Genre Consistency/Evidence-only review flag (not scored)"],
    "INSUFFICIENT_GENRE_OR_INSTRUMENT_EVIDENCE");
  assert.equal(rows["Genre Consistency/Matched existing model descriptions"],
    "FOLK_FAMILY_OR_SUBGENRE");
  assert.deepEqual(legacy,before);
});
test("simulated ExcelJS export preserves missing/negated flags without inventing genre evidence", async() => {
  const critique={
    vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"},
    subMetricsCall1:{dynamicVariety:{commentary:"No electric guitars and no drum kit or distorted guitar solo."},
      midrangeSpacing:{commentary:"No significant masking."}},
    mixQuality:{frequencyBalance:{midrange:"No significant masking of lead vocals."}},
  };
  const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet("Source Diagnostics");
  sheet.columns=[{header:"Metric",key:"section"},{header:"Diagnostic field",key:"field"},
    {header:"Recorded evidence / decision",key:"value"}];
  for(const row of getSourceVerificationRows(critique)) sheet.addRow(row);
  const disk=await wb.xlsx.writeBuffer();
  const checked=new ExcelJS.Workbook(); await checked.xlsx.load(disk);
  const found=[];
  checked.getWorksheet("Source Diagnostics").eachRow((row,i)=>{
    if(i>1) found.push({section:String(row.getCell(1).value),field:String(row.getCell(2).value),value:String(row.getCell(3).value)});
  });
  const v=values(found);
  assert.equal(v["Genre Consistency/Evidence-only review flag (not scored)"],
    "NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.equal(v["Midrange Consistency/Parent/child review flag (not scored)"],
    "NO_DETERMINISTIC_CONTRADICTION_FLAG");
});
test("browser and server key provenance distinguishes detector estimate and constrained model echo", () => {
  const critique={
    ...genreAndMask,
    liveMetrics:{a2KeyDetectionProvenance:{
      detector:"ESSENTIA_JS_KEYEXTRACTOR_MONO",status:"DETECTED",estimatedKey:"F major",
      rawStrength:0.936,payloadKeyIncluded:true}},
    a2KeyServerProvenance:{receivedDetectedKey:"F major",
      mainCritiqueKeyConstrained:true,chordCallKeyConstrained:true,
      constrainedChordResponseKey:"F major",serverReappliedKey:true},
  };
  const before=structuredClone(critique);
  const got=values(getSourceVerificationRows(critique));
  assert.equal(got["A2 Key Detection/Browser estimated key"],"F major");
  assert.equal(got["A2 Key Detection/Raw detector strength (NOT confidence)"],"0.936");
  assert.equal(got["A2 Key Detection/Detected key included in upload"],"true");
  assert.equal(got["A2 Key Detection/Chord call constrained by supplied key"],"true");
  assert.equal(got["Genre Consistency/Evidence-only review flag (not scored)"],"REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE");
  assert.deepEqual(critique,before);
});
test("real ExcelJS simulated Source Diagnostics export preserves all rows, note, and sanitized content", async () => {
  const critique={
    ...genreAndMask,
    subMetricsCall1:{...genreAndMask.subMetricsCall1,
      lowEndDivision:{applicable:false,commentary:"Diagnostic N/A",
        sourceVerification:{
          firstPassPercussionType:"KICK_DRUM",secondPassPercussionType:"KICK_DRUM",
          firstPassBassType:"DEDICATED_BASS_INSTRUMENT",secondPassBassType:"DEDICATED_BASS_INSTRUMENT",
          gateFactors:describeLowEndGateFactors(first,{...second, rolesIndependent:false},sourceEvidence).factors,
          firstPassPercussionName:"kick drum",secondPassPercussionName:"kick drum",
          firstPassPercussionCertainty:"CLEAR",secondPassPercussionCertainty:"CLEAR",
          firstPassRolesIndependent:true,secondPassRolesIndependent:false,
          specificRejectionReasons:["SECOND_PASS_ROLES_INDEPENDENT"],
          corroborated:false,rejectionReasons:["LISTENING_PASSES_DISAGREE"],
        }},
      a2ScoringProvenance:{
        spaceAndDensity:{rawEvidenceAccess:"RESTRICTED_INTERNAL_ONLY",
          rawCommentary:"UNSANITIZED_INTERNAL_MODEL_SECRET",
          rawQualityTier:"UNSANITIZED_INTERNAL_MODEL_SECRET"},
        midrangeSpacing:{rawEvidenceAccess:"RESTRICTED_INTERNAL_ONLY",
          rawCommentary:"UNSANITIZED_INTERNAL_MODEL_SECRET"},
      },
    },
    liveMetrics:{a2KeyDetectionProvenance:{detector:"ESSENTIA_JS_KEYEXTRACTOR_MONO",status:"DETECTED",
      estimatedKey:"F major",rawStrength:0.936,payloadKeyIncluded:true}},
    a2KeyServerProvenance:{receivedDetectedKey:"F major",mainCritiqueKeyConstrained:true,
      chordCallKeyConstrained:true,constrainedChordResponseKey:"F major",serverReappliedKey:true},
  };
  const before=structuredClone(critique);
  const report=new ExcelJS.Workbook();
  const ws=report.addWorksheet("Source Diagnostics");
  ws.columns=[{header:"Metric",key:"section"},{header:"Diagnostic field",key:"field"},{header:"Recorded evidence / decision",key:"value"}];
  for (const row of getSourceVerificationRows(critique)) ws.addRow(row);
  const noteIndex=ws.rowCount+1;
  ws.getCell("A"+noteIndex).value="NOT_CAPTURED means missing provenance, not proof of absence.";
  ws.mergeCells("A"+noteIndex+":C"+noteIndex);
  // Exercise the exact A2 provenance append function used in the production workbook.
  appendA2ProvenanceToSourceDiagnostics(ws, critique);
  const bytes=await report.xlsx.writeBuffer();
  const loaded=new ExcelJS.Workbook();
  await loaded.xlsx.load(bytes);
  const out=loaded.getWorksheet("Source Diagnostics");
  const restored=[];
  out.eachRow((row,index) => {if(index>1&&index<noteIndex) restored.push({section:String(row.getCell(1).value),
    field:String(row.getCell(2).value),value:String(row.getCell(3).value)});});
  const got=values(restored);
  assert.equal(got["Low-End Division/Gate check: SECOND_PASS_ROLES_INDEPENDENT"],"false");
  assert.equal(got["Low-End Division/Second-pass role independence"],"false");
  assert.equal(got["Low-End Division/Second-pass named percussion source"],"kick drum");
  assert.equal(got["Low-End Division/Precise failed checks"],"SECOND_PASS_ROLES_INDEPENDENT");
  assert.equal(got["Midrange Consistency/Parent/child review flag (not scored)"],"REVIEW_PARENT_CHILD_MASKING_CONTRADICTION");
  assert.equal(got["A2 Key Detection/Server-received detected key"],"F major");
  assert.match(String(out.getCell("A"+noteIndex).value),/NOT_CAPTURED/);
  assert.ok(noteIndex>23,"note is located after expanded diagnostics");
  assert.deepEqual(critique,before);
  const all=JSON.stringify(restored);
  assert.doesNotMatch(all,/UNSANITIZED_INTERNAL_MODEL_SECRET|rawQualityTier|rawCommentary/i);
  assert.doesNotMatch(JSON.stringify(loaded.getWorksheet("Source Diagnostics").getSheetValues()),
    /UNSANITIZED_INTERNAL_MODEL_SECRET/);

});
test("A2 original assertion snapshot flags Boston-style vocal Folk and midrange conflicts without changing critique", () => {
  const critique = {
    ...structuredClone(genreAndMask),
    performance: {
      vocalApplicable: true,
      vocalsCritique: "Layered backing harmonies blend with the lead in the chorus.",
    },
    subMetricsCall3: {vocalTrackingSubs: {vocalLayerFit: {
      applicable:false, qualityTier:"PROFESSIONAL_HIGH",
      backingVocalLayersPresent:false, commentary:"No distinct backing layers are audible.",
    }}},
  };
  const before=structuredClone(critique);
  const snapshot=captureA2OriginalAssertionSnapshot(critique);
  assert.deepEqual(critique,before);
  assert.equal(snapshot.captureStage,"SERVER_PRE_RECONCILIATION");
  assert.equal(snapshot.version,1);
  assert.equal(snapshot.originalVocalTrackGenreFlag,"REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE");
  assert.equal(snapshot.originalGenreFlag,"REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE");
  assert.equal(snapshot.originalMidrangeFlag,"REVIEW_PARENT_CHILD_MASKING_CONTRADICTION");
  assert.equal(snapshot.originalMidrangeTier,"NOT_CAPTURED"); // Unspecified in this fixture.
  assert.equal(snapshot.vocalLayerEvidenceStatus,"ABSENT_SINGLE_PASS_UNVERIFIED");
  assert.equal(snapshot.vocalLayerCrossPassFlag,"REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  assert.deepEqual(snapshot.vocalLayerCrossPassSignals,["MAIN_CRITIQUE_DESCRIBES_BACKING_LAYERS"]);
  assert.equal(Object.isFrozen(snapshot),true);
  assert.equal(Object.isFrozen(snapshot.originalGenreSignals),true);
  assert.equal(Object.isFrozen(snapshot.originalMidrangeSignals),true);
  assert.equal(Object.isFrozen(snapshot.vocalLayerCrossPassSignals),true);
});

test("T01_B-style Rock plus Call 3 backing layers produces single-pass status, no invented disagreement", () => {
  const critique={
    vibe:{genre:"Rock",subgenre:"Heritage Rock / Mainstream Rock"},
    performance:{vocalApplicable:true,vocalsCritique:"The backing harmonies lift the chorus."},
    subMetricsCall1:{spaceAndDensity:{commentary:"Electric guitars, drum kit and driving bass in a dense chorus."},
      midrangeSpacing:{qualityTier:"PROFESSIONAL_HIGH",commentary:"Elements are broadly clear."}},
    mixQuality:{frequencyBalance:{midrange:"Strong low-mid energy remains noticeable."}},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:true,
      applicable:true,qualityTier:"PROFESSIONAL_HIGH"}}},
  };
  const snapshot=captureA2OriginalAssertionSnapshot(critique);
  assert.equal(snapshot.originalVocalTrackGenreFlag,"NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.equal(snapshot.originalMidrangeTier,"PROFESSIONAL_HIGH");
  assert.equal(snapshot.vocalLayerEvidenceStatus,"PRESENT_SINGLE_PASS_UNVERIFIED");
  assert.equal(snapshot.vocalLayerCrossPassFlag,"NO_DETERMINISTIC_LAYER_CONTRADICTION_FLAG");
  assert.deepEqual(snapshot.vocalLayerCrossPassSignals,["MAIN_CRITIQUE_DESCRIBES_BACKING_LAYERS"]);
});

test("the main critique, not a Call 3 self-justification, is the independent vocal-layer reference", () => {
  const input={
    performance:{vocalsCritique:"The lead voice is steady and clear."},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{
      backingVocalLayersPresent:true,commentary:"Backing harmonies lift the chorus."}}},
  };
  assert.equal(inspectA2VocalLayerEvidence(input).crossPassFlag,
    "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE");
});

test("explicit cross-pass denial conflicts with positive Call 3, but matched absence does not", () => {
  const make = presence => ({
    performance:{vocalsCritique:"There are no backing vocals or vocal harmonies."},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:presence}}},
  });
  assert.equal(inspectA2VocalLayerEvidence(make(true)).crossPassFlag,
    "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  const negative=inspectA2VocalLayerEvidence(make(false));
  assert.equal(negative.crossPassFlag,"NO_DETERMINISTIC_LAYER_CONTRADICTION_FLAG");
  assert.deepEqual(negative.crossPassSignals,["MAIN_CRITIQUE_EXPLICITLY_DENIES_BACKING_LAYERS"]);
  assert.equal(negative.status,"ABSENT_SINGLE_PASS_UNVERIFIED");
});

test("postposed absence is recognized, while speculative language is insufficient", () => {
  const make=phrase=>({
    performance:{vocalsCritique:phrase},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:true}}},
  });
  assert.equal(inspectA2VocalLayerEvidence(make("Backing vocals are absent.")).crossPassFlag,
    "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  assert.equal(inspectA2VocalLayerEvidence(make("The lead may perhaps be doubled.")).crossPassFlag,
    "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE");
  // An ambiguous cross-pass statement is not interpreted as ground truth.
  assert.equal(inspectA2VocalLayerEvidence(make("There are no backing vocals; yet backing harmonies rise in the chorus.")).crossPassFlag,
    "AMBIGUOUS_CROSS_PASS_LAYER_DESCRIPTIONS");
});

test("hedged backing-layer language never becomes a categorical cross-pass assertion", () => {
  const uncertain = [
    "There may be backing harmonies behind the lead.",
    "Possibly backing vocals enter in the chorus.",
    "Backing vocals might be present in the chorus.",
    "The mix suggests vocal doubling in spots.",
    "Vocal harmonies are perhaps audible.",
    "There might be no backing vocals at all.",
    "The singer may not have backing vocals.",
  ];
  for (const phrase of uncertain) {
    for (const present of [true, false]) {
      const input = {
        performance: { vocalsCritique: phrase },
        subMetricsCall3: { vocalTrackingSubs: { vocalLayerFit: { backingVocalLayersPresent: present } } },
      };
      const got = inspectA2VocalLayerEvidence(input);
      assert.equal(got.crossPassFlag, "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE", phrase);
      assert.deepEqual(got.crossPassSignals, [], phrase);
    }
  }
  const definite = {
    performance: { vocalsCritique: "The chorus clearly features backing harmonies." },
    subMetricsCall3: { vocalTrackingSubs: { vocalLayerFit: { backingVocalLayersPresent: false } } },
  };
  assert.equal(inspectA2VocalLayerEvidence(definite).crossPassFlag,
    "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
});

test("legacy missing Call 3 and solo-vocal cases never invent a confirmed presence decision", () => {
  assert.equal(inspectA2VocalLayerEvidence({}).status,"NOT_CAPTURED");
  assert.equal(inspectA2VocalLayerEvidence({}).crossPassFlag,
    "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE");
  const solo={performance:{vocalApplicable:true,vocalsCritique:"No backing vocals."},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:false,applicable:false,score:0}}}};
  const before=structuredClone(solo);
  assert.equal(captureA2OriginalAssertionSnapshot(solo).vocalLayerEvidenceStatus,
    "ABSENT_SINGLE_PASS_UNVERIFIED");
  assert.equal(solo.subMetricsCall3.vocalTrackingSubs.vocalLayerFit.applicable,false);
  assert.equal(solo.subMetricsCall3.vocalTrackingSubs.vocalLayerFit.score,0);
  assert.deepEqual(solo,before);
});

test("known instrumental, missing vocalist status, and missing instrument evidence remain unverified", () => {
  const make=vocalApplicable=>({
    performance:{vocalApplicable},
    vibe:{genre:"Folk / Singer-Songwriter",subgenre:"Folk Rock"},
    subMetricsCall1:{midrangeSpacing:{qualityTier:"PROFESSIONAL_HIGH"}},
  });
  for(const input of [make(false),make(undefined)]) {
    const v=captureA2OriginalAssertionSnapshot(input);
    assert.equal(v.originalVocalTrackGenreFlag,"NOT_CONFIRMED_VOCAL_TRACK");
    assert.equal(v.originalGenreFlag,"INSUFFICIENT_GENRE_OR_INSTRUMENT_EVIDENCE");
    assert.equal(v.originalMidrangeFlag,"INSUFFICIENT_NARRATIVE_EVIDENCE");
  }
});

test("original snapshot survives browser DSP overwrites of child and parent commentary", () => {
  const critique={...structuredClone(genreAndMask),
    performance:{vocalApplicable:true,vocalsCritique:"The chorus contains layered backing harmonies."},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:false,score:0,applicable:false}}},
  };
  critique.subMetricsCall1.midrangeSpacing.qualityTier="PROFESSIONAL_HIGH";
  critique.subMetricsCall1.midrangeSpacing.score=88;
  critique.a2OriginalAssertionSnapshot=captureA2OriginalAssertionSnapshot(critique);
  const frozenCopy=structuredClone(critique.a2OriginalAssertionSnapshot);
  critique.subMetricsCall1.midrangeSpacing.score=76;
  critique.subMetricsCall1.midrangeSpacing.commentary="The measured midrange is congested; masking is audible.";
  critique.mixQuality.frequencyBalance.midrange="The measured midrange is constricted.";
  const rows=values(getSourceVerificationRows(critique));
  assert.equal(rows["A2 Original Assertions/Original parent/child midrange review flag (not scored)"],
    "REVIEW_PARENT_CHILD_MASKING_CONTRADICTION");
  assert.equal(rows["Midrange Consistency/Parent/child review flag (not scored)"],
    "NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.equal(rows["A2 Original Assertions/Original model Midrange Spacing qualityTier"],
    "PROFESSIONAL_HIGH");
  assert.equal(rows["A2 Original Assertions/Original vocal-layer cross-pass review flag (not scored)"],
    "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  assert.deepEqual(critique.a2OriginalAssertionSnapshot,frozenCopy);
  assert.equal(critique.subMetricsCall1.midrangeSpacing.score,76);
});

test("real legacy critique has no original snapshot, even when current consistency flags are available", () => {
  const old={...structuredClone(genreAndMask),
    performance:{vocalApplicable:true,vocalsCritique:"Strong lead singer with harmonies."},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:false,applicable:false,score:0}}},
  };
  const rows=values(getSourceVerificationRows(old));
  assert.equal(rows["Genre Consistency/Evidence-only review flag (not scored)"],
    "REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE");
  assert.equal(rows["A2 Original Assertions/Immutable pre-reconciliation capture"],"NOT_CAPTURED");
  assert.equal(rows["A2 Original Assertions/Original genre review flag (not scored)"],"NOT_CAPTURED");
  assert.equal(rows["A2 Original Assertions/Original vocal-layer presence status (single pass)"],"NOT_CAPTURED");
  assert.equal(rows["A2 Original Assertions/Original parent/child midrange review flag (not scored)"],
    "NOT_CAPTURED");
  assert.equal(rows["Vocal Layer Fit/Current single-pass presence status (not corroborated)"],
    "ABSENT_SINGLE_PASS_UNVERIFIED");
});

test("paired Boston fixtures can compare independent, controlled snapshots without contaminating the server", () => {
  const pair=[
    {fixture:"BOSTON_CLEAN",critique:{...structuredClone(genreAndMask),
      performance:{vocalApplicable:true,vocalsCritique:"Subtle backing harmonies support the chorus."},
      subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:false}}}}},
    {fixture:"T01_B",critique:{
      vibe:{genre:"Rock",subgenre:"Heritage Rock / Mainstream Rock"},
      performance:{vocalApplicable:true,vocalsCritique:"Backing harmonies remain discernible."},
      subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{backingVocalLayersPresent:true}}},
    }},
  ];
  const captured=pair.map(x=>({fixture:x.fixture,snapshot:captureA2OriginalAssertionSnapshot(x.critique)}));
  assert.deepEqual(captured.map(x=>x.snapshot.vocalLayerEvidenceStatus),
    ["ABSENT_SINGLE_PASS_UNVERIFIED","PRESENT_SINGLE_PASS_UNVERIFIED"]);
  assert.deepEqual(captured.map(x=>x.snapshot.originalVocalTrackGenreFlag),
    ["REVIEW_FOLK_LABEL_VS_FULL_BAND_EVIDENCE","INSUFFICIENT_GENRE_OR_INSTRUMENT_EVIDENCE"]);
  // Pair membership is benchmark-only; the runtime helpers accept no track identity.
  const source=String(inspectA2VocalLayerEvidence)+String(captureA2OriginalAssertionSnapshot);
  assert.doesNotMatch(source,/BOSTON_CLEAN|T01_B|More Than a Feeling/i);
});

test("ExcelJS roundtrip exports only controlled original assertion codes and no raw commentary", async()=>{
  const rawMarker="UNSANITIZED_INTERNAL_MODEL_SECRET";
  const critique={
    ...structuredClone(genreAndMask),
    performance:{vocalApplicable:true,vocalsCritique:"Backing harmonies support the chorus."},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{
      backingVocalLayersPresent:false,score:0,applicable:false}}},
  };
  critique.subMetricsCall1.midrangeSpacing.qualityTier="PROFESSIONAL_HIGH";
  critique.a2OriginalAssertionSnapshot=captureA2OriginalAssertionSnapshot(critique);
  critique.subMetricsCall1.a2ScoringProvenance={midrangeSpacing:{
    rawQualityTier:rawMarker,rawCommentary:rawMarker,rawEvidenceAccess:"RESTRICTED_INTERNAL_ONLY"}};
  const original=structuredClone(critique);
  const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet("Source Diagnostics");
  sheet.columns=[{header:"Metric",key:"section"},{header:"Diagnostic field",key:"field"},
    {header:"Recorded evidence / decision",key:"value"}];
  for(const row of getSourceVerificationRows(critique))sheet.addRow(row);
  const note=sheet.rowCount+1;sheet.getCell("A"+note).value="NOT_CAPTURED is missing evidence.";
  sheet.mergeCells("A"+note+":C"+note);
  appendA2ProvenanceToSourceDiagnostics(sheet,critique);
  const bytes=await wb.xlsx.writeBuffer();const read=new ExcelJS.Workbook();await read.xlsx.load(bytes);
  const retrieved=[];read.getWorksheet("Source Diagnostics").eachRow((row,i)=>{
    if(i>1 && i<note)retrieved.push({section:String(row.getCell(1).value),
      field:String(row.getCell(2).value),value:String(row.getCell(3).value)});
  });
  const v=values(retrieved);
  assert.equal(v["A2 Original Assertions/Immutable pre-reconciliation capture"],"PRESENT");
  assert.equal(v["A2 Original Assertions/Original parent/child midrange review flag (not scored)"],
    "REVIEW_PARENT_CHILD_MASKING_CONTRADICTION");
  assert.equal(v["A2 Original Assertions/Original vocal-layer cross-pass review flag (not scored)"],
    "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  assert.equal(v["A2 Original Assertions/Original model Midrange Spacing qualityTier"],
    "PROFESSIONAL_HIGH");
  assert.doesNotMatch(JSON.stringify(read.worksheets.map(w=>w.getSheetValues())),
    /UNSANITIZED_INTERNAL_MODEL_SECRET|rawQualityTier|rawCommentary/i);
  assert.deepEqual(critique,original);
});

test("malformed or attacker-injected snapshot strings fail closed to NOT_CAPTURED", () => {
  const dirty={a2OriginalAssertionSnapshot:{
    captureStage:"SERVER_PRE_RECONCILIATION",version:1,
    originalGenreFlag:"UNSANITIZED_INTERNAL_MODEL_SECRET",
    originalGenreSignals:["UNSANITIZED_INTERNAL_MODEL_SECRET"],
    originalMidrangeTier:"UNSANITIZED_INTERNAL_MODEL_SECRET",
    vocalLayerCrossPassFlag:"UNSANITIZED_INTERNAL_MODEL_SECRET",
  }};
  const rows=values(getSourceVerificationRows(dirty));
  for(const key of [
    "Original genre review flag (not scored)",
    "Original genre assertion codes",
    "Original model Midrange Spacing qualityTier",
    "Original vocal-layer cross-pass review flag (not scored)",
  ])assert.equal(rows["A2 Original Assertions/"+key],"NOT_CAPTURED");
  assert.doesNotMatch(JSON.stringify(getSourceVerificationRows(dirty)),/UNSANITIZED_INTERNAL_MODEL_SECRET/);
});

test("static integration guard proves pre-reconciliation capture stays on A2 upload route only", async()=>{
  const server=await readFile("server.ts","utf8");
  assert.match(server,/import \{ describeLowEndGateFactors, captureA2OriginalAssertionSnapshot \}/);
  const inserted=/if \(isA2PilotRequest\(\)\) \{\s*parsedCritique\.a2OriginalAssertionSnapshot = captureA2OriginalAssertionSnapshot\(parsedCritique\);\s*\}\s*reconcileParentScores\(parsedCritique\);/g;
  assert.equal([...server.matchAll(inserted)].length,1);
  assert.ok(server.indexOf("captureA2OriginalAssertionSnapshot(parsedCritique)")<
    server.indexOf("reconcileParentScores(parsedCritique)"));
  assert.ok(server.indexOf("const subMetricsCall3 = await performSubMetricsCall3(") <
    server.indexOf("captureA2OriginalAssertionSnapshot(parsedCritique)"),
    "capture follows the existing Call 3 applicability handling");
  assert.match(server,/await finishA2PilotIfActive\(\);\s*withholdA2RawEvidence\(parsedCritique\);/);
  assert.match(server,/if \(!percussionPresent \|\| !bassPresent \|\| !corroborated\)/);
  assert.match(server,/if \(vocals\?\.vocalLayerFit && vocals\.vocalLayerFit\.backingVocalLayersPresent === false\)/);
});

test("production source retains the authoritative gates and uses diagnostics only after model results", async()=>{
  const server=await readFile("server.ts","utf8");
  const client=await readFile("src/App.tsx","utf8");
  const exporter=await readFile("src/components/CritiqueDisplay.tsx","utf8");
  assert.match(server,/if \(!percussionPresent \|\| !bassPresent \|\| !corroborated\)/);
  assert.match(server,/const gateDiagnostics = describeLowEndGateFactors\(lowEnd, audit, hasSpecificLowPercussionEvidence\)/);
  assert.match(server,/lowEnd\.sourceVerification = \{/);
  assert.match(server,/if \(detectedKey && chordKeyAnalysis\) chordKeyAnalysis\.keySignature = detectedKey;/);
  assert.match(client,/a2KeyDetectionProvenance/);
  assert.match(client,/payloadKeyIncluded = true/);
  assert.match(exporter,/const sourceNoteRow = wsSourceDiagnostics\.rowCount \+ 1;/);
  assert.doesNotMatch(exporter,/mergeCells\("A23:C23"\)/);
});


test("Cars-style stereo-field evidence flags Call 3 false absence without changing scores", () => {
  const critique = {
    performance: { vocalApplicable: true, vocalsCritique: "The lead vocal is well centered." },
    mixQuality: { stereoField: "Backing vocals are spread effectively, enhancing the chorus sections without cluttering the center." },
    subMetricsCall3: { vocalTrackingSubs: { vocalLayerFit: {
      backingVocalLayersPresent: false, applicable: false, score: 0,
      commentary: "Not applicable: no distinct backing layer is established.",
    } } },
  };
  const original = structuredClone(critique);
  const result = inspectA2VocalLayerEvidence(critique);
  assert.equal(result.status, "ABSENT_SINGLE_PASS_UNVERIFIED");
  assert.equal(result.crossPassFlag, "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  assert.deepEqual(result.crossPassSignals, ["MAIN_STEREO_DESCRIBES_BACKING_LAYERS"]);
  const snapshot = captureA2OriginalAssertionSnapshot(critique);
  assert.equal(snapshot.vocalLayerCrossPassFlag, "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  const rows = values(getSourceVerificationRows({
    ...critique, a2OriginalAssertionSnapshot: snapshot,
  }));
  assert.equal(rows["A2 Original Assertions/Original vocal-layer assertion codes"],
    "MAIN_STEREO_DESCRIBES_BACKING_LAYERS");
  assert.equal(rows["Vocal Layer Fit/Current cross-pass assertion review flag (not scored)"],
    "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  assert.deepEqual(critique, original);
  assert.equal(critique.subMetricsCall3.vocalTrackingSubs.vocalLayerFit.applicable, false);
  assert.equal(critique.subMetricsCall3.vocalTrackingSubs.vocalLayerFit.score, 0);
});

test("stereo evidence remains negation-aware, hedge-aware and diagnostic-only", () => {
  const evaluate = (stereoField, present = false, vocalsCritique = "The lead is centered.") =>
    inspectA2VocalLayerEvidence({
      performance: { vocalsCritique },
      mixQuality: { stereoField },
      subMetricsCall3: { vocalTrackingSubs: { vocalLayerFit: {
        backingVocalLayersPresent: present, applicable: present, score: present ? 88 : 0,
      } } },
    });
  for (const phrase of [
    "There may be backing vocals spread to the sides.",
    "Possibly backing vocals widen the chorus.",
    "The stereo image suggests vocal doubling.",
    "Backing harmonies might be audible.",
  ]) {
    const got = evaluate(phrase);
    assert.equal(got.crossPassFlag, "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE", phrase);
    assert.deepEqual(got.crossPassSignals, [], phrase);
  }
  const denied = evaluate("No backing vocals are audible.");
  assert.equal(denied.crossPassFlag, "NO_DETERMINISTIC_LAYER_CONTRADICTION_FLAG");
  assert.deepEqual(denied.crossPassSignals, ["MAIN_STEREO_EXPLICITLY_DENIES_BACKING_LAYERS"]);
  assert.equal(evaluate("Backing vocals are absent.", true).crossPassFlag,
    "REVIEW_CONFLICTING_LAYER_ASSERTIONS");
  const both = evaluate("Backing vocals widen the chorus.",
    false, "No backing vocals are present in the main vocal.");
  assert.equal(both.crossPassFlag, "AMBIGUOUS_CROSS_PASS_LAYER_DESCRIPTIONS");
  assert.deepEqual(both.crossPassSignals, [
    "MAIN_CRITIQUE_EXPLICITLY_DENIES_BACKING_LAYERS",
    "MAIN_STEREO_DESCRIBES_BACKING_LAYERS",
  ]);
  const selfReference = {
    performance: { vocalsCritique: "The lead voice is centered." },
    mixQuality: { stereoField: "The guitars are panned wide." },
    subMetricsCall3: { vocalTrackingSubs: { vocalLayerFit: {
      backingVocalLayersPresent: false,
      commentary: "Backing harmonies blend perfectly with the lead.",
    } } },
  };
  assert.equal(inspectA2VocalLayerEvidence(selfReference).crossPassFlag,
    "INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE");
});


test("A2 diagnostic coverage never recasts missing audits as instrument absence", () => {
  const noAudit = describeLowEndGateFactors(first, null, sourceEvidence);
  const capture = {
    subMetricsCall1: { lowEndDivision: { applicable: false,
      sourceVerification: { gateFactors: noAudit.factors, specificRejectionReasons: noAudit.failedChecks } } },
  };
  const before = structuredClone(capture);
  const got = values(getSourceVerificationRows(capture));
  assert.equal(got["Low-End Division/Gate evidence coverage (not an applicability verdict)"], "ALL_25_CHECK_SLOTS_RECORDED");
  assert.equal(got["Low-End Division/Second-pass presence (not proof of instrument absence)"], "UNAVAILABLE");
  assert.match(got["Low-End Division/Gate factors true / false / unknown"], /^\d+ \/ \d+ \/ \d+$/);
  assert.equal(got["Low-End Division/Factor/decision review flag (not scored)"],
    "NO_DETERMINISTIC_FACTOR_DECISION_CONFLICT");
  assert.deepEqual(capture, before);
  const legacy = values(getSourceVerificationRows({
    subMetricsCall1: { lowEndDivision: { applicable: false } },
  }));
  assert.equal(legacy["Low-End Division/Gate evidence coverage (not an applicability verdict)"], "NOT_CAPTURED");
  assert.equal(legacy["Low-End Division/Gate factors true / false / unknown"], "NOT_CAPTURED");
  assert.equal(legacy["Low-End Division/Factor/decision review flag (not scored)"], "NOT_CAPTURED");
});

test("A2 low-end review flag reports contradictions without changing actual applicability", () => {
  const factors = describeLowEndGateFactors(first, { ...second, rolesIndependent: false }, sourceEvidence);
  const c = { subMetricsCall1: { lowEndDivision: { applicable: true,
    sourceVerification: { gateFactors: factors.factors, specificRejectionReasons: factors.failedChecks } } } };
  const prior = structuredClone(c);
  const got = values(getSourceVerificationRows(c));
  assert.equal(got["Low-End Division/Factor/decision review flag (not scored)"],
    "REVIEW_APPLICABLE_WITH_UNVERIFIED_DIAGNOSTIC_FACTORS");
  assert.equal(c.subMetricsCall1.lowEndDivision.applicable, true);
  assert.deepEqual(c, prior);
});

test("A2 all-true low-end diagnostic factors flag conflicting final N/A only", () => {
  const factors = describeLowEndGateFactors(first, second, sourceEvidence);
  const sample = { subMetricsCall1: { lowEndDivision: { applicable: false,
    sourceVerification: { gateFactors: factors.factors, specificRejectionReasons: [] } } } };
  const before = structuredClone(sample);
  const got = values(getSourceVerificationRows(sample));
  assert.equal(got["Low-End Division/Factor/decision review flag (not scored)"],
    "REVIEW_NOT_APPLICABLE_DESPITE_ALL_DIAGNOSTIC_FACTORS_TRUE");
  assert.equal(sample.subMetricsCall1.lowEndDivision.applicable, false);
  assert.deepEqual(sample, before);
});

test("A2 vocal presence review distinguishes contradictory gates from true instrumental N/A", () => {
  const example = (present, applicable, vocalApplicable = true) => ({
    performance: { vocalApplicable },
    subMetricsCall3: { vocalTrackingSubs: { vocalLayerFit: {
      backingVocalLayersPresent: present, applicable,
      sourceVerification: { rawLayerPresence: present, decisionSource: "CALL3_SINGLE_LISTEN" },
    } } },
  });
  const missing = values(getSourceVerificationRows({}));
  assert.equal(missing["Vocal Layer Fit/Presence versus final applicability review (not scored)"], "NOT_CAPTURED");
  const absentButApplicable = example(false, true);
  const original = structuredClone(absentButApplicable);
  assert.equal(values(getSourceVerificationRows(absentButApplicable))[
    "Vocal Layer Fit/Presence versus final applicability review (not scored)"],
    "REVIEW_ABSENT_LAYER_MARKED_APPLICABLE");
  assert.deepEqual(absentButApplicable, original);
  assert.equal(values(getSourceVerificationRows(example(true, false)))[
    "Vocal Layer Fit/Presence versus final applicability review (not scored)"],
    "REVIEW_PRESENT_LAYER_MARKED_NOT_APPLICABLE");
  assert.equal(values(getSourceVerificationRows(example(true, false, false)))[
    "Vocal Layer Fit/Presence versus final applicability review (not scored)"],
    "VOCAL_PERFORMANCE_NOT_APPLICABLE");
  assert.equal(values(getSourceVerificationRows(example(false, false)))[
    "Vocal Layer Fit/Presence versus final applicability review (not scored)"],
    "CONSISTENT_WITH_UNVERIFIED_SINGLE_PASS");
  const uncertain = example(undefined, false);
  assert.equal(values(getSourceVerificationRows(uncertain))[
    "Vocal Layer Fit/Presence versus final applicability review (not scored)"], "NOT_CAPTURED");
  assert.equal(values(getSourceVerificationRows(absentButApplicable))[
    "Vocal Layer Fit/Presence evidence qualification"],
    "CALL3_SINGLE_LISTEN_UNVERIFIED; cross-pass statements are assertions, not acoustic proof");
});


test("four frozen post-A2 vocal-layer decisions remain unverified paired observations", () => {
  // These four presence decisions came from different single-listen Call 3
  // outputs for clean/altered versions of the same underlying performances.
  // They are not independent proof that the tracks contain or lack harmonies.
  const cases=[
    ["BOSTON_CLEAN","BOSTON",false,"ABSENT_SINGLE_PASS_UNVERIFIED"],
    ["T01_B","BOSTON",true,"PRESENT_SINGLE_PASS_UNVERIFIED"],
    ["DRAKE_CLEAN","DRAKE",true,"PRESENT_SINGLE_PASS_UNVERIFIED"],
    ["T02_B","DRAKE",false,"ABSENT_SINGLE_PASS_UNVERIFIED"],
  ];
  const captured=[];
  for(const [id,pair,present,status] of cases) {
    const c={
      performance:{vocalApplicable:true,vocalsCritique:"A lead vocal is present."},
      subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{
        backingVocalLayersPresent:present,
        applicable:present,score:present?88:0,
        sourceVerification:{
          rawLayerPresence:present,decisionSource:"CALL3_SINGLE_LISTEN",
        },
      }}},
    };
    const before=structuredClone(c);
    const snapshot=captureA2OriginalAssertionSnapshot(c);
    const rows=values(getSourceVerificationRows({...c,a2OriginalAssertionSnapshot:snapshot}));
    assert.equal(snapshot.vocalLayerEvidenceStatus,status,id);
    assert.equal(rows["A2 Original Assertions/Original vocal-layer presence status (single pass)"],status,id);
    assert.equal(rows["Vocal Layer Fit/Presence evidence qualification"],
      "CALL3_SINGLE_LISTEN_UNVERIFIED; cross-pass statements are assertions, not acoustic proof",id);
    assert.deepEqual(c,before,"diagnostics must not change layer score or applicability");
    captured.push({id,pair,present,status});
  }
  assert.deepEqual(captured.filter(x=>x.pair==="BOSTON").map(x=>x.present),[false,true]);
  assert.deepEqual(captured.filter(x=>x.pair==="DRAKE").map(x=>x.present),[true,false]);
  // The reporting helpers cannot silently force pair-membership agreement.
  assert.doesNotMatch(String(inspectA2VocalLayerEvidence)+String(captureA2OriginalAssertionSnapshot),
    /BOSTON_CLEAN|T01_B|DRAKE_CLEAN|T02_B/);
});

test("altered Drake-style original midrange contradiction survives final DSP commentary replacement", () => {
  // A frozen pre-reconciliation assertion can disagree with a parent while the
  // browser-corrected child is later consistent. Both facts must stay visible.
  const c=structuredClone(genreAndMask);
  c.vibe={genre:"Rap / Hip-Hop",subgenre:"Rhythmic / Urban Mainstream"};
  c.performance={vocalApplicable:true,vocalsCritique:"The lead sits in the center."};
  c.subMetricsCall3={vocalTrackingSubs:{vocalLayerFit:{
    backingVocalLayersPresent:false,applicable:false,score:0,
  }}};
  c.subMetricsCall1.midrangeSpacing.qualityTier="PROFESSIONAL_HIGH";
  const frozen=captureA2OriginalAssertionSnapshot(c);
  assert.equal(frozen.originalMidrangeFlag,"REVIEW_PARENT_CHILD_MASKING_CONTRADICTION");
  c.a2OriginalAssertionSnapshot=frozen;
  const initial=structuredClone(frozen);
  c.subMetricsCall1.midrangeSpacing.score=72;
  c.subMetricsCall1.midrangeSpacing.commentary=
    "Measured midrange structure does not support a high spacing tier.";
  c.mixQuality.frequencyBalance.midrange=
    "Measured spectral distinction is reduced through the central mix range.";
  const rows=values(getSourceVerificationRows(c));
  assert.equal(rows["A2 Original Assertions/Original parent/child midrange review flag (not scored)"],
    "REVIEW_PARENT_CHILD_MASKING_CONTRADICTION");
  assert.equal(rows["A2 Original Assertions/Original model Midrange Spacing qualityTier"],
    "PROFESSIONAL_HIGH");
  assert.equal(rows["Midrange Consistency/Parent/child review flag (not scored)"],
    "NO_DETERMINISTIC_CONTRADICTION_FLAG");
  assert.deepEqual(c.a2OriginalAssertionSnapshot,initial);
  assert.equal(c.subMetricsCall1.midrangeSpacing.score,72);
  assert.equal(c.subMetricsCall3.vocalTrackingSubs.vocalLayerFit.applicable,false);
});


// Stage 1 lineage assertions are report-only; representative source inputs are
// explicitly synthetic. Historical A2 workbook scores remain in the separate
// frozen four-case regression, not reconstructed into this new report format.
const streamProfile = {
  danceMin: .72, danceMax: .88, energyMin: .60, energyMax: .82,
  acousticMin: .02, acousticMax: .18, valenceMin: .45, valenceMax: .75,
  speechMin: .22, speechMax: .45, instMin: 0, instMax: .05,
  liveMin: .08, liveMax: .22,
};
const streamLabels=["Danceability","Energy","Acousticness","Mood Valence","Speechiness","Instrumentalness","Liveness"];
const scorecardFixture=(matches=[100,100,100,100,100,100,100])=>streamLabels.map((label,i)=>({
  label,value:50,min:10,max:90,matchPercent:matches[i],
}));
const streamingFixture=(scores, matches)=> {
  const prod=scores.overallProduction,eng=scores.commercialReadiness;
  const skip=Math.min(85,Math.max(0,91-Math.round(eng*.70+prod*.20)));
  const completion=Math.min(100,Math.max(15,100-skip));
  const avg=matches.reduce((sum,x)=>sum+x,0)/matches.length;
  return Math.round(completion*.40+avg*.30+eng*.30);
};

test("Stage 1 classifies vocal presence based on other assertions but never treats agreement as audio truth",()=>{
  const examples=[
    {flag:"REVIEW_CONFLICTING_LAYER_ASSERTIONS",signals:["MAIN_STEREO_DESCRIBES_BACKING_LAYERS"],
      want:"CONFLICTING_MODEL_ASSERTIONS"},
    {flag:"AMBIGUOUS_CROSS_PASS_LAYER_DESCRIPTIONS",signals:["MAIN_STEREO_DESCRIBES_BACKING_LAYERS"],
      want:"MIXED_MODEL_ASSERTIONS"},
    {flag:"NO_DETERMINISTIC_LAYER_CONTRADICTION_FLAG",signals:["MAIN_STEREO_DESCRIBES_BACKING_LAYERS"],
      want:"CORROBORATING_MODEL_ASSERTIONS_UNVERIFIED"},
    {flag:"INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE",signals:[],want:"INSUFFICIENT_INDEPENDENT_EVIDENCE"},
  ];
  for(const ex of examples){
    const modelAssertions={status:"PRESENT_SINGLE_PASS_UNVERIFIED",
      crossPassFlag:ex.flag,crossPassSignals:ex.signals};
    const before=structuredClone(modelAssertions);
    assert.equal(classifyA2VocalLayerAssertionSupport(modelAssertions),ex.want);
    assert.deepEqual(modelAssertions,before);
  }
  assert.equal(classifyA2VocalLayerAssertionSupport({
    status:"NOT_CAPTURED",crossPassFlag:"INSUFFICIENT_CROSS_PASS_LAYER_EVIDENCE",crossPassSignals:[],
  }),"NOT_CAPTURED");
  const withAssert={
    performance:{vocalApplicable:true,vocalsCritique:"Backing harmonies widen the chorus."},
    subMetricsCall3:{vocalTrackingSubs:{vocalLayerFit:{
      backingVocalLayersPresent:false,applicable:false,score:0,sourceVerification:{
        rawLayerPresence:false,decisionSource:"CALL3_SINGLE_LISTEN",
      },
    }}},
  };
  const saved=structuredClone(withAssert);
  const rows=values(getSourceVerificationRows(withAssert));
  assert.equal(rows["Vocal Layer Fit/Assertion support classification (not acoustic verification)"],
    "CONFLICTING_MODEL_ASSERTIONS");
  assert.equal(withAssert.subMetricsCall3.vocalTrackingSubs.vocalLayerFit.applicable,false);
  assert.deepEqual(withAssert,saved);
});

test("Stage 1 source-lineage records actual selected paths for all seven dimensions",()=>{
  const critique={
    vibe:{genre:"Rap / Hip-Hop",subgenre:"Mainstream Rap"},
    scores:{overallProduction:89,commercialReadiness:87},
    arrangement:{flowScore:88},performance:{vocalApplicable:true,instrumentalScore:87},
    musicTheory:{score:88},lyricalImpact:{score:88},mixQuality:{score:89},
    spotifyOverrides:{acousticness:20,liveness:55},
    subMetricsCall2:{moodValence:{score:75},speechiness:{score:35}},
    liveMetrics:{calculatedLufs:-10,calculatedHighEnergy:14,calculatedBassEnergy:20,calculatedStereoCorrelation:.6},
  };
  const saved=structuredClone(critique);
  const matches=[100,85,90,100,100,100,75];
  const scorecard=scorecardFixture(matches);
  scorecard[0].value=86;scorecard[1].value=56;scorecard[2].value=20;
  scorecard[3].value=75;scorecard[4].value=35;
  scorecard[5].value=2;scorecard[6].value=55;
  const summary={streamingReadiness:streamingFixture(critique.scores,matches)};
  const rows=values(getStreamingReadinessLineageRows(critique,streamProfile,scorecard,summary,null));
  const selected=k=>rows["Streaming Profile: "+k+"/Selected source branch (current export)"];
  assert.equal(selected("Danceability"),"SCORE_DERIVED_FLOW");
  assert.equal(selected("Energy"),"DSP_LUFS_HIGH_ENERGY");
  assert.equal(selected("Acousticness"),"MANUAL_OVERRIDE");
  assert.equal(selected("Mood Valence"),"GEMINI_CALL2");
  assert.equal(selected("Speechiness"),"GEMINI_CALL2");
  assert.equal(selected("Instrumentalness"),"VOCAL_STATUS_PRESENT_PROXY_2");
  assert.equal(selected("Liveness"),"MANUAL_OVERRIDE");
  assert.equal(rows["Streaming Profile: Energy/Fallback offset USED"],"NOT_APPLICABLE");
  assert.match(rows["Streaming Profile: Liveness/Fallback expression (may not have executed)"],/mixScore.*% 10/);
  assert.match(rows["Streaming Profile: Energy/Selected source inputs (raw; missing = NOT_CAPTURED)"],/calculatedLufs=-10/);
  assert.equal(rows["Streaming Readiness Lineage/Diagnostic arithmetic parity"],"MATCH");
  assert.equal(rows["Streaming Readiness Lineage/Actual unchanged exported Streaming Readiness"],String(summary.streamingReadiness));
  assert.equal(rows["Streaming Profile: Energy/Contribution to Streaming Readiness BEFORE ROUNDING (points)"],String(Math.round(85*.30/7*1e6)/1e6));
  assert.deepEqual(critique,saved);
});

test("Stage 1 explicitly differentiates liveness stereo-correlation from the Mix Balance modulo fallback",()=>{
  const c={scores:{overallProduction:89,commercialReadiness:87},mixQuality:{score:89}};
  const card=scorecardFixture();
  const make=()=>values(getStreamingReadinessLineageRows(c,streamProfile,card,
    {streamingReadiness:streamingFixture(c.scores,card.map(x=>x.matchPercent))},null));
  let rows=make();
  assert.equal(rows["Streaming Profile: Liveness/Selected source branch (current export)"],"FALLBACK_MIX_MOD10");
  assert.equal(rows["Streaming Profile: Liveness/Fallback offset USED"],"5");
  c.liveMetrics={calculatedStereoCorrelation:.61};
  rows=make();
  assert.equal(rows["Streaming Profile: Liveness/Selected source branch (current export)"],"DSP_STEREO_CORRELATION_PROXY");
  assert.equal(rows["Streaming Profile: Liveness/Fallback offset USED"],"NOT_APPLICABLE");
  assert.match(rows["Streaming Profile: Liveness/Selected source inputs (raw; missing = NOT_CAPTURED)"],/calculatedStereoCorrelation=0.61/);
  c.spotifyOverrides={liveness:47};
  rows=make();
  assert.equal(rows["Streaming Profile: Liveness/Selected source branch (current export)"],"MANUAL_OVERRIDE");
});

test("Stage 1 85-to-96 walkthrough records known 89-to-90 modulo discontinuities without changing scoring",()=>{
  const fallback=(v,d,mod)=>Math.round(v%mod-d);
  for(let score=85;score<=96;score++){
    const c={scores:{overallProduction:score,commercialReadiness:87},
      mixQuality:{score},performance:{instrumentalScore:score}};
    const card=scorecardFixture();
    const rows=values(getStreamingReadinessLineageRows(c,streamProfile,card,
      {streamingReadiness:streamingFixture(c.scores,card.map(x=>x.matchPercent))},null));
    assert.equal(rows["Streaming Profile: Energy/Fallback offset USED"],String(fallback(score,4,15)));
    assert.equal(rows["Streaming Profile: Acousticness/Fallback offset USED"],String(fallback(score,7,15)));
    assert.equal(rows["Streaming Profile: Liveness/Fallback offset USED"],String(fallback(score,4,10)));
  }
  assert.equal(fallback(90,4,15)-fallback(89,4,15),-14);
  assert.equal(fallback(90,7,15)-fallback(89,7,15),-14);
  assert.equal(fallback(90,4,10)-fallback(89,4,10),-9);
  // Diagnostic must currently assert observed discontinuity; the future
  // BEHAVIORAL fix may separately assert continuity with an approved change.
});

test("Stage 1 four frozen A2 headline observations remain unchanged under diagnostic inspection",()=>{
  const four=[
    {id:"BOSTON_CLEAN",eng:89,prod:88,match:89,expected:89},
    {id:"T01_B",eng:87,prod:89,match:89,expected:88},
    {id:"DRAKE_CLEAN",eng:87,prod:89,match:100,expected:91},
    {id:"T02_B",eng:86,prod:88,match:89,expected:87},
  ];
  for(const item of four){
    // Profile-match inputs for Boston are illustrative values that reproduce
    // its published headlines; they are NOT archived original source values.
    const c={scores:{commercialReadiness:item.eng,overallProduction:item.prod}};
    const card=scorecardFixture(Array(7).fill(item.match));
    const previous=structuredClone(c);
    assert.equal(streamingFixture(c.scores,card.map(x=>x.matchPercent)),item.expected,item.id);
    const rows=values(getStreamingReadinessLineageRows(c,streamProfile,card,
      {streamingReadiness:item.expected},null));
    assert.equal(rows["Streaming Readiness Lineage/Diagnostic arithmetic parity"],"MATCH",item.id);
    assert.equal(rows["Streaming Readiness Lineage/Actual unchanged exported Streaming Readiness"],String(item.expected));
    assert.deepEqual(c,previous);
  }
});

test("Stage 1 legacy missing inputs remain marked NOT_CAPTURED, and Excel output includes no model secrets",async()=>{
  const critique={performance:{vocalsCritique:"RAW_INTERNAL_MODEL_TEXT_SECRET"}};
  const before=structuredClone(critique);
  const card=scorecardFixture();
  const rows=getStreamingReadinessLineageRows(critique,streamProfile,card,
    {streamingReadiness:streamingFixture({commercialReadiness:75,overallProduction:75},
      card.map(x=>x.matchPercent))},null);
  const entries=values(rows);
  assert.equal(entries["Streaming Readiness Lineage/Subgenre profile"],"NOT_CAPTURED");
  assert.match(entries["Streaming Profile: Energy/Selected source inputs (raw; missing = NOT_CAPTURED)"],/NOT_CAPTURED/);
  assert.match(entries["Streaming Profile: Liveness/Selected source inputs (raw; missing = NOT_CAPTURED)"],/NOT_CAPTURED/);
  assert.match(entries["Streaming Readiness Lineage/Capture scope"],/CURRENT_EXPORT_REPLAY_ONLY/);
  const wb=new ExcelJS.Workbook(),sheet=wb.addWorksheet("Source Diagnostics");
  sheet.columns=[{header:"Metric",key:"section"},{header:"Field",key:"field"},{header:"Value",key:"value"}];
  for(const row of rows)sheet.addRow(row);
  const bytes=await wb.xlsx.writeBuffer(),read=new ExcelJS.Workbook();
  await read.xlsx.load(bytes);
  const cells=JSON.stringify(read.getWorksheet("Source Diagnostics").getSheetValues());
  assert.match(cells,/FALLBACK_MIX_MOD10/); // provenance expressions are exported as safe strings
  assert.doesNotMatch(cells,/RAW_INTERNAL_MODEL_TEXT_SECRET/);
  assert.deepEqual(critique,before);
});


// Frozen offline reference expectations: FFmpeg ebur128=peak=true from 7.5s
// with 1.5 s post-programme silence (apad=pad_dur=1.5),
// 16-kHz mono and 44.1/48-kHz stereo PCM16 WAVs synthesized independently.
// Acceptance: LUFS +/-0.5, LRA +/-1 LU, sample peak +/-0.1 dB,
// true peak +/-0.5 dBTP and convention-matched crest +/-0.5 dB.
test("Stage 1A offline reference meters match frozen FFmpeg fixtures without scoring side effects", () => {
  const near = (actual, expected, tol, metric) => {
    assert.equal(Number.isFinite(actual), true, metric + " must be finite");
    assert.ok(Math.abs(actual - expected) <= tol,
      metric + ": " + actual + " versus " + expected + " (tolerance " + tol + ")");
  };
  const fixture = (sr, stereo) => {
    const length = Math.round(sr * 7.5);
    const left = new Float32Array(length), right = stereo ? new Float32Array(length) : null;
    for(let i=0;i<length;i++) {
      const t=i/sr;
      const level=t<3.3 ? 0.4 : 1.0;
      // PCM16 quantization matches the archived offline WAV references.
      const l = (0.12*Math.sin(2*Math.PI*997*t) + 0.06*Math.sin(2*Math.PI*251*t))*level;
      left[i] = Math.trunc(Math.max(-1, Math.min(1,l))*32767)/32768;
      if (right) {
        const r = (0.09*Math.sin(2*Math.PI*502*t)+0.025*Math.sin(2*Math.PI*1351*t))*
          (t<3.3 ? 0.6 : 1.0);
        right[i] = Math.trunc(Math.max(-1,Math.min(1,r))*32767)/32768;
      }
    }
    return right ? [left,right] : [left];
  };
  for (const [sr,stereo,refLUFS,refLRA] of [
    [16000,false,-22.6,6.7],
    [44100,true,-20.8,5.6],
    [48000,true,-20.8,5.6],
  ]) {
    const channels=fixture(sr,stereo);
    const legacy={calculatedLufs:-15, calculatedTruePeak:-16, calculatedLra:5.4,
      calculatedCrestFactorDb:10,calculatedRmsDbfs:-25};
    const saved=channels.map(channel=>Float32Array.from(channel));
    const snapshot=structuredClone(legacy);
    const result=analyzeStage1aMeterReference(channels,sr,legacy);
    const m=result.measurements;
    near(m.integratedLufs,refLUFS,0.5,sr+" LUFS");
    near(m.loudnessRangeLu,refLRA,1,sr+" LRA");
    near(m.samplePeakDbfs,-14.9,0.1,sr+" sample peak");
    near(m.truePeakDbtp4x,-14.9,0.5,sr+" true peak");
    near(m.crestFactorDb,m.samplePeakDbfs-m.rmsDbfs,0.000001,sr+" crest");
    near(m.midCrestFactorDb,m.samplePeakDbfs-m.midRmsDbfs,0.000001,sr+" mid crest");
    assert.equal(result.method,"stage1a-reference-v1");
    assert.equal(result.sampleRate,sr);
    assert.equal(result.channelCount,stereo?2:1);
    assert.equal(result.truePeakAccuracyStatus,
      sr===48000?"ANNEX2_48KHZ_REFERENCE_NOT_CERTIFIED":"NON_48KHZ_UNVERIFIED");
    assert.equal(result.differences.calculatedLufs,m.integratedLufs-legacy.calculatedLufs);
    assert.equal(result.differences.legacyPeakVsFullSamplePeak,m.samplePeakDbfs-legacy.calculatedTruePeak);
    assert.equal(Object.hasOwn(result.differences,"calculatedCrestFactorDb"),false,
      "cross-convention crest factor difference must never be presented as numeric error");
    assert.equal(Object.hasOwn(result.differences,"calculatedRmsDbfs"),false,
      "cross-convention RMS difference must never be presented as numeric error");
    assert.equal(result.differences.legacyMidRmsVsReferenceMidRms,m.midRmsDbfs-legacy.calculatedRmsDbfs);
    assert.deepEqual(legacy,snapshot);
    for(let c=0;c<channels.length;c++) assert.deepEqual(channels[c],saved[c]);
  }
});

test("Stage 1A distinguishes true peak from sample peak and mid crest from full-channel crest", () => {
  const sr=48000, mono=new Float32Array(sr);
  mono.set([0,-0.6,0.6,0.6,-0.6,0],100);
  const clipped=analyzeStage1aMeterReference([mono],sr);
  assert.ok(clipped.measurements.truePeakDbtp4x>clipped.measurements.samplePeakDbfs+1,
    "bandlimited intersample ringing should exceed samples");
  assert.equal(clipped.measurements.loudnessRangeLu,null,
    "loudness range must not invent 5.4 LU for sub-3s audio");

  const stereo=analyzeStage1aMeterReference([mono,Float32Array.from(mono,x=>-x)],sr);
  assert.ok(Number.isFinite(stereo.measurements.crestFactorDb));
  assert.equal(stereo.measurements.midRmsDbfs,null);
  assert.equal(stereo.measurements.midCrestFactorDb,null);
  assert.throws(()=>analyzeStage1aMeterReference([new Float32Array(0)],48000), /No PCM samples/);
});

test("Stage 1A new meters remain explicitly unconnected to production scoring", async () => {
  const source=await readFile(new URL("../src/lib/liveAudioAnalyzer.ts",import.meta.url),"utf8");
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(source,/Stage 1A: opt-in, reference-oriented meters/);
  assert.equal(source.match(/analyzeStage1aMeterReference\(/g)?.length,1,
    "prototype is exported but not called by the existing analyzer");
  assert.doesNotMatch(app,/analyzeStage1aMeterReference/);
  assert.doesNotMatch(server,/analyzeStage1aMeterReference/);
  assert.doesNotMatch(source,/new Float64Array\(count \+ 1\)/,
    "must not retain a full-length filtered PCM or prefix-power array");
  assert.match(source,/shortTermPowers\.push\(power \/ samples\)/);
  assert.match(source,/bucketEnd = Math\.round\(\(bucket \+ 1\) \* sampleRate \/ 10\)/);
  assert.match(source,/sorted\[Math\.round\(\(sorted\.length - 1\) \* 0\.95\)\]/);
  assert.match(source,/Full-channel and stereo-mid RMS\/crest have different conventions/);
  assert.match(source,/const lraTrailingSamples = Math\.ceil\(sampleRate \* 1\.5\)/);
  assert.match(source,/if \(i \+ 1 <= count\) momentaryPowers\.push/);
  assert.doesNotMatch(source,/calculatedLufs:\s*m\.integratedLufs/);
  assert.doesNotMatch(source,/calculatedTruePeak:\s*m\.truePeakDbtp4x/);
});


test("Stage 1A EBU Tech 3342 two 20s stereo tones resolve the 10 LU loudness range", () => {
  // EBU Tech 3342 v4 minimum-requirements Test 1: in-phase stereo 1kHz,
  // 20 s at -20 dBFS per channel followed by 20 s at -30 dBFS.
  const sr=16000, seconds=40, left=new Float32Array(sr*seconds);
  for(let i=0;i<left.length;i++) {
    const amp=i<20*sr ? 0.1 : 0.03162277660168379;
    left[i]=amp*Math.sin(2*Math.PI*1000*i/sr);
  }
  const m=analyzeStage1aMeterReference([left,left],sr).measurements;
  assert.ok(Math.abs(m.loudnessRangeLu-10)<=1,
    "EBU Test 1 expected 10 +/-1 LU; got "+m.loudnessRangeLu);
});

test("Stage 1A handles silence, short clips, rejected channels, nonfinite samples and atypical rate", () => {
  for(const sr of [8000,11025,48000,96000]) {
    const n=Math.floor(sr/4);
    const m=analyzeStage1aMeterReference([new Float32Array(n)],sr).measurements;
    assert.equal(m.samplePeakDbfs,null);
    assert.equal(m.truePeakDbtp4x,null);
    assert.equal(m.rmsDbfs,null);
    assert.equal(m.integratedLufs,null);
    assert.equal(m.loudnessRangeLu,null);
  }
  assert.throws(()=>analyzeStage1aMeterReference([new Float32Array(40),new Float32Array(39)],48000),
    /equally sized/);
  assert.throws(()=>analyzeStage1aMeterReference([new Float32Array([NaN,0])],48000),
    /Nonfinite PCM sample/);
  assert.throws(()=>analyzeStage1aMeterReference([new Float32Array([Infinity,0])],48000),
    /Nonfinite PCM sample/);
  assert.throws(()=>analyzeStage1aMeterReference([new Float32Array(10)],7999),
    /supported sample rate/);
  assert.throws(()=>analyzeStage1aMeterReference([],48000),/mono\/stereo/);
});

test("Stage 1A reports gain shifts without changing LRA or input arrays", () => {
  const sr=16000,n=sr*8,a=new Float32Array(n),b=new Float32Array(n);
  for(let i=0;i<n;i++) {
    const amplitude=(i/sr<3?0.05:0.11);
    a[i]=amplitude*Math.sin(2*Math.PI*440*i/sr);
    b[i]=a[i]*2;
  }
  const before=Float32Array.from(a);
  const first=analyzeStage1aMeterReference([a],sr).measurements;
  const louder=analyzeStage1aMeterReference([b],sr).measurements;
  assert.ok(Math.abs(louder.integratedLufs-first.integratedLufs-6.020599913)<0.1);
  assert.ok(Math.abs(louder.samplePeakDbfs-first.samplePeakDbfs-6.020599913)<0.01);
  assert.ok(Math.abs(louder.truePeakDbtp4x-first.truePeakDbtp4x-6.020599913)<0.05);
  assert.ok(Math.abs(louder.loudnessRangeLu-first.loudnessRangeLu)<0.15);
  assert.deepEqual(a,before);
});

test("Stage 1A true-peak FIR measures high-frequency intersample peaks and boundary transients", () => {
  const sr=48000,n=sr*2,a=new Float32Array(n),amplitude=0.6;
  for(let i=0;i<n;i++) a[i]=amplitude*Math.sin(2*Math.PI*12000*i/sr + Math.PI/4);
  const m=analyzeStage1aMeterReference([a],sr).measurements;
  assert.ok(m.truePeakDbtp4x>m.samplePeakDbfs+1.8,
    "true peak must recognize phase-offset quarter-rate signal");
  assert.ok(Math.abs(m.truePeakDbtp4x-20*Math.log10(amplitude))<0.5,
    "true peak must be within the declared 0.5dB high-frequency tolerance");

  const nearStart=new Float32Array(200),nearEnd=new Float32Array(200);
  nearStart[0]=1; nearEnd[199]=1;
  const p=analyzeStage1aMeterReference([nearStart],48000).measurements;
  const q=analyzeStage1aMeterReference([nearEnd],48000).measurements;
  assert.ok(p.truePeakDbtp4x>=p.samplePeakDbfs-0.000001);
  assert.ok(q.truePeakDbtp4x>=q.samplePeakDbfs-0.000001);
  assert.ok(Math.abs(p.truePeakDbtp4x-q.truePeakDbtp4x)<0.1,
    "identical boundary impulses should yield symmetric peaks");
});

test("Stage 1A short-run timing is bounded for the independent diagnostic", () => {
  const sr=48000,n=sr*2,channels=[new Float32Array(n),new Float32Array(n)];
  for(let i=0;i<n;i++) {
    channels[0][i]=0.45*Math.sin(2*Math.PI*1499*i/sr);
    channels[1][i]=0.3*Math.sin(2*Math.PI*3111*i/sr);
  }
  const start=performance.now();
  const result=analyzeStage1aMeterReference(channels,sr);
  const elapsed=performance.now()-start;
  assert.ok(elapsed<15000,"2s stereo measurement took "+elapsed+"ms (diagnostic time limit 15s)");
  assert.ok(result.measurements.integratedLufs!==null);
  assert.equal(result.measurements.loudnessRangeLu,null);
});


test("Stage 1A exercises all four published EBU Tech 3342 synthetic minimum-requirement LRA cases", () => {
  const sr=16000, segmentSeconds=20;
  const cases=[
    {levels:[-20,-30], expectedLra:10},
    {levels:[-20,-15], expectedLra:5},
    {levels:[-40,-20], expectedLra:20},
    {levels:[-50,-35,-20,-35,-50], expectedLra:15},
  ];
  for(const fixture of cases) {
    const n=sr*segmentSeconds*fixture.levels.length;
    const samples=new Float32Array(n);
    for(let i=0;i<n;i++) {
      const segment=Math.floor(i/(sr*segmentSeconds));
      const amp=Math.pow(10,fixture.levels[segment]/20);
      samples[i]=amp*Math.sin(2*Math.PI*1000*i/sr);
    }
    const result=analyzeStage1aMeterReference([samples,samples],sr);
    assert.ok(Math.abs(result.measurements.loudnessRangeLu-fixture.expectedLra)<=1,
      "EBU synthetic "+fixture.levels.join(",")+" expected "+fixture.expectedLra+
      " +/-1 LU, got "+result.measurements.loudnessRangeLu);
    assert.equal(result.truePeakAccuracyStatus,"NON_48KHZ_UNVERIFIED");
  }
});

test("Stage 1A EBU file end adds 1.5s LRA latency but never modifies programme-integrated LUFS or peak", () => {
  const sr=16000,n=sr*8,recording=new Float32Array(n);
  for(let i=0;i<n;i++){
    const level=i<4*sr ? 0.025 : 0.2;
    recording[i]=level*Math.sin(2*Math.PI*1000*i/sr);
  }
  const original=Float32Array.from(recording);
  const padded=new Float32Array(n+Math.round(sr*1.5));
  padded.set(recording);
  const a=analyzeStage1aMeterReference([recording,recording],sr);
  const b=analyzeStage1aMeterReference([padded,padded],sr);
  assert.ok(Math.abs(a.measurements.loudnessRangeLu-b.measurements.loudnessRangeLu)<=1,
    "internal LRA tail should be near explicitly padded reference");
  assert.equal(a.sampleCount,n);
  assert.equal(a.measurements.samplePeakDbfs,b.measurements.samplePeakDbfs);
  // Explicitly padding a source file changes the true-peak FIR's boundary
  // neighborhood. The sample peaks are comparable, but the true-peak FIR
  // values from different-length files need not be identical.
  assert.ok(a.measurements.truePeakDbtp4x >= a.measurements.samplePeakDbfs);
  assert.ok(b.measurements.truePeakDbtp4x >= b.measurements.samplePeakDbfs);
  // Full-programme RMS must decrease when the reference itself contains
  // 1.5 seconds more silence; this is a duration effect, not a meter defect.
  const expectedPaddedRmsDelta=10*Math.log10((n+Math.round(sr*1.5))/n);
  assert.ok(Math.abs(a.measurements.rmsDbfs-b.measurements.rmsDbfs-expectedPaddedRmsDelta)<0.02,
    "RMS delta must equal the time-normalisation difference");
  assert.ok(Math.abs(a.measurements.integratedLufs-b.measurements.integratedLufs)<0.2,
    "silent padding should not materially change gated integrated loudness");
  assert.deepEqual(recording,original,"LRA must not append samples to caller's PCM");
});

test("Stage 1A non-48k true peak has an explicit accuracy qualifier for each sample rate", () => {
  for(const sr of [8000,16000,44100,48000,96000,192000]) {
    const n=Math.floor(sr/3), samples=new Float32Array(n);
    for(let i=0;i<n;i++) samples[i]=0.5*Math.sin(2*Math.PI*997*i/sr);
    const result=analyzeStage1aMeterReference([samples],sr);
    assert.equal(result.truePeakAccuracyStatus,
      sr===48000 ? "ANNEX2_48KHZ_REFERENCE_NOT_CERTIFIED" : "NON_48KHZ_UNVERIFIED");
    assert.ok(Number.isFinite(result.measurements.truePeakDbtp4x),
      "unverified non-48k true peaks are diagnostics, not a hidden 0 or fabricated pass");
    assert.match(result.limitations.join(" "), /not independently (certified|validated)/);
  }
});

test("Stage 1A performance on 60s 48k stereo is bounded and output is reproducible", () => {
  const sr=48000, n=60*sr;
  const left=new Float32Array(n), right=new Float32Array(n);
  for(let i=0;i<n;i++) {
    left[i]=0.12*Math.sin(2*Math.PI*941*i/sr);
    right[i]=0.08*Math.sin(2*Math.PI*1379*i/sr);
  }
  const start=performance.now();
  const a=analyzeStage1aMeterReference([left,right],sr);
  const elapsed=performance.now()-start;
  assert.ok(elapsed<15000,"60s 48k stereo diagnostic exceeded 15-second CI ceiling: "+elapsed+"ms");
  assert.ok(Number.isFinite(a.measurements.integratedLufs));
  assert.ok(Number.isFinite(a.measurements.truePeakDbtp4x));
  assert.ok(Number.isFinite(a.measurements.loudnessRangeLu));
  assert.equal(a.sampleCount,n);
  // Bound output size even though PCM is in memory: only summary diagnostics
  // are returned. Timing and peak heap are independently checked in browser later.
  assert.ok(JSON.stringify(a).length<4000);
});


/*
 * Stage 1D synthetic-only accuracy snapshot; independently measured using
 * FFmpeg 7.1.5 ebur128=peak=true with 1.5s apad for programme measurements,
 * and high-precision SoXR 384kHz FLOAT output for reconstructed peaks:
 * aresample=resampler=soxr:precision=33:osr=384000:osf=fltp
 * astats=metadata=0:reset=0; -c:a pcm_f32le.
 * Neither reference is claimed to be a unique certified true-peak oracle.
 */
test("Stage 1D freezes independent peak references across 44.1 and 48 kHz synthetic signals", () => {
  const cases = [
    // sample rate, kind, Stage 1A peak baseline, FFmpeg peak, SoXR peak
    [44100,"tone",-19.992054,-20.0,-20.000000],
    [48000,"tone",-19.993304,-20.0,-19.992944],
    [44100,"hf12",-4.243968,-3.8,-4.306186],
    [48000,"hf12",-4.354327,-3.8,-4.339518],
    [44100,"hf19",-3.830563,-3.8,-4.123987],
    [48000,"hf19",-4.065826,-4.4,-4.107921],
    [44100,"nearNyquist",-3.885391,-3.1,-3.446720],
    [48000,"nearNyquist",-3.885391,-3.2,-3.419157],
    [44100,"initialTransient",-0.291321,0.4,0.084005],
    [48000,"initialTransient",-0.291321,0.4,0.095829],
  ];
  const observedFFmpegDisagreements = [];
  for(const [sr,kind,yssBaseline,ffmpegPeak,soxrPeak] of cases) {
    const n=5*sr, left=new Float32Array(n);
    for(let i=0;i<n;i++) {
      if(kind==="tone") left[i]=0.1*Math.sin(2*Math.PI*1000*i/sr);
      if(kind==="hf12") left[i]=0.6*Math.sin(2*Math.PI*12000*i/sr+Math.PI/4);
      if(kind==="hf19") left[i]=0.6*Math.sin(2*Math.PI*19000*i/sr+Math.PI/4);
      if(kind==="nearNyquist") left[i]=0.6*Math.sin(2*Math.PI*0.46*i+Math.PI/4);
    }
    if(kind==="initialTransient") left.set([0,-0.6,0.6,0.6,-0.6,0],0);
    const result=analyzeStage1aMeterReference([left,left],sr);
    const peak=result.measurements.truePeakDbtp4x;
    assert.ok(Math.abs(peak-yssBaseline)<0.05,
      String(sr)+" "+kind+": changed reference-meter baseline "+peak+" vs "+yssBaseline);
    assert.ok(Math.abs(peak-soxrPeak)<0.5,
      String(sr)+" "+kind+": exploratory SoXR deviation exceeds 0.5 dB: "+peak+" vs "+soxrPeak);
    if(Math.abs(peak-ffmpegPeak)>0.5) observedFFmpegDisagreements.push(sr+" "+kind);
    assert.equal(result.truePeakAccuracyStatus,sr===48000
      ? "ANNEX2_48KHZ_REFERENCE_NOT_CERTIFIED" : "NON_48KHZ_UNVERIFIED");
    assert.ok(peak >= result.measurements.samplePeakDbfs-0.000001);
  }
  // Freeze the actual >0.5 dB FFmpeg disagreements, rather than asserting
  // merely that an array was allocated. This is a diagnostic discrepancy
  // inventory, NOT an acceptance/certification threshold for either meter.
  // A deliberate change to the reference meter must re-review this snapshot.
  assert.deepEqual(observedFFmpegDisagreements, [
    "48000 hf12", "44100 nearNyquist", "48000 nearNyquist",
    "44100 initialTransient", "48000 initialTransient",
  ]);
});

test("Stage 1D isolated transients use gated-window LRA availability", () => {
  for(const sr of [44100,48000]) {
    const n=5*sr, initial=new Float32Array(n), middle=new Float32Array(n);
    const impulse=[0,-0.6,0.6,0.6,-0.6,0];
    initial.set(impulse,0); middle.set(impulse,2*sr);
    for(const [position,samples] of [["start",initial],["middle",middle]]) {
      const before=Float32Array.from(samples);
      const result=analyzeStage1aMeterReference([samples,samples],sr);
      // The initial impulse supplies only the first complete 3 s
      // short-term interval; it does not furnish two valid gated windows.
      // A middle impulse persists through multiple overlapping 3 s windows.
      if (position === "start") {
        assert.equal(result.lraAvailability,"INSUFFICIENT_GATED_WINDOWS");
        assert.equal(result.measurements.loudnessRangeLu,null);
      } else {
        assert.equal(result.lraAvailability,"AVAILABLE");
        assert.ok(Number.isFinite(result.measurements.loudnessRangeLu));
      }
      assert.ok(result.equivalentPeakPowerDurationSeconds>0 &&
                result.equivalentPeakPowerDurationSeconds<0.001);
      assert.ok(Number.isFinite(result.measurements.integratedLufs));
      assert.deepEqual(samples,before);
    }
    const silent=analyzeStage1aMeterReference([new Float32Array(n)],sr);
    assert.equal(silent.lraAvailability,"SILENCE");
    assert.equal(silent.measurements.loudnessRangeLu,null);
    assert.equal(silent.equivalentPeakPowerDurationSeconds,0);
    const tooShort=new Float32Array(sr);
    for(let i=0;i<sr;i++) tooShort[i]=0.1*Math.sin(2*Math.PI*1000*i/sr);
    const shorter=analyzeStage1aMeterReference([tooShort],sr);
    assert.equal(shorter.lraAvailability,"TOO_SHORT");
    assert.equal(shorter.measurements.loudnessRangeLu,null);
  }
});

test("Stage 1D preserves ordinary LRA and separates absolute-gate unavailable cases", () => {
  for(const sr of [44100,48000]) {
    const n=20*sr, samples=new Float32Array(n);
    for(let i=0;i<n;i++) samples[i]=(i<10*sr?0.1:0.03162277660168379)*
      Math.sin(2*Math.PI*1000*i/sr);
    const result=analyzeStage1aMeterReference([samples,samples],sr);
    assert.equal(result.lraAvailability,"AVAILABLE");
    assert.ok(Math.abs(result.measurements.loudnessRangeLu-10)<0.15);
    assert.ok(result.equivalentPeakPowerDurationSeconds>0.05);
    const belowGate=new Float32Array(5*sr);
    for(let i=0;i<belowGate.length;i++)
      belowGate[i]=1e-6*Math.sin(2*Math.PI*1000*i/sr);
    const quiet=analyzeStage1aMeterReference([belowGate],sr);
    assert.equal(quiet.lraAvailability,"INSUFFICIENT_GATED_WINDOWS");
    assert.equal(quiet.measurements.integratedLufs,null);
    assert.equal(quiet.measurements.loudnessRangeLu,null);
  }
});

test("Stage 1D LRA validity and true-peak evidence remain disconnected from scoring", async () => {
  const source=await readFile(new URL("../src/lib/liveAudioAnalyzer.ts",import.meta.url),"utf8");
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(source,/equivalentPeakPowerDurationSeconds/);
  assert.doesNotMatch(source,/equivalentPeakPowerDurationSeconds < 0\\.05/);
  assert.match(source,/no 50 ms LRA availability threshold is applied/);
  assert.equal((source.match(/analyzeStage1aMeterReference\(/g)||[]).length,1);
  assert.doesNotMatch(app,/analyzeStage1aMeterReference/);
  assert.doesNotMatch(server,/analyzeStage1aMeterReference/);
});


test("Stage 1D probes 49/51 ms peak energy without imposing LRA availability cutoff", () => {
  for (const sr of [44100, 48000]) {
    const n = 5 * sr;
    // Use 1.0 amplitude to make peak-equivalent duration exactly the pulse
    // duration, apart from integer sample rounding.
    const probe = (durationSeconds) => {
      const pcm = new Float32Array(n);
      pcm.fill(1, sr, sr + Math.round(durationSeconds * sr));
      return analyzeStage1aMeterReference([pcm, pcm], sr);
    };
    const below = probe(0.049);
    const above = probe(0.051);
    assert.ok(below.equivalentPeakPowerDurationSeconds < 0.05);
    assert.ok(above.equivalentPeakPowerDurationSeconds > 0.05);
    for (const result of [below, above]) {
      assert.equal(result.lraAvailability,
        result.measurements.loudnessRangeLu === null ? "INSUFFICIENT_GATED_WINDOWS" : "AVAILABLE");
    }
    // Neither side of the old cutoff automatically suppresses a result.
    assert.ok(Number.isFinite(below.measurements.integratedLufs));
    assert.ok(Number.isFinite(above.measurements.integratedLufs));
  }
});

test("Stage 1D quiet programme plus one peak does not force LRA suppression", () => {
  for (const sr of [44100, 48000]) {
    const n = 10 * sr;
    const pcm = new Float32Array(n);
    for (let i = 0; i < n; i++) pcm[i] = 0.001 * Math.sin(2 * Math.PI * 1000 * i / sr);
    pcm[0] = 1;
    const result = analyzeStage1aMeterReference([pcm, pcm], sr);
    assert.ok(result.equivalentPeakPowerDurationSeconds < 0.05);
    // An isolated peak may distort the exploratory ratio, but cannot
    // independently change LRA availability from the gated-window result.
    // A ten-second continuous tone supplies many gated 3 s observations;
    // a one-sample peak must not erase this window support.
    assert.equal(result.lraAvailability, "AVAILABLE");
    assert.ok(Number.isFinite(result.measurements.loudnessRangeLu));
    assert.ok(Number.isFinite(result.measurements.integratedLufs));
  }
});


test("Stage 2A synthetic FFT energy accounting, Parseval and sample-rate parity", () => {
  for (const sr of [44100, 48000]) {
    const N=4096, seconds=N/sr;
    const zeros=new Float32Array(N);
    const empty=analyzeStage2aSpectralPower([zeros],sr);
    assert.equal(empty.channelTotalPower[0],0);
    assert.equal(empty.channelBandPower[0].reduce((x,y)=>x+y,0),0);
    for (const hz of [1000, 3000, 8000]) {
      // Exact FFT-bin sine: a periodic Hann has spectral lines at k±1.
      const k=Math.round(hz*N/sr), exactHz=k*sr/N;
      const x=Float32Array.from({length:N},(_,i)=>0.4*Math.sin(2*Math.PI*k*i/N));
      const r=analyzeStage2aSpectralPower([x],sr);
      const expected=.4*.4/2;
      assert.ok(Math.abs(r.channelTotalPower[0]-expected)<0.000002,
        "Hann normalized Parseval "+sr+" "+hz);
      const idx=r.bandEdgesHz.findIndex((lo,j)=>j<r.bandEdgesHz.length-1&&exactHz>=lo&&exactHz<r.bandEdgesHz[j+1]);
      assert.ok(idx>=0);
      assert.ok(r.channelBandPower[0][idx]/r.channelTotalPower[0]>.999,
        "known sine energy should remain in target band "+sr+" "+hz);
      const sum=r.channelBandPower[0].reduce((x,y)=>x+y,0)+r.channelUnassignedPower[0];
      assert.ok(Math.abs(sum-r.channelTotalPower[0])<1e-12);
    }
    // Two non-overlapping sine-band components; squared amplitudes add.
    const k1=Math.round(1000*N/sr),k2=Math.round(4000*N/sr);
    const x=Float32Array.from({length:N},(_,i)=>
      0.3*Math.sin(2*Math.PI*k1*i/N)+0.2*Math.sin(2*Math.PI*k2*i/N));
    const multi=analyzeStage2aSpectralPower([x],sr);
    assert.ok(Math.abs(multi.channelTotalPower[0]-(.3**2+.2**2)/2)<2e-6);
    const low=multi.channelBandPower[0][3], high=multi.channelBandPower[0][4];
    assert.ok(Math.abs(low-.3**2/2)<2e-6);
    assert.ok(Math.abs(high-.2**2/2)<2e-6);
    // Channel isolation, including the zero-power right channel.
    const stereo=analyzeStage2aSpectralPower([x,zeros],sr);
    assert.ok(Math.abs(stereo.channelTotalPower[0]-multi.channelTotalPower[0])<1e-12);
    assert.equal(stereo.channelTotalPower[1],0);
    assert.equal(stereo.channelBandPower[1].reduce((x,y)=>x+y,0),0);
    assert.equal(stereo.units,"mean-square-full-scale-pcm");
    assert.equal(stereo.window,"periodic-hann");
    assert.equal(stereo.normalization,"one-sided-parseval-sum-window-squared");
    assert.equal(stereo.fftSize,4096);
    assert.equal(stereo.hopSize,2048);
    assert.ok(seconds>0);
  }
});

test("Stage 2A deterministic white/pink-like noise, boundary and Nyquist accounting", () => {
  for(const sr of [44100,48000]){
    const N=4096; let state=123456789;
    const white=Float32Array.from({length:N},()=>{
      state=(Math.imul(1664525,state)+1013904223)>>>0;
      return (state/4294967296-.5)*.4;
    });
    const w=analyzeStage2aSpectralPower([white],sr);
    const expected=.4**2/12;
    assert.ok(Math.abs(w.channelTotalPower[0]-expected)<.003,
      "white variance compared with analytically known uniform distribution");
    // Coarse 500-2000 and 2000-6000 Hz energy scales with bandwidth.
    const ratio=w.channelBandPower[0][4]/w.channelBandPower[0][3];
    assert.ok(ratio>1.3&&ratio<4.5,"white noise bandwidth ratio "+ratio);
    const pinkish=new Float32Array(N);
    let prev=0;
    for(let i=0;i<N;i++){prev=0.96*prev+white[i];pinkish[i]=prev;}
    const p=analyzeStage2aSpectralPower([pinkish],sr);
    assert.ok(p.channelBandPower[0][3] > p.channelBandPower[0][5],
      "lowpass pink-like synthetic noise has greater mid energy than high treble");
    // At the exact boundary, Hann leakage is expected across both neighbors;
    // the allocation is center-based, conserving all measured FFT energy.
    const k=Math.round(2000*N/sr);
    const edge=Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/N));
    const b=analyzeStage2aSpectralPower([edge],sr);
    assert.ok(b.channelBandPower[0][3]>0&&b.channelBandPower[0][4]>0);
    assert.ok(Math.abs(b.channelBandPower[0].reduce((x,y)=>x+y,0)+b.channelUnassignedPower[0]-b.channelTotalPower[0])<1e-12);
    // A near-Nyquist sinusoid at 44.1/48k is unassigned above 20 kHz.
    const near=Float32Array.from({length:N},(_,i)=>.1*Math.cos(2*Math.PI*(N/2-2)*i/N));
    const n=analyzeStage2aSpectralPower([near],sr);
    assert.ok(n.channelUnassignedPower[0]>.004);
  }
});

test("Stage 2A is diagnostic only, immutable PCM, has no scoring call sites", async () => {
  const src=await readFile(new URL("../src/lib/liveAudioAnalyzer.ts",import.meta.url),"utf8");
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.doesNotMatch(app,/analyzeStage2aSpectralPower|STAGE2A_BANDS_HZ/);
  assert.doesNotMatch(server,/analyzeStage2aSpectralPower|STAGE2A_BANDS_HZ/);
  assert.equal((src.match(/export function analyzeStage2aSpectralPower\(/g)||[]).length,1);
  const pcm=Float32Array.from({length:2048},(_,i)=>Math.sin(i/17));
  const previous=Float32Array.from(pcm);
  const r=analyzeStage2aSpectralPower([pcm],44100);
  assert.deepEqual(pcm,previous);
  assert.equal(r.frames,1);
  assert.throws(()=>analyzeStage2aSpectralPower([new Float32Array(0)],44100),RangeError);
});


test("Stage 2A independently matches time-domain windowed Parseval power", () => {
  const N=4096, hop=2048;
  const window=Float64Array.from({length:N},(_,i)=>0.5-0.5*Math.cos(2*Math.PI*i/N));
  const wsum=window.reduce((a,v)=>a+v*v,0);
  const expected=(pcm,frames)=> {
    let power=0;
    for(let frame=0;frame<frames;frame++)
      for(let i=0;i<N;i++){
        const v=pcm[frame*hop+i]??0;
        power+=(v*window[i])**2/(wsum*frames);
      }
    return power;
  };
  for(const sr of [44100,48000]){
    const n=N+2*hop;
    const pcm=Float32Array.from({length:n},(_,i)=>
      .21*Math.sin(2*Math.PI*941*i/sr)+.08*Math.cos(2*Math.PI*4271*i/sr));
    const r=analyzeStage2aSpectralPower([pcm],sr);
    assert.equal(r.frames,3);
    assert.ok(Math.abs(r.channelTotalPower[0]-expected(pcm,3))<1e-11);
    assert.ok(Math.abs(r.channelBandPower[0].reduce((a,b)=>a+b,0)+r.channelUnassignedPower[0]-expected(pcm,3))<1e-11);
    const short=pcm.slice(0,777);
    const s=analyzeStage2aSpectralPower([short],sr);
    assert.equal(s.frames,1);
    assert.ok(Math.abs(s.channelTotalPower[0]-expected(short,1))<1e-11,
      "zero-padded short buffer must match independent Hann-weighted time energy");
    // Last few samples fall outside the last complete frame.
    const withTail=new Float32Array(N+hop+100);
    withTail.fill(.1);
    const tail=analyzeStage2aSpectralPower([withTail],sr);
    assert.equal(tail.frames,2);
    const changed=Float32Array.from(withTail);
    changed.fill(.9,N+hop);
    const changedResult=analyzeStage2aSpectralPower([changed],sr);
    assert.ok(Math.abs(changedResult.channelTotalPower[0]-tail.channelTotalPower[0])<1e-12,
      "document existing omitted-tail behavior without treating as full-programme RMS");
  }
});

test("Stage 2A independent boundary-bin and leakage accounting", () => {
  for(const sr of [44100,48000]){
    const N=4096;
    for(const edge of [60,250,500,2000,6000,11000,20000]){
      const above=Math.ceil(edge*N/sr), below=above-1;
      if(above>=N/2)continue;
      for(const k of [below,above]){
        const hz=k*sr/N;
        const samples=Float32Array.from({length:N},(_,i)=>.25*Math.sin(2*Math.PI*k*i/N));
        const r=analyzeStage2aSpectralPower([samples],sr);
        const target=r.bandEdgesHz.findIndex((lo,j)=>j<7&&lo<=hz&&hz<r.bandEdgesHz[j+1]);
        const assigned=target>=0?r.channelBandPower[0][target]:r.channelUnassignedPower[0];
        // Periodic Hann spreads sine energy to k-1,k,k+1 (1/6,4/6,1/6).
        assert.ok(assigned/r.channelTotalPower[0]>.65,
          "center bin must dominate its declared half-open band "+sr+" "+edge+" "+k);
        assert.ok(Math.abs(r.channelBandPower[0].reduce((a,b)=>a+b,0)+r.channelUnassignedPower[0]-r.channelTotalPower[0])<1e-11);
      }
    }
  }
});

test("Stage 2A deterministic noise references and omitted-tail invalid PCM", () => {
  const N=4096;
  const win=Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/N));
  const norm=win.reduce((a,x)=>a+x*x,0);
  for(const sr of [44100,48000]){
    let state=0x31415926;
    const noise=Float32Array.from({length:N},()=>{
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      return (state/4294967296-.5)*.4;
    });
    const direct=noise.reduce((s,v,i)=>s+(v*win[i])**2,0)/norm;
    const r=analyzeStage2aSpectralPower([noise],sr);
    assert.ok(Math.abs(r.channelTotalPower[0]-direct)<1e-11,
      "deterministic noise must agree with independently computed weighted variance");
    const bad=new Float32Array(N+200);
    bad[bad.length-1]=Number.NaN;
    assert.throws(()=>analyzeStage2aSpectralPower([bad],sr),RangeError,
      "invalid trailing PCM must not pass validation just because final frame is omitted");
  }
});


test("Stage 2A coverage reports sample union, omitted tail and zero padding", () => {
  for(const sr of [44100,48000]){
    for(const [length,frames,represented,omitted,padded] of [
      [777,1,777,0,3319],[4096,1,4096,0,0],
      [6144,2,6144,0,0],[6244,2,6144,100,0],
      [8192,3,8192,0,0],[8292,3,8192,100,0],
    ]){
      const r=analyzeStage2aSpectralPower([new Float32Array(length)],sr);
      assert.equal(r.inputSampleCount,length);
      assert.equal(r.frames,frames);
      assert.equal(r.representedSampleCount,represented);
      assert.equal(r.omittedTrailingSampleCount,omitted);
      assert.equal(r.zeroPaddedSampleCount,padded);
      assert.equal(r.representedSampleCount+r.omittedTrailingSampleCount,length);
    }
  }
});

test("Stage 2A independent analytic per-band spectral power reference", () => {
  const N=4096,edges=[20,60,250,500,2000,6000,11000,20000],amp=.3;
  for(const sr of [44100,48000]){
    const hzPerBin=sr/N;
    // Exact-bin tone has periodic-Hann bin weights 1/6, 4/6, 1/6
    // of A²/2. This expected result does not use the implementation FFT.
    for(let b=0;b<7;b++){
      const center=(edges[b]+edges[b+1])/2;
      const k=Math.round(center/hzPerBin);
      if(k<3||k>N/2-3)continue;
      const samples=Float32Array.from({length:N},(_,i)=>amp*Math.sin(2*Math.PI*k*i/N));
      const measured=analyzeStage2aSpectralPower([samples],sr);
      const expectedBands=new Array(7).fill(0);
      let expectedUnassigned=0;
      for(const [bin,weight] of [[k-1,1/6],[k,4/6],[k+1,1/6]]){
        const freq=bin*hzPerBin, power=(amp*amp/2)*weight;
        const band=edges.findIndex((lo,j)=>j<7&&freq>=lo&&freq<edges[j+1]);
        if(band<0)expectedUnassigned+=power;
        else expectedBands[band]+=power;
      }
      for(let j=0;j<7;j++)
        assert.ok(Math.abs(measured.channelBandPower[0][j]-expectedBands[j])<2e-8,
          "analytic Hann band "+sr+" target "+b+" measured "+j);
      assert.ok(Math.abs(measured.channelUnassignedPower[0]-expectedUnassigned)<2e-8);
      assert.ok(Math.abs(measured.channelTotalPower[0]-amp*amp/2)<2e-8);
    }
  }
});


test("Stage 2B1 calibrated low-band steady PCM references at 44.1/48k",()=>{
  for(const sr of [44100,48000]){
    const N=4096,kSub=Math.round(40*N/sr),kBass=Math.round(120*N/sr);
    const samples=Float32Array.from({length:8192},(_,i)=>
      .2*Math.sin(2*Math.PI*kSub*i/N)+.3*Math.sin(2*Math.PI*kBass*i/N));
    const r=analyzeStage2b1LowFrequency([samples],sr);
    assert.equal(r.frames.length,3);
    for(const fr of r.frames){
      assert.ok(Math.abs(fr.channelBandPower[0][0]-.2**2/2)<2e-7);
      assert.ok(Math.abs(fr.channelBandPower[0][1]-.3**2/2)<2e-7);
      assert.equal(fr.startSeconds,fr.startSample/sr);
      assert.equal(fr.centerSeconds,(fr.startSample+2048)/sr);
    }
    assert.deepEqual(r.frames[0].channelBandPowerChangeDb,[[null,null]]);
    for(const fr of r.frames.slice(1)){
      assert.ok(Math.abs(fr.channelBandPowerChangeDb[0][0])<1e-7);
      assert.ok(Math.abs(fr.channelBandPowerChangeDb[0][1])<1e-7);
      assert.deepEqual(fr.transientLikeRise,[[false,false]]);
    }
    assert.equal(r.omittedTrailingSampleCount,0);
  }
});

test("Stage 2B1 synthetic silence, burst rise and independent stereo channels",()=>{
  for(const sr of [44100,48000]){
    const N=4096,k=Math.round(110*N/sr);
    const quiet=Float32Array.from({length:8192},(_,i)=>
      i<4096?0.025*Math.sin(2*Math.PI*k*i/N):.25*Math.sin(2*Math.PI*k*i/N));
    const silent=new Float32Array(8192);
    const r=analyzeStage2b1LowFrequency([quiet,silent],sr);
    assert.equal(r.channelCount,2);
    assert.equal(r.frames.length,3);
    assert.equal(r.frames[0].channelBandPower[1][1],0);
    assert.equal(r.frames[0].channelBandPowerChangeDb[0][1],null);
    assert.equal(r.frames[1].channelBandPowerChangeDb[1][1],null);
    assert.equal(r.frames[1].transientLikeRise[0][1],true);
    assert.ok(r.frames[1].channelBandPowerChangeDb[0][1]>6);
    assert.equal(r.frames[2].transientLikeRise[0][1],false);
    const z=analyzeStage2b1LowFrequency([silent],sr);
    assert.ok(z.frames.every(f=>f.channelBandPower[0].every(v=>v===0)));
    assert.ok(z.frames.every(f=>f.channelBandPowerChangeDb[0].every(v=>v===null)));
  }
});

test("Stage 2B1 short input and unmeasured tail expose honest coverage",()=>{
  for(const sr of [44100,48000]){
    const x=new Float32Array(777);
    const short=analyzeStage2b1LowFrequency([x],sr);
    assert.equal(short.frames.length,1);
    assert.equal(short.representedSampleCount,777);
    assert.equal(short.zeroPaddedSampleCount,3319);
    assert.equal(short.omittedTrailingSampleCount,0);
    const y=new Float32Array(6244);
    const before=analyzeStage2b1LowFrequency([y],sr);
    y.fill(.9,6144);
    const after=analyzeStage2b1LowFrequency([y],sr);
    assert.equal(after.omittedTrailingSampleCount,100);
    assert.deepEqual(after.frames.map(f=>f.channelBandPower),before.frames.map(f=>f.channelBandPower));
    y[6243]=NaN;
    assert.throws(()=>analyzeStage2b1LowFrequency([y],sr),RangeError);
  }
});

test("Stage 2B1 remains unconnected to production scoring",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.doesNotMatch(app,/analyzeStage2b1LowFrequency/);
  assert.doesNotMatch(server,/analyzeStage2b1LowFrequency/);
});


test("Stage 2B1 low-energy floor, silence and zero-to-signal transitions",()=>{
  for(const sr of [44100,48000]){
    const N=4096,k=Math.round(110*N/sr);
    const generate=(amp)=>Float32Array.from({length:N+2048},(_,i)=>amp*Math.sin(2*Math.PI*k*i/N));
    const silent=analyzeStage2b1LowFrequency([generate(0)],sr);
    assert.equal(silent.frames[1].channelBandPowerChangeDb[0][1],null);
    const near=analyzeStage2b1LowFrequency([generate(1e-7)],sr);
    assert.equal(near.frames[1].channelBandPowerChangeDb[0][1],null);
    const measured=analyzeStage2b1LowFrequency([generate(.1)],sr);
    assert.equal(measured.minimumValidBandPower,1e-12);
    assert.ok(Math.abs(measured.frames[1].channelBandPowerChangeDb[0][1])<1e-8);
    const x=new Float32Array(N+2048);
    for(let i=N;i<x.length;i++)x[i]=.1*Math.sin(2*Math.PI*k*i/N);
    const onset=analyzeStage2b1LowFrequency([x],sr);
    assert.equal(onset.frames[1].channelBandPowerChangeDb[0][1],null);
    assert.equal(onset.frames[1].transientLikeRise[0][1],null);
  }
});

test("Stage 2B1 exploratory 6 dB rise marker brackets threshold",()=>{
  for(const sr of [44100,48000]){
    const N=4096,k=Math.round(110*N/sr);
    // Exponential envelope scales samples one hop apart by exactly
    // 10^(targetDb/20), preserving Hann-windowed power-ratio expectations.
    const make=(targetDb)=>Float32Array.from({length:N+2048},(_,i)=>
      .001*Math.pow(10,(targetDb/20)*(i/2048))*Math.sin(2*Math.PI*k*i/N));
    const below=analyzeStage2b1LowFrequency([make(5.9)],sr);
    const above=analyzeStage2b1LowFrequency([make(6.1)],sr);
    const low=below.frames[1].channelBandPowerChangeDb[0][1];
    const high=above.frames[1].channelBandPowerChangeDb[0][1];
    assert.ok(low!==null&&high!==null&&Math.abs(low-5.9)<.001&&Math.abs(high-6.1)<.001&&low<6&&high>6,
      "actual calibrated frame-power ratio must straddle 6 dB");
    assert.equal(below.frames[1].transientLikeRise[0][1],false);
    assert.equal(above.frames[1].transientLikeRise[0][1],true);
  }
});

test("Stage 2B1 bounded synthetic 60s stereo performance at both sample rates",()=>{
  for(const sr of [44100,48000]){
    const n=sr*60,l=new Float32Array(n),r=new Float32Array(n);
    for(let i=0;i<n;i++){
      l[i]=.09*Math.sin(2*Math.PI*73*i/sr);
      r[i]=.07*Math.sin(2*Math.PI*137*i/sr);
    }
    const start=performance.now();
    const result=analyzeStage2b1LowFrequency([l,r],sr);
    const elapsed=performance.now()-start;
    const expected=1+Math.floor((n-4096)/2048);
    assert.equal(result.frames.length,expected);
    assert.equal(result.frames[0].channelBandPower.length,2);
    assert.ok(elapsed<20000,"Stage 2B1 60s stereo "+sr+" exceeded 20s: "+elapsed.toFixed(1)+"ms");
    console.log("Stage 2B1 60s stereo "+sr+": "+elapsed.toFixed(1)+"ms; frames="+expected+"; FFTs="+expected*2+"; PCM bytes="+(l.byteLength+r.byteLength));
  }
});


test("Stage 2B2 analytical stereo polarity, gain, quadrature and mono sum",()=>{
  for(const sr of [44100,48000]){
    const N=4096,k1=Math.round(40*N/sr),k2=Math.round(120*N/sr);
    for(const k of [k1,k2]){
      const x=Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/N));
      const neg=Float32Array.from(x,v=>-v);
      const half=Float32Array.from(x,v=>v/2);
      const orth=Float32Array.from({length:N},(_,i)=>.2*Math.cos(2*Math.PI*k*i/N));
      const idx=k===k1?0:1;
      const same=analyzeStage2b2Stereo([x,x],sr).frames[0].bands[idx];
      assert.equal(same.status,"VALID");
      assert.ok(Math.abs(same.correlation-1)<1e-6);
      assert.ok(Math.abs(same.monoChangeDb)<.001);
      assert.ok(Math.abs(same.monoPower-.02)<2e-7);
      const opposite=analyzeStage2b2Stereo([x,neg],sr).frames[0].bands[idx];
      assert.equal(opposite.status,"COMPLETE_CANCELLATION");
      assert.equal(opposite.monoChangeDb,null);
      assert.ok(Math.abs(opposite.correlation+1)<1e-6);
      const gain=analyzeStage2b2Stereo([x,half],sr).frames[0].bands[idx];
      assert.ok(Math.abs(gain.asymmetryDb-20*Math.log10(2))<.001);
      const quadrature=analyzeStage2b2Stereo([x,orth],sr).frames[0].bands[idx];
      assert.ok(Math.abs(quadrature.correlation)<1e-6);
      assert.ok(Math.abs(quadrature.monoChangeDb+10*Math.log10(2))<.001);
      assert.ok(Math.abs(quadrature.monoPower-(quadrature.leftPower+quadrature.rightPower)/4)<2e-7);
    }
  }
});

test("Stage 2B2 silence, mono, one-sided, coverage, invalid tail and bands",()=>{
  for(const sr of [44100,48000]){
    const N=4096,k=Math.round(105*N/sr);
    const x=Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/N));
    const zero=new Float32Array(N);
    assert.equal(analyzeStage2b2Stereo([x],sr).frames[0].bands[1].status,"MONO_NOT_APPLICABLE");
    assert.equal(analyzeStage2b2Stereo([zero,zero],sr).frames[0].bands[1].status,"INSUFFICIENT_ENERGY");
    const single=analyzeStage2b2Stereo([x,zero],sr).frames[0].bands[1];
    assert.equal(single.status,"SINGLE_CHANNEL");
    assert.equal(single.correlation,null);
    assert.equal(single.asymmetryDb,null);
    assert.ok(Math.abs(single.monoChangeDb+10*Math.log10(2))<.001);
    const short=analyzeStage2b2Stereo([new Float32Array(777),new Float32Array(777)],sr);
    assert.equal(short.zeroPaddedSampleCount,3319);
    const a=new Float32Array(6244),b=new Float32Array(6244);
    const baseline=analyzeStage2b2Stereo([a,b],sr);
    a.fill(.3,6144);
    const changed=analyzeStage2b2Stereo([a,b],sr);
    assert.equal(changed.omittedTrailingSampleCount,100);
    assert.deepEqual(changed.frames,baseline.frames);
    a[6243]=NaN;
    assert.throws(()=>analyzeStage2b2Stereo([a,b],sr),RangeError);
  }
});

test("Stage 2B2 60-second stereo synthetic bounded performance",()=>{
  for(const sr of [44100,48000]){
    const n=sr*60,l=new Float32Array(n),r=new Float32Array(n);
    for(let i=0;i<n;i++){
      l[i]=.08*Math.sin(2*Math.PI*83*i/sr);
      r[i]=.07*Math.sin(2*Math.PI*83*i/sr);
    }
    const start=performance.now(),result=analyzeStage2b2Stereo([l,r],sr);
    const elapsed=performance.now()-start;
    assert.equal(result.frames.length,1+Math.floor((n-4096)/2048));
    assert.ok(elapsed<20000,"Stage 2B2 60s "+sr+" exceeded 20s: "+elapsed+"ms");
    console.log("Stage 2B2 60s stereo "+sr+": "+elapsed.toFixed(1)+"ms; frames="+result.frames.length);
  }
});

test("Stage 2B2 is not connected to production scoring",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.doesNotMatch(app,/analyzeStage2b2Stereo/);
  assert.doesNotMatch(server,/analyzeStage2b2Stereo/);
});


test("Stage 2B2 independent direct mono FFT and unequal-gain reference",()=>{
  for(const sr of [44100,48000]){
    const N=4096,k=Math.round(110*N/sr), gain=.13;
    const l=Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/N));
    const r=Float32Array.from(l,v=>gain*v);
    const mono=Float32Array.from(l,(v,i)=>(v+r[i])/2);
    // Reference mono power comes from the independently tested Stage 2A
    // spectral analyzer of a physically summed PCM waveform, not 2B2.
    const independent=analyzeStage2aSpectralPower([mono],sr).channelBandPower[0][1];
    const measurement=analyzeStage2b2Stereo([l,r],sr).frames[0].bands[1];
    assert.ok(Math.abs(measurement.monoPower-independent)<2e-8);
    assert.ok(Math.abs(measurement.asymmetryDb-20*Math.log10(1/gain))<.001);
    assert.ok(Math.abs(measurement.correlation-1)<1e-6);
    const avg=(measurement.leftPower+measurement.rightPower)/2;
    assert.ok(Math.abs(measurement.monoChangeDb-10*Math.log10(independent/avg))<.001);
  }
});

test("Stage 2B2 relative near-cancellation crossing and small phase offsets",()=>{
  for(const sr of [44100,48000]){
    const N=4096,k=Math.round(110*N/sr), amp=.2;
    const left=Float32Array.from({length:N},(_,i)=>amp*Math.sin(2*Math.PI*k*i/N));
    for(const epsilon of [4e-7,4e-6,1e-4]){
      // Analytic gain mismatch: R=-(1-epsilon)L.
      // Relative mono power is epsilon^2/[2*(1+(1-epsilon)^2)].
      const right=Float32Array.from(left,x=>-(1-epsilon)*x);
      const b=analyzeStage2b2Stereo([left,right],sr).frames[0].bands[1];
      const expected=epsilon*epsilon/(2*(1+(1-epsilon)**2));
      const reference=analyzeStage2aSpectralPower([Float32Array.from(left,(x,i)=>(x+right[i])/2)],sr).channelBandPower[0][1];
      assert.ok(Math.abs(b.monoPower-reference)<2e-8);
      const observed=b.monoPower/((b.leftPower+b.rightPower)/2);
      assert.ok(Math.abs(observed-expected)<1e-10);
      assert.equal(b.status,expected<=1e-12?"COMPLETE_CANCELLATION":"VALID");
    }
    for(const phase of [.001,.02]){
      const right=Float32Array.from({length:N},(_,i)=>-amp*Math.sin(2*Math.PI*k*i/N+phase));
      const b=analyzeStage2b2Stereo([left,right],sr).frames[0].bands[1];
      const independent=analyzeStage2aSpectralPower([Float32Array.from(left,(x,i)=>(x+right[i])/2)],sr).channelBandPower[0][1];
      assert.ok(Math.abs(b.monoPower-independent)<2e-8);
      assert.equal(b.status,"VALID");
      assert.ok(b.monoChangeDb<0);
    }
  }
});

test("Stage 2B2 distinct-frequency orthogonality and 60 Hz Hann leakage",()=>{
  for(const sr of [44100,48000]){
    const N=4096,step=sr/N,edgeBin=Math.ceil(60/step);
    const kA=Math.round(100/step),kB=kA+4;
    const sine=(k)=>Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/N));
    const distinct=analyzeStage2b2Stereo([sine(kA),sine(kB)],sr).frames[0].bands[1];
    assert.ok(Math.abs(distinct.correlation)<1e-6);
    assert.ok(Math.abs(distinct.monoChangeDb+10*Math.log10(2))<.001);
    // Periodic Hann exact-bin tone occupies k-1,k,k+1; compare
    // left/right band power with independent Stage2A reference.
    for(const k of [edgeBin-1,edgeBin,edgeBin+1]){
      const x=sine(k);
      const ref=analyzeStage2aSpectralPower([x],sr).channelBandPower[0].slice(0,2);
      const measured=analyzeStage2b2Stereo([x,x],sr).frames[0].bands;
      for(let band=0;band<2;band++)
        assert.ok(Math.abs(measured[band].leftPower-ref[band])<2e-8);
      assert.ok(Math.abs(measured[0].leftPower+measured[1].leftPower-.02)<2e-7);
    }
  }
});


test("Stage 2C1 provenance, immutable synthesis and cancellation versus silence",()=>{
  for(const sr of [44100,48000]){
    const N=8192,k=Math.round(110*4096/sr);
    const left=Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/4096));
    const inverted=Float32Array.from(left,x=>-x);
    const get=(a,b)=>assembleStage2c1EngineeringEvidence(
      analyzeStage2aSpectralPower([a,b],sr),
      analyzeStage2b1LowFrequency([a,b],sr),
      analyzeStage2b2Stereo([a,b],sr));
    const report=get(left,inverted);
    assert.equal(report.scoringImpact,"NONE");
    assert.equal(report.schemaVersion,"stage2c1-engineering-evidence-v1");
    assert.equal(report.sourceProvenance.sampleRate,sr);
    assert.equal(report.sourceProvenance.channelCount,2);
    assert.equal(report.bands[1].cancellationFrames,3);
    assert.deepEqual(report.bands[1].cancellationFrameIndices,[0,1,2]);
    assert.equal(report.bands[1].cancellationDenominator,3);
    assert.equal(report.bands[1].stereoStatusCounts.COMPLETE_CANCELLATION,3);
    const silence=get(new Float32Array(N),new Float32Array(N));
    assert.equal(silence.bands[1].cancellationFrames,0);
    assert.equal(silence.bands[1].stereoStatusCounts.INSUFFICIENT_ENERGY,3);
    const s=analyzeStage2aSpectralPower([left,inverted],sr);
    const t=analyzeStage2b1LowFrequency([left,inverted],sr);
    const p=analyzeStage2b2Stereo([left,inverted],sr);
    const before=[JSON.stringify(s),JSON.stringify(t),JSON.stringify(p)];
    assembleStage2c1EngineeringEvidence(s,t,p);
    assert.deepEqual([JSON.stringify(s),JSON.stringify(t),JSON.stringify(p)],before);
    const incompatible={...t,sampleRate:sr+1};
    assert.throws(()=>assembleStage2c1EngineeringEvidence(s,incompatible,p),RangeError);
    const missing={...p,frames:p.frames.slice(1)};
    assert.throws(()=>assembleStage2c1EngineeringEvidence(s,t,missing),RangeError);
  }
});

test("Stage 2C1 mono/sparse evidence, valid comparison denominators and tail",()=>{
  for(const sr of [44100,48000]){
    const N=6244,a=new Float32Array(N);
    const s=analyzeStage2aSpectralPower([a],sr);
    const t=analyzeStage2b1LowFrequency([a],sr);
    const p=analyzeStage2b2Stereo([a],sr);
    const e=assembleStage2c1EngineeringEvidence(s,t,p);
    assert.equal(e.sourceProvenance.omittedTrailingSampleCount,100);
    assert.equal(e.bands[0].stereoValidFrames,0);
    assert.equal(e.bands[0].stereoStatusCounts.MONO_NOT_APPLICABLE,2);
    assert.equal(e.bands[0].riseCount,0);
    assert.equal(e.bands[0].riseValidComparisons,0);
    assert.equal(e.bands[0].frameEvidence.length,2);
    const sparse=new Float32Array(N);
    const k=Math.round(40*4096/sr);
    for(let i=0;i<N;i++)sparse[i]=.05*Math.sin(2*Math.PI*k*i/4096);
    const evidence=assembleStage2c1EngineeringEvidence(
      analyzeStage2aSpectralPower([sparse],sr),
      analyzeStage2b1LowFrequency([sparse],sr),
      analyzeStage2b2Stereo([sparse],sr));
    assert.equal(evidence.scoringImpact,"NONE");
    assert.equal(evidence.bands[0].cancellationFrames,0);
    assert.ok(evidence.bands[0].spectralChannelPower[0]>0);
  }
});

test("Stage 2C1 remains absent from scoring and report routes",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.doesNotMatch(app,/assembleStage2c1EngineeringEvidence/);
  assert.doesNotMatch(server,/assembleStage2c1EngineeringEvidence/);
});


test("Stage 2C1 reports brief cancellation separately from sustained coverage",()=>{
  for(const sr of [44100,48000]){
    const N=8192,k=Math.round(110*4096/sr);
    const l=Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/4096));
    const r=Float32Array.from(l,(x,i)=>i<4096?-x:x);
    const summary=assembleStage2c1EngineeringEvidence(
      analyzeStage2aSpectralPower([l,r],sr),
      analyzeStage2b1LowFrequency([l,r],sr),
      analyzeStage2b2Stereo([l,r],sr));
    assert.deepEqual(summary.bands[1].cancellationFrameIndices,[0]);
    assert.equal(summary.bands[1].cancellationFrames,1);
    assert.equal(summary.bands[1].cancellationDenominator,3);
    assert.equal(summary.bands[1].stereoValidFrames,2);
    assert.equal(summary.scoringImpact,"NONE");
  }
});

test("Stage 2C1 bounded assembly over 60s synthetic precomputed frames",()=>{
  for(const sr of [44100,48000]){
    const n=sr*60;
    const l=new Float32Array(n),r=new Float32Array(n);
    for(let i=0;i<n;i++){
      l[i]=.06*Math.sin(2*Math.PI*85*i/sr);
      r[i]=.04*Math.sin(2*Math.PI*85*i/sr);
    }
    const s=analyzeStage2aSpectralPower([l,r],sr);
    const t=analyzeStage2b1LowFrequency([l,r],sr);
    const p=analyzeStage2b2Stereo([l,r],sr);
    const before=performance.now();
    const summary=assembleStage2c1EngineeringEvidence(s,t,p);
    const elapsed=performance.now()-before;
    assert.equal(summary.bands[0].frameCount,t.frames.length);
    assert.ok(elapsed<1000,"Stage 2C1 assembly exceeded 1 second: "+elapsed.toFixed(1)+" ms");
    console.log("Stage 2C1 60s "+sr+" assembly: "+elapsed.toFixed(1)+"ms; frames="+t.frames.length);
  }
});


test("Stage 2C1 rejects malformed provenance, nested evidence and tampered frame statuses",()=>{
  for(const sr of [44100,48000]){
    const N=8192,k=Math.round(110*4096/sr);
    const l=Float32Array.from({length:N},(_,i)=>.15*Math.sin(2*Math.PI*k*i/4096));
    const r=Float32Array.from(l,x=>-.5*x);
    const spectral=analyzeStage2aSpectralPower([l,r],sr);
    const temporal=analyzeStage2b1LowFrequency([l,r],sr);
    const stereo=analyzeStage2b2Stereo([l,r],sr);
    const clone=x=>JSON.parse(JSON.stringify(x));
    const assertRejected=(modify)=>{
      const a=clone(spectral),b=clone(temporal),c=clone(stereo);
      modify(a,b,c);
      assert.throws(()=>assembleStage2c1EngineeringEvidence(a,b,c),RangeError);
    };
    assert.doesNotThrow(()=>assembleStage2c1EngineeringEvidence(spectral,temporal,stereo));
    assertRejected((a)=>{a.frames+=1});
    assertRejected((a)=>{a.channelBandPower[0][0]=-1});
    assertRejected((a)=>{a.normalization="tampered"});
    assertRejected((a)=>{a.representedSampleCount-=1});
    assertRejected((a)=>{a.channelCount=1});
    assertRejected((a,b)=>{b.frames[0].centerSeconds+=.01});
    assertRejected((a,b,c)=>{b.frames[0].centerSeconds+=.01;c.frames[0].centerSeconds+=.01});
    assertRejected((a,b)=>{b.frames[1].channelBandPowerChangeDb[0]=null});
    assertRejected((a,b)=>{b.frames[1].channelBandPower[0][1]=NaN});
    assertRejected((a,b)=>{b.frames[1].transientLikeRise[0][1]="true"});
    assertRejected((a,b)=>{b.frames[1].transientLikeRise[0][1]=null});
    assertRejected((a,b)=>{b.frames[1].transientLikeRise[0][1]=!b.frames[1].transientLikeRise[0][1]});
    assertRejected((a,b)=>{b.frames[1].channelBandPowerChangeDb[0][1]+=3});
    assertRejected((a,b,c)=>{c.frames[0].bands[0].status="MONO_NOT_APPLICABLE"});
    assertRejected((a,b,c)=>{c.frames[0].bands[1].status="MALFORMED"});
    assertRejected((a,b,c)=>{c.frames[1].bands[1].correlation=Infinity});
    assertRejected((a,b,c)=>{c.frames[1].bands[1].monoPower=-.1});
    assertRejected((a,b,c)=>{c.frames[1].bands[1].status="COMPLETE_CANCELLATION"});
    const summary=assembleStage2c1EngineeringEvidence(spectral,temporal,stereo);
    for(const band of summary.bands){
      assert.equal(Object.values(band.stereoStatusCounts).reduce((x,y)=>x+y,0),band.frameCount);
      assert.ok(band.riseValidComparisons<=band.frameCount*2);
      assert.ok(band.riseCount<=band.riseValidComparisons);
    }
  }
});

test("Stage 2C1 rejects inconsistent mono status across frames",()=>{
  for(const sr of [44100,48000]){
    const pcm=new Float32Array(6144);
    const a=analyzeStage2aSpectralPower([pcm],sr);
    const b=analyzeStage2b1LowFrequency([pcm],sr);
    const c=analyzeStage2b2Stereo([pcm],sr);
    assert.doesNotThrow(()=>assembleStage2c1EngineeringEvidence(a,b,c));
    const tampered=JSON.parse(JSON.stringify(c));
    tampered.frames[1].bands[1].status="INSUFFICIENT_ENERGY";
    assert.throws(()=>assembleStage2c1EngineeringEvidence(a,b,tampered),RangeError);
  }
});


test("Stage 2C2A enabled/disabled equivalence, failure isolation and provenance",()=>{
  for(const sr of [44100,48000]){
    const N=6144,one=Float32Array.from({length:N},(_,i)=>.07*Math.sin(2*Math.PI*105*i/sr));
    for(const channels of [[one],[one,Float32Array.from(one,x=>-x)],[new Float32Array(N),new Float32Array(N)]]){
      const originals=channels.map(x=>Array.from(x));
      const audio={sampleRate:sr,numberOfChannels:channels.length,getChannelData:i=>channels[i]};
      const disabled=runStage2c2aBrowserDiagnostics(audio,false);
      assert.deepEqual(disabled,{status:"DISABLED"});
      const available=runStage2c2aBrowserDiagnostics(audio,true);
      assert.equal(available.status,"AVAILABLE");
      assert.equal(available.evidence.scoringImpact,"NONE");
      assert.equal(available.evidence.sourceProvenance.sampleRate,sr);
      assert.equal(available.evidence.sourceProvenance.channelCount,channels.length);
      assert.deepEqual(channels.map(x=>Array.from(x)),originals);
      if(channels.length===1)assert.equal(available.evidence.bands[0].stereoStatusCounts.MONO_NOT_APPLICABLE,2);
    }
    assert.deepEqual(runStage2c2aBrowserDiagnostics({sampleRate:sr,numberOfChannels:3,getChannelData:()=>one},true),{status:"UNAVAILABLE",reason:"UNSUPPORTED_CHANNEL_COUNT"});
    assert.deepEqual(runStage2c2aBrowserDiagnostics({sampleRate:sr,numberOfChannels:1,getChannelData:()=>{throw Error("decoding unavailable")}},true),{status:"UNAVAILABLE",reason:"DIAGNOSTIC_COMPUTATION_FAILED"});
  }
});

test("Stage 2C2A browser hook defaults off and never feeds scoring or report",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(app,/const STAGE2C2A_DIAGNOSTICS_ENABLED = false/);
  assert.match(app,/if \(STAGE2C2A_DIAGNOSTICS_ENABLED &&\s*diagnosticGeneration === auralisDiagnosticGenerationRef\.current\)/);
  assert.doesNotMatch(server,/runStage2c2aBrowserDiagnostics/);
  assert.doesNotMatch(app,/overriddenCritique\.engineeringEvidence|formData\.append\("engineeringEvidence"/);
});


test("Stage 2C2A 60s stereo bounded end-to-end diagnostic computation",()=>{
  for(const sr of [44100,48000]){
    const n=sr*60,left=new Float32Array(n),right=new Float32Array(n);
    for(let i=0;i<n;i++){
      left[i]=.06*Math.sin(2*Math.PI*85*i/sr);
      right[i]=.04*Math.sin(2*Math.PI*85*i/sr);
    }
    const audio={sampleRate:sr,numberOfChannels:2,getChannelData:i=>i===0?left:right};
    const start=performance.now(),out=runStage2c2aBrowserDiagnostics(audio,true);
    const elapsed=performance.now()-start;
    assert.equal(out.status,"AVAILABLE");
    assert.equal(out.evidence.scoringImpact,"NONE");
    assert.equal(out.evidence.bands[0].frameCount,1+Math.floor((n-4096)/2048));
    assert.ok(elapsed<20000,"Stage 2C2A 60s exceeded 20s: "+elapsed.toFixed(1)+"ms");
    console.log("Stage 2C2A 60s "+sr+": "+elapsed.toFixed(1)+"ms; input PCM bytes="+(left.byteLength+right.byteLength));
  }
});


test("Stage 2C2B worker protocol retains legacy batch analysis and transfers copied PCM",async()=>{
  const worker=await readFile(new URL("../src/workers/audioAnalysisWorker.ts",import.meta.url),"utf8");
  const bridge=await readFile(new URL("../src/lib/batchAudioWorker.ts",import.meta.url),"utf8");
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  assert.match(worker,/kind === "ENGINEERING_DIAGNOSTICS"/);
  assert.match(worker,/runStage2c2aBrowserDiagnostics/);
  assert.match(worker,/const metrics = analyzePcmData\(/);
  assert.match(worker,/postMessage\(\{ ok: true, metrics \}\)/);
  assert.match(bridge,/new Float32Array\(audioBuffer.getChannelData\(0\)\)/);
  assert.match(bridge,/kind:"ENGINEERING_DIAGNOSTICS"/);
  assert.match(bridge,/worker\?\.terminate\(\)/);
  assert.match(bridge,/WORKER_MESSAGE_ERROR/);
  assert.match(bridge,/INPUT_BUDGET_EXCEEDED/);
  assert.match(bridge,/reason:"TIMEOUT"/);
  assert.match(app,/const STAGE2C2A_DIAGNOSTICS_ENABLED = false;/);
  assert.match(app,/const STAGE2C2A_DIAGNOSTICS_ENABLED = false;/);
  assert.match(app,/if \(STAGE2C2A_DIAGNOSTICS_ENABLED &&\s*diagnosticGeneration === auralisDiagnosticGenerationRef\.current\)/);
});

test("Stage 2C2B direct worker-compatible engineering DSP 60s and 5min bounded synthetic inputs",()=>{
  for(const sr of [44100,48000]){
    for(const duration of [60,300]){
      const n=sr*duration;
      const ch0=new Float32Array(n),ch1=new Float32Array(n);
      for(let i=0;i<n;i++){ch0[i]=.05*Math.sin(2*Math.PI*92*i/sr);ch1[i]=.04*Math.sin(2*Math.PI*92*i/sr)}
      const before=performance.now();
      const out=runStage2c2aBrowserDiagnostics({sampleRate:sr,numberOfChannels:2,getChannelData:i=>i===0?ch0:ch1},true);
      const elapsed=performance.now()-before;
      assert.equal(out.status,"AVAILABLE");
      assert.equal(out.evidence.scoringImpact,"NONE");
      assert.equal(out.evidence.sourceProvenance.channelCount,2);
      assert.ok(elapsed<20000,"Exceeded 20sec bounded synthetic limit: "+elapsed);
      const bytes=ch0.byteLength+ch1.byteLength;
      assert.ok(bytes<=128*1024*1024);
      console.log("Stage 2C2B "+duration+"s "+sr+": "+elapsed.toFixed(1)+"ms; PCM transfer budget="+bytes);
    }
  }
});


test("Stage 2C2B worker bridge cancellation, failure and transfer-copy ownership",async()=>{
  const original=globalThis.Worker;
  const originalPcm=Float32Array.from({length:4096},(_,i)=>.02*Math.sin(2*Math.PI*90*i/44100));
  const audio={numberOfChannels:1,length:originalPcm.length,sampleRate:44100,getChannelData:()=>originalPcm};
  let latest;
  class FakeWorker {
    terminated=false;
    constructor(){latest=this}
    postMessage(payload,transfer){
      assert.equal(payload.kind,"ENGINEERING_DIAGNOSTICS");
      assert.notEqual(payload.ch0,originalPcm.buffer);
      assert.equal(transfer.length,1);
      assert.deepEqual(Array.from(new Float32Array(payload.ch0)),Array.from(originalPcm));
      this.payload=payload;
    }
    terminate(){this.terminated=true}
  }
  globalThis.Worker=FakeWorker;
  try {
    assert.deepEqual(await analyzeEngineeringDiagnosticsInWorker(audio,undefined,1),{status:"UNAVAILABLE",reason:"INPUT_BUDGET_EXCEEDED"});
    const ac=new AbortController();
    const pending=analyzeEngineeringDiagnosticsInWorker(audio,ac.signal);
    ac.abort();
    assert.deepEqual(await pending,{status:"CANCELLED",reason:"ABORTED"});
    assert.equal(latest.terminated,true);
    assert.equal(originalPcm.byteLength,4096*4);
    const error=analyzeEngineeringDiagnosticsInWorker(audio);
    latest.onerror({message:"crash"});
    assert.deepEqual(await error,{status:"UNAVAILABLE",reason:"WORKER_ERROR"});
    assert.equal(latest.terminated,true);
    const invalid=analyzeEngineeringDiagnosticsInWorker(audio);
    latest.onmessage({data:{kind:"ENGINEERING_DIAGNOSTICS",status:"AVAILABLE",evidence:{scoringImpact:"SCORE"}}});
    assert.deepEqual(await invalid,{status:"UNAVAILABLE",reason:"DIAGNOSTIC_COMPUTATION_FAILED"});
    const already=new AbortController();already.abort();
    assert.deepEqual(await analyzeEngineeringDiagnosticsInWorker(audio,already.signal),{status:"CANCELLED",reason:"ABORTED"});
  } finally {globalThis.Worker=original}
});


test("Stage 2C2B-1B browser hook remains disabled and nonblocking",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  assert.match(app,/const STAGE2C2A_DIAGNOSTICS_ENABLED = false;/);
  assert.match(app,/if \(STAGE2C2A_DIAGNOSTICS_ENABLED &&\s*diagnosticGeneration === auralisDiagnosticGenerationRef\.current\)/);
  assert.match(app,/void analyzeEngineeringDiagnosticsInWorker\(audioBuffer, controller\.signal\)/);
  assert.match(app,/\.catch\(\(\) => \{[\s\S]*?console\.warn\("\[Stage2C2B\] Diagnostic worker unavailable"\)/);
  assert.doesNotMatch(app,/runStage2c2aBrowserDiagnostics\(audioBuffer/);
  assert.doesNotMatch(app,/await analyzeEngineeringDiagnosticsInWorker/);
  assert.doesNotMatch(app,/overriddenCritique\.engineeringEvidence|formData\.append\("engineeringEvidence"/);
});

test("Stage 2C2B-1B over-budget fallback does not instantiate worker or read PCM",async()=>{
  let reads=0;
  const tooLarge={numberOfChannels:2,length:48000*600,sampleRate:48000,
    getChannelData:()=>{reads++;throw Error("PCM should never be read")}};
  const result=await analyzeEngineeringDiagnosticsInWorker(tooLarge);
  assert.deepEqual(result,{status:"UNAVAILABLE",reason:"INPUT_BUDGET_EXCEEDED"});
  assert.equal(reads,0);
});

test("Stage 2C2B-1B worker diagnostic timeout and message errors terminate worker",async()=>{
  const OriginalWorker=globalThis.Worker;
  let last;
  class FakeWorker {
    terminated=false;
    constructor(){last=this}
    postMessage(){}
    terminate(){this.terminated=true}
  }
  globalThis.Worker=FakeWorker;
  const audio={numberOfChannels:1,length:4096,sampleRate:44100,
    getChannelData:()=>new Float32Array(4096)};
  try{
    const messageError=analyzeEngineeringDiagnosticsInWorker(audio);
    last.onmessageerror({});
    assert.deepEqual(await messageError,{status:"UNAVAILABLE",reason:"WORKER_MESSAGE_ERROR"});
    assert.equal(last.terminated,true);
    const timeout=await analyzeEngineeringDiagnosticsInWorker(audio,undefined,128*1024*1024,5);
    assert.deepEqual(timeout,{status:"UNAVAILABLE",reason:"TIMEOUT"});
    assert.equal(last.terminated,true);
  }finally{globalThis.Worker=OriginalWorker}
});


test("Auralis 2C2B-1D lifecycle guard is isolated from scoring and A2", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(app,/const STAGE2C2A_DIAGNOSTICS_ENABLED = false;/);
  assert.match(app,/const auralisDiagnosticAbortRef = React\.useRef<AbortController \| null>\(null\)/);
  assert.match(app,/const auralisDiagnosticGenerationRef = React\.useRef\(0\)/);
  assert.match(app,/const cancelAuralisDiagnostic = \(\) => \{/);
  assert.match(app,/auralisDiagnosticAbortRef\.current\?\.abort\(\)/);
  assert.match(app,/React\.useEffect\(\(\) => \(\) => \{[\s\S]*?auralisDiagnosticAbortRef\.current\?\.abort\(\)/);
  assert.match(app,/const clearInputStates = \(\) => \{\s*cancelAuralisDiagnostic\(\)/);
  assert.match(app,/const diagnosticGeneration = auralisDiagnosticGenerationRef\.current/);
  assert.match(app,/STAGE2C2A_DIAGNOSTICS_ENABLED &&\s*diagnosticGeneration === auralisDiagnosticGenerationRef\.current/);
  assert.match(app,/analyzeEngineeringDiagnosticsInWorker\(audioBuffer, controller\.signal\)/);
  assert.match(app,/if \(!controller\.signal\.aborted &&[\s\S]*?auralisDiagnosticAbortRef\.current === controller &&[\s\S]*?diagnosticGeneration === auralisDiagnosticGenerationRef\.current\)/);
  assert.match(app,/if \(diagnosticGeneration === auralisDiagnosticGenerationRef\.current\) cancelAuralisDiagnostic\(\)/);
  assert.doesNotMatch(app,/await analyzeEngineeringDiagnosticsInWorker/);
  assert.doesNotMatch(app,/formData\.append\("auralis|formData\.append\("engineeringEvidence/);
});


test("Auralis 2D1 synthetic stereo evidence stays descriptive, versioned, and unscored",()=>{
  const sr=44100,n=8192,left=new Float32Array(n),right=new Float32Array(n);
  for(let i=0;i<n;i++){left[i]=0.2*Math.sin(2*Math.PI*100*i/sr);right[i]=-left[i]}
  const channels=[left,right];
  const spectral=analyzeStage2aSpectralPower(channels,sr);
  const temporal=analyzeStage2b1LowFrequency(channels,sr);
  const stereo=analyzeStage2b2Stereo(channels,sr);
  const evidence=assembleStage2c1EngineeringEvidence(spectral,temporal,stereo);
  const original=structuredClone(evidence);
  const result=interpretStage2d1EngineeringEvidence(evidence);
  assert.equal(result.schemaVersion,"stage2d1-descriptive-observations-v2");
  assert.equal(result.scoringImpact,"NONE");
  assert.equal(result.uncertainty.confidence,"NOT_CALIBRATED");
  assert.equal(result.conditions.length,2);
  for(const band of result.conditions){
    for(const obs of Object.values(band.evidenceStrength)){
      assert.ok(["INSUFFICIENT","NOT_OBSERVED","LIMITED","REPEATED"].includes(obs.evidenceStrength));
      assert.equal(obs.defectConclusion,"NOT_DETERMINED");
      assert.ok(obs.validFrames<=obs.totalFrames);
      assert.ok(obs.matchingFrames<=obs.validFrames);
      assert.equal(obs.matchingFraction,obs.validFrames?obs.matchingFrames/obs.validFrames:null);
      assert.ok(obs.separatedPositiveWindows<=obs.matchingFrames);
      assert.equal(obs.minimumSeparationSamples,4096);
    }
  }
  for(const band of result.conditions){
    assert.equal(band.potentialProductionDefect,"NOT_DETERMINED");
    assert.equal(band.frameCount,evidence.bands.find(b=>b.bandHz.join(",")===band.bandHz.join(",")).frameCount);
    for(const key of ["riseEvents","negativeStereoCorrelation","monoAttenuation","completeCancellation"]){
      const x=band[key];
      assert.ok(x.numerator>=0&&x.numerator<=x.denominator);
      assert.equal(x.fraction,x.denominator?x.numerator/x.denominator:null);
      assert.ok(x.classification!=="QUALITY_DEFECT");
    }
  }
  assert.deepEqual(evidence,original);
  assert.throws(()=>interpretStage2d1EngineeringEvidence({...evidence,scoringImpact:"ENABLED"}),RangeError);
  assert.throws(()=>interpretStage2d1EngineeringEvidence({...evidence,bands:[{...evidence.bands[0],cancellationDenominator:999},evidence.bands[1]]}),RangeError);
});

test("Auralis 2D2 synthetic silence preserves null coverage and uncertain evidence",()=>{
  const sr=48000,n=16384,channels=[new Float32Array(n),new Float32Array(n)];
  const assembled=assembleStage2c1EngineeringEvidence(
    analyzeStage2aSpectralPower(channels,sr),
    analyzeStage2b1LowFrequency(channels,sr),
    analyzeStage2b2Stereo(channels,sr));
  const obs=interpretStage2d1EngineeringEvidence(assembled);
  for(const band of obs.conditions){
    assert.equal(band.evidenceStrength.negativeCorrelation.evidenceStrength,"INSUFFICIENT");
    assert.equal(band.evidenceStrength.negativeCorrelation.validFrames,0);
    assert.equal(band.evidenceStrength.negativeCorrelation.matchingFraction,null);
    assert.equal(band.evidenceStrength.powerRises.evidenceStrength,"INSUFFICIENT");
    assert.equal(band.evidenceStrength.completeCancellation.evidenceStrength,"INSUFFICIENT");
    assert.equal(band.evidenceStrength.completeCancellation.availabilityStatus,"UNAVAILABLE_NO_MEASURABLE_STEREO");
    assert.equal(band.evidenceStrength.completeCancellation.validFrames,0);
    assert.equal(band.evidenceStrength.completeCancellation.matchingFraction,null);
    assert.equal(band.completeCancellation.status,"UNAVAILABLE_NO_MEASURABLE_STEREO");
    assert.equal(band.completeCancellation.denominator,0);
    assert.equal(band.completeCancellation.fraction,null);
    assert.equal(band.potentialProductionDefect,"NOT_DETERMINED");
  }
});

test("Auralis 2D2 sustained synthetic anti-phase evidence is repeated but never a defect diagnosis",()=>{
  const sr=44100,n=32768,left=new Float32Array(n),right=new Float32Array(n);
  for(let i=0;i<n;i++){left[i]=0.2*Math.sin(2*Math.PI*100*i/sr);right[i]=-left[i]}
  const channels=[left,right];
  const assembled=assembleStage2c1EngineeringEvidence(
    analyzeStage2aSpectralPower(channels,sr),
    analyzeStage2b1LowFrequency(channels,sr),
    analyzeStage2b2Stereo(channels,sr));
  const obs=interpretStage2d1EngineeringEvidence(assembled);
  const bass=obs.conditions.find(x=>x.bandHz.join(",")==="60,250");
  assert.ok(bass);
  const x=bass.evidenceStrength.completeCancellation;
  assert.equal(x.evidenceStrength,"REPEATED");
  assert.ok(x.longestRunFrames>=3);
  assert.ok(x.separatedPositiveWindows>=3);
  assert.equal(x.defectConclusion,"NOT_DETERMINED");
  assert.equal(obs.scoringImpact,"NONE");
});


// Stage 2D-3: all inputs synthetic PCM; no uploaded files, paid calls or scores.
const auralis2d3Synthetic=(channels,sr=44100)=>
  assembleStage2c1EngineeringEvidence(
    analyzeStage2aSpectralPower(channels,sr),
    analyzeStage2b1LowFrequency(channels,sr),
    analyzeStage2b2Stereo(channels,sr));

test("Auralis 2D3 silence, mono and single-channel stereo preserve inapplicable and unavailable states",()=>{
  const sr=48000,n=16384,silence=new Float32Array(n);
  for(const channels of [[silence,silence],[silence]]){
    const original=auralis2d3Synthetic(channels,sr);
    const snapshot=structuredClone(original);
    const result=interpretStage2d3CrossMeasurementEvidence(original);
    assert.equal(result.scoringImpact,"NONE");
    assert.equal(result.schemaVersion,"stage2d3-dependent-corroboration-v2");
    for(const band of result.bands){
      const stereo=band.measurementFamilies.stereo;
      assert.equal(stereo.status,channels.length===1?"NOT_APPLICABLE_MONO":"UNAVAILABLE_NO_MEASURABLE_STEREO");
      assert.equal(stereo.validNormalizedFrames,0);
      assert.equal(stereo.eligibleFrames,0);
      assert.equal(stereo.completeCancellationFrames,0);
      assert.equal(stereo.completeCancellationFraction,null);
      assert.equal(stereo.correlatedAndAttenuatedFraction,null);
      assert.equal(stereo.independentCorroborations,0);
      assert.equal(band.temporalCoincidence.coincidenceFraction,null);
      assert.equal(band.potentialProductionDefect,"NOT_DETERMINED");
    }
    assert.deepEqual(original,snapshot);
  }
  const left=new Float32Array(n);
  for(let i=0;i<n;i++)left[i]=0.2*Math.sin(2*Math.PI*100*i/sr);
  const oneSided=interpretStage2d3CrossMeasurementEvidence(auralis2d3Synthetic([left,silence],sr));
  assert.equal(oneSided.bands[1].measurementFamilies.stereo.status,"UNAVAILABLE_NO_MEASURABLE_STEREO");
});

test("Auralis 2D3 preserves exact cancellation separately from normalized stereo evidence",()=>{
  const sr=44100,n=32768,left=new Float32Array(n),right=new Float32Array(n);
  for(let i=0;i<n;i++){left[i]=0.2*Math.sin(2*Math.PI*100*i/sr);right[i]=-left[i]}
  const result=interpretStage2d3CrossMeasurementEvidence(auralis2d3Synthetic([left,right],sr));
  const stereo=result.bands[1].measurementFamilies.stereo;
  assert.equal(stereo.status,"AVAILABLE");
  assert.ok(stereo.completeCancellationFrames>0);
  assert.equal(stereo.validNormalizedFrames,0);
  assert.equal(stereo.negativeAndAttenuatedFrames,0);
  assert.equal(stereo.correlatedAndAttenuatedFraction,null);
  assert.equal(stereo.completeCancellationFraction,1);
  assert.equal(stereo.independentCorroborations,0);
  assert.equal(result.bands[1].potentialProductionDefect,"NOT_DETERMINED");
});

test("Auralis 2D3 dependent negative correlation and mono attenuation count as one measurement family",()=>{
  const sr=44100,n=32768,left=new Float32Array(n),right=new Float32Array(n);
  for(let i=0;i<n;i++){left[i]=0.2*Math.sin(2*Math.PI*100*i/sr);right[i]=-0.5*left[i]}
  const stereo=interpretStage2d3CrossMeasurementEvidence(auralis2d3Synthetic([left,right],sr))
    .bands[1].measurementFamilies.stereo;
  assert.equal(stereo.status,"AVAILABLE");
  assert.ok(stereo.validNormalizedFrames>0);
  assert.equal(stereo.negativeAndAttenuatedFrames,stereo.validNormalizedFrames);
  assert.equal(stereo.atLeast3DbMonoAttenuationFrames,stereo.validNormalizedFrames);
  assert.equal(stereo.independentCorroborations,0);
});

test("Auralis 2D3 ordinary stereo is not classified as a mixing defect",()=>{
  const sr=48000,n=16384,left=new Float32Array(n),right=new Float32Array(n);
  for(let i=0;i<n;i++){left[i]=0.2*Math.sin(2*Math.PI*100*i/sr);right[i]=left[i]}
  const band=interpretStage2d3CrossMeasurementEvidence(auralis2d3Synthetic([left,right],sr)).bands[1];
  assert.equal(band.measurementFamilies.stereo.status,"AVAILABLE");
  assert.equal(band.measurementFamilies.stereo.atLeast3DbMonoAttenuationFrames,0);
  assert.equal(band.measurementFamilies.stereo.negativeCorrelationFrames,0);
  assert.equal(band.measurementFamilies.stereo.completeCancellationFrames,0);
  assert.equal(band.potentialProductionDefect,"NOT_DETERMINED");
  // Distinct tones in the same frequency band approximate uncorrelated left/right channels.
  for(let i=0;i<n;i++)right[i]=0.2*Math.sin(2*Math.PI*147*i/sr);
  const uncorrelated=interpretStage2d3CrossMeasurementEvidence(auralis2d3Synthetic([left,right],sr)).bands[1];
  assert.ok(uncorrelated.measurementFamilies.stereo.atLeast3DbMonoAttenuationFrames>0);
  assert.equal(uncorrelated.measurementFamilies.stereo.independentCorroborations,0);
  assert.equal(uncorrelated.potentialProductionDefect,"NOT_DETERMINED");
});

test("Auralis 2D3 coincident power rise is descriptive and validates frame alignment",()=>{
  const sr=48000,n=32768,left=new Float32Array(n),right=new Float32Array(n);
  for(let i=0;i<n;i++){
    left[i]=(i<n/2?0.001:0.3)*Math.sin(2*Math.PI*100*i/sr);
    right[i]=-0.5*left[i];
  }
  const evidence=auralis2d3Synthetic([left,right],sr);
  const result=interpretStage2d3CrossMeasurementEvidence(evidence);
  const coincident=result.bands[1].temporalCoincidence;
  assert.equal(coincident.status,"AVAILABLE");
  assert.ok(coincident.eligibleFrames>0);
  assert.ok(coincident.coincidentFrames>0);
  assert.ok(coincident.coincidentFrames<=coincident.eligibleFrames);
  assert.equal(coincident.coincidenceFraction,coincident.coincidentFrames/coincident.eligibleFrames);
  assert.equal(result.scoringImpact,"NONE");
  assert.throws(()=>{
    const malformed=structuredClone(evidence);
    malformed.bands[1].frameEvidence[0].frameIndex=100;
    interpretStage2d3CrossMeasurementEvidence(malformed);
  },RangeError);
});


test("Auralis 2D3 temporally separated phase and power conditions are not called coincident",()=>{
  const sr=48000,n=65536,left=new Float32Array(n),right=new Float32Array(n);
  for(let i=0;i<n;i++){
    const amp=i<3*n/4?0.05:0.3;
    left[i]=amp*Math.sin(2*Math.PI*100*i/sr);
    right[i]=i<n/4?-left[i]:left[i];
  }
  const obs=interpretStage2d3CrossMeasurementEvidence(auralis2d3Synthetic([left,right],sr));
  const band=obs.bands[1];
  assert.ok(band.measurementFamilies.stereo.completeCancellationFrames>0);
  assert.ok(band.measurementFamilies.lowFrequencyPower.riseFrames>0);
  assert.ok(band.temporalCoincidence.eligibleFrames>0);
  assert.equal(band.temporalCoincidence.coincidentFrames,0);
  assert.equal(band.temporalCoincidence.coincidenceFraction,0);
  assert.equal(band.measurementFamilies.stereo.independentCorroborations,0);
  assert.equal(band.potentialProductionDefect,"NOT_DETERMINED");
});


// Stage 2D-4A: synthetic boundary/interpretation characterization only.
// REGRESSION CONTRACT: numerical invariants and Stage 2D3 unavailable/applicability
// states are normative; Stage 2D2 legacy mislabels and window-duration inflation
// are provisional known defects, NOT expected future behavior. Explicit TODOs
// below document the desired later correction without making current CI fail.
// These regression cases document existing behavior and known limitations.
// They do NOT certify acoustic quality, audibility, source identity or defects.
// No user recordings, model calls, new dependencies or production code changes.
const auralis2d4aTone=(length,sampleRate,hz,phase=0,amplitude=0.25)=>{
  const pcm=new Float32Array(length);
  for(let i=0;i<length;i++)
    pcm[i]=amplitude*Math.sin(2*Math.PI*hz*i/sampleRate+phase);
  return pcm;
};
const auralis2d4aBandShare=(sampleRate,hz,phase,lowBandIndex)=>{
  const pcm=auralis2d4aTone(4096,sampleRate,hz,phase);
  const spectral=analyzeStage2aSpectralPower([pcm],sampleRate);
  assert.equal(spectral.frames,1);
  assert.equal(spectral.fftSize,4096);
  assert.equal(spectral.hopSize,2048);
  assert.equal(spectral.window,"periodic-hann");
  const p=spectral.channelBandPower[0];
  // Adjacent-band share only: numerator is the selected lower band's power;
// denominator is that band PLUS its immediate upper neighbor (not total PCM
// power, not the sum of all spectral bands, and not the whole-song spectrum).
  const pair=p[lowBandIndex]+p[lowBandIndex+1];
  assert.ok(pair>0);
  assert.ok(Math.abs(spectral.channelTotalPower[0]-
    (p.reduce((a,b)=>a+b,0)+spectral.channelUnassignedPower[0]))<1e-9);
  return p[lowBandIndex]/pair;
};

test("Auralis 2D4A exact 60 Hz Hann-window band boundary is sample-rate sensitive, not a mix defect",()=>{
  const shares={};
  for(const sr of [44100,48000]){
    shares[sr]=[0,Math.PI/4,Math.PI/2].map(phase=>
      auralis2d4aBandShare(sr,60,phase,0));
    const expected=sr===44100?0.4447:0.7673;
    for(const share of shares[sr])
      assert.ok(Math.abs(share-expected)<0.025,
        "60 Hz lower-band share "+share+" at "+sr+" differs from frozen synthetic reference");
    assert.ok(Math.max(...shares[sr])-Math.min(...shares[sr])<0.02);
    const below=auralis2d4aBandShare(sr,59,0,0);
    const above=auralis2d4aBandShare(sr,61,0,0);
    assert.ok(below>shares[sr][0]&&shares[sr][0]>above);
  }
  assert.ok(shares[48000][0]-shares[44100][0]>0.25);
});

test("Auralis 2D4A exact 250 Hz band boundary retains leakage and sample-rate effects",()=>{
  const shares={};
  for(const sr of [44100,48000]){
    shares[sr]=[0,Math.PI/3].map(phase=>
      auralis2d4aBandShare(sr,250,phase,1));
    const expected=sr===44100?0.7039:0.6247;
    for(const share of shares[sr])
      assert.ok(Math.abs(share-expected)<0.03,
        "250 Hz 60–250 band share "+share+" at "+sr+" differs from synthetic reference");
    assert.ok(Math.abs(shares[sr][0]-shares[sr][1])<0.02);
    const below=auralis2d4aBandShare(sr,249,0,1);
    const above=auralis2d4aBandShare(sr,251,0,1);
    assert.ok(below>shares[sr][0]&&shares[sr][0]>above);
  }
  assert.ok(shares[44100][0]-shares[48000][0]>0.05);
});

test("Auralis 2D4A equal-power orthogonal stereo tones produce ordinary minus 3.01 dB fold-down",()=>{
  const sr=48000,n=32768;
  // Exact nonoverlapping Hann FFT-bin tones within the same 60–250 Hz band.
  const left=auralis2d4aTone(n,sr,10*sr/4096);
  const right=auralis2d4aTone(n,sr,16*sr/4096);
  const evidence=auralis2d3Synthetic([left,right],sr);
  const frames=evidence.bands[1].frameEvidence;
  const valid=frames.filter(x=>x.stereoStatus==="VALID");
  assert.ok(valid.length>4);
  const expected=10*Math.log10(0.5);
  for(const frame of valid){
    assert.ok(Math.abs(frame.correlation)<1e-6,
      "Independent FFT-bin tones must have near-zero correlation");
    assert.ok(Math.abs(frame.monoChangeDb-expected)<0.025,
      "Uncorrelated equal-power channels have normal -3.0103 dB mono change");
  }
  const interpreted=interpretStage2d3CrossMeasurementEvidence(evidence);
  const band=interpreted.bands[1];
  assert.equal(band.measurementFamilies.stereo.atLeast3DbMonoAttenuationFrames,valid.length);
  assert.equal(band.measurementFamilies.stereo.independentCorroborations,0);
  assert.equal(band.potentialProductionDefect,"NOT_DETERMINED");
  assert.equal(interpreted.scoringImpact,"NONE");
});

test("Auralis 2D4A silence, mono and true cancellation retain distinct numerator and denominator meaning",()=>{
  const sr=48000,n=16384,silence=new Float32Array(n);
  const signal=auralis2d4aTone(n,sr,125);
  const inverse=Float32Array.from(signal,x=>-x);
  const scenarios=[
    {name:"silence",channels:[silence,silence],status:"UNAVAILABLE_NO_MEASURABLE_STEREO"},
    {name:"mono",channels:[signal],status:"NOT_APPLICABLE_MONO"},
    {name:"anti-phase",channels:[signal,inverse],status:"AVAILABLE"},
  ];
  for(const scenario of scenarios){
    const evidence=auralis2d3Synthetic(scenario.channels,sr);
    const stage2d2=interpretStage2d1EngineeringEvidence(evidence).conditions[1];
    const stage2d3=interpretStage2d3CrossMeasurementEvidence(evidence).bands[1];
    const stereo=stage2d3.measurementFamilies.stereo;
    assert.equal(stereo.status,scenario.status,scenario.name);
    // Stage 2D3's explicit availability and null-denominator semantics below
    // are normative. Stage 2D2 currently counts EVERY frame (even silence or
    // mono) as eligible for the separate cancellation observation; this is
    // provisional behavior and must not become a permanent expectation.
    assert.equal(stereo.independentCorroborations,0);
    assert.equal(stage2d3.potentialProductionDefect,"NOT_DETERMINED");
    assert.equal(stage2d3.temporalCoincidence.coincidentFrames,0);
    assert.equal(stage2d2.completeCancellation.rawFrameDenominator,evidence.bands[1].frameCount);
    assert.equal(stage2d2.completeCancellation.status,scenario.status);
    assert.equal(stage2d2.evidenceStrength.completeCancellation.availabilityStatus,scenario.status);
    if(scenario.name==="anti-phase"){
      assert.equal(stage2d2.completeCancellation.denominator,evidence.bands[1].frameCount);
      assert.equal(stereo.eligibleFrames,stereo.completeCancellationFrames);
      assert.equal(stereo.eligibleFrames,evidence.bands[1].frameCount);
      assert.equal(stereo.validNormalizedFrames,0);
      assert.equal(stereo.completeCancellationFraction,1);
      assert.equal(stereo.correlatedAndAttenuatedFraction,null);
      assert.equal(stage2d2.completeCancellation.numerator,stereo.completeCancellationFrames);
    }else{
      assert.equal(stereo.eligibleFrames,0);
      assert.equal(stereo.completeCancellationFraction,null);
      assert.equal(stereo.correlatedAndAttenuatedFraction,null);
      assert.equal(stage2d2.completeCancellation.numerator,0);
      const corrected=stage2d2.evidenceStrength.completeCancellation;
      assert.equal(corrected.evidenceStrength,"INSUFFICIENT");
      assert.equal(corrected.validFrames,0);
      assert.equal(corrected.matchingFrames,0);
      assert.equal(corrected.matchingFraction,null);
      assert.equal(stage2d2.completeCancellation.denominator,0);
      assert.equal(stage2d2.completeCancellation.fraction,null);
      assert.equal(stage2d2.completeCancellation.classification,"INSUFFICIENT_EVIDENCE");
    }
  }
});

// Normative acceptance: 2D2 and 2D3 agree on sample-level availability,
// including silence, mono, one-sided stereo and mixed eligible/unavailable frames.
test("Auralis 2D4C normative: cancellation applicability, numerator and denominator at both rates",()=>{
  for(const sr of [44100,48000]){
    const n=8192,signal=auralis2d4aTone(n,sr,125);
    const silence=new Float32Array(n);
    const opposite=Float32Array.from(signal,x=>-x);
    const scenarios=[
      {name:"mono silence",channels:[silence],status:"NOT_APPLICABLE_MONO"},
      {name:"mono tone",channels:[signal],status:"NOT_APPLICABLE_MONO"},
      {name:"stereo silence",channels:[silence,silence],status:"UNAVAILABLE_NO_MEASURABLE_STEREO"},
      {name:"one-sided",channels:[signal,silence],status:"UNAVAILABLE_NO_MEASURABLE_STEREO"},
      {name:"in-phase stereo",channels:[signal,signal],status:"AVAILABLE"},
      {name:"anti-phase stereo",channels:[signal,opposite],status:"AVAILABLE"},
    ];
    for(const scenario of scenarios){
      const evidence=auralis2d3Synthetic(scenario.channels,sr);
      const source=evidence.bands[1];
      const measurable=source.frameEvidence.filter(f=>
        f.stereoStatus==="VALID"||f.stereoStatus==="COMPLETE_CANCELLATION").length;
      const cancelled=source.frameEvidence.filter(f=>
        f.stereoStatus==="COMPLETE_CANCELLATION").length;
      const d2=interpretStage2d1EngineeringEvidence(evidence).conditions[1];
      const d3=interpretStage2d3CrossMeasurementEvidence(evidence).bands[1];
      const obs=d2.completeCancellation, strength=d2.evidenceStrength.completeCancellation;
      assert.equal(source.cancellationDenominator,source.frameCount,scenario.name);
      assert.equal(source.cancellationFrames,cancelled);
      assert.equal(obs.rawFrameDenominator,source.frameCount);
      assert.equal(obs.denominator,measurable,scenario.name);
      assert.equal(obs.numerator,cancelled,scenario.name);
      assert.equal(obs.fraction,measurable?cancelled/measurable:null);
      assert.equal(obs.status,scenario.status,scenario.name);
      assert.equal(strength.availabilityStatus,scenario.status);
      assert.equal(strength.validFrames,measurable);
      assert.equal(strength.matchingFrames,cancelled);
      assert.equal(strength.matchingFraction,measurable?cancelled/measurable:null);
      assert.equal(d3.measurementFamilies.stereo.eligibleFrames,measurable);
      assert.equal(d3.measurementFamilies.stereo.status,scenario.status);
      assert.equal(d2.potentialProductionDefect,"NOT_DETERMINED");
      assert.equal(strength.defectConclusion,"NOT_DETERMINED");
      if(measurable===0){
        assert.equal(strength.evidenceStrength,"INSUFFICIENT");
        assert.equal(obs.classification,"INSUFFICIENT_EVIDENCE");
        assert.equal(obs.fraction,null);
      }else if(scenario.name==="in-phase stereo"){
        assert.equal(obs.fraction,0);
        assert.equal(obs.classification,"NOT_OBSERVED");
      }else if(scenario.name==="anti-phase stereo"){
        assert.equal(obs.fraction,1);
      }
    }
    const mixedL=auralis2d4aTone(n,sr,125);
    const mixedR=Float32Array.from(mixedL);
    // Ensure a fully zero-energy last frame with a measurable first frame.
    mixedL.fill(0,4096); mixedR.fill(0,4096);
    const mixed=auralis2d3Synthetic([mixedL,mixedR],sr);
    const eligible=mixed.bands[1].frameEvidence.filter(f=>f.stereoStatus==="VALID"||
      f.stereoStatus==="COMPLETE_CANCELLATION").length;
    assert.ok(eligible>0&&eligible<mixed.bands[1].frameCount);
    const strength=interpretStage2d1EngineeringEvidence(mixed).conditions[1].evidenceStrength.completeCancellation;
    assert.equal(strength.validFrames,eligible);
    assert.equal(strength.matchingFraction,0);
    assert.equal(strength.availabilityStatus,"AVAILABLE");
  }
});

test("Auralis 2D4A short zero-padded anti-phase frame exposes window-duration overstatement",()=>{
  const sr=48000,n=1024;
  const left=auralis2d4aTone(n,sr,125);
  const right=Float32Array.from(left,x=>-x);
  const evidence=auralis2d3Synthetic([left,right],sr);
  const provenance=evidence.sourceProvenance;
  assert.equal(provenance.inputSampleCount,n);
  assert.equal(provenance.representedSampleCount,n);
  assert.equal(provenance.omittedTrailingSampleCount,0);
  assert.equal(provenance.zeroPaddedSampleCount,4096-n);
  assert.equal(evidence.bands[1].frameCount,1);
  const stage2d2=interpretStage2d1EngineeringEvidence(evidence).conditions[1];
  const cancellation=stage2d2.evidenceStrength.completeCancellation;
  assert.equal(cancellation.matchingFrames,1);
  assert.equal(cancellation.longestRunFrames,1);
  assert.equal(cancellation.evidenceStrength,"INSUFFICIENT");
  // This field currently describes a full FFT-window span, which can
  // exceed available recording time. Check finite, bounded output only:
  // future correction that caps at actual input duration must also pass.
  const recordedSeconds=cancellation.longestRunWindowSupportSeconds;
  const actualAudioSeconds=provenance.inputSampleCount/sr;
  const fftWindowSeconds=provenance.fftSize/sr;
  assert.ok(actualAudioSeconds<fftWindowSeconds);
  assert.equal(cancellation.longestRunWindowSupportStartSample,0);
  assert.equal(cancellation.longestRunWindowSupportEndSample,n);
  assert.ok(Math.abs(recordedSeconds-actualAudioSeconds)<1e-9);
  assert.equal(cancellation.longestRunAudibleEventDurationSeconds,null);
  assert.equal(cancellation.durationSemantics,"SAMPLE_BOUNDED_FFT_WINDOW_SUPPORT_NOT_EVENT_DURATION");
  const stage2d3=interpretStage2d3CrossMeasurementEvidence(evidence).bands[1];
  assert.equal(stage2d3.measurementFamilies.stereo.completeCancellationFraction,1);
  assert.equal(stage2d3.temporalCoincidence.eligibleFrames,0);
  assert.equal(stage2d3.temporalCoincidence.coincidenceFraction,null);
  assert.equal(stage2d3.potentialProductionDefect,"NOT_DETERMINED");
});

test("Auralis 2D4A one short pulse yields overlapping-window coincidence, not independent events",()=>{
  const sr=48000,n=16384,start=5500,pulseSamples=350;
  const left=new Float32Array(n);
  for(let i=0;i<n;i++){
    const amplitude=i>=start&&i<start+pulseSamples?0.6:0.0002;
    left[i]=amplitude*Math.sin(2*Math.PI*125*i/sr);
  }
  const right=Float32Array.from(left,x=>-x);
  const evidence=auralis2d3Synthetic([left,right],sr);
  const before=structuredClone(evidence);
  const result=interpretStage2d3CrossMeasurementEvidence(evidence);
  const band=result.bands[1],co=band.temporalCoincidence;
  assert.equal(co.status,"AVAILABLE");
  assert.ok(co.eligibleFrames>2);
  assert.ok(co.coincidentFrames>=2,
    "Single pulse should cause consecutive relative rises across overlapping FFT windows");
  assert.equal(co.contiguousEvents,1);
  assert.ok(co.longestRunFrames>=2);
  assert.equal(co.coincidenceFraction,co.coincidentFrames/co.eligibleFrames);
  // Current duration is an overlapping-FFT observation span, not the true
  // 350-sample pulse length; future corrected/capped values must still pass.
  const windowSpanSeconds=((co.longestRunFrames-1)*evidence.sourceProvenance.hopSize+
    evidence.sourceProvenance.fftSize)/sr;
  assert.ok(Number.isFinite(co.longestRunWindowSupportSeconds));
  assert.ok(co.longestRunWindowSupportSeconds>=0);
  assert.ok(co.longestRunWindowSupportSeconds<=windowSpanSeconds+1e-9);
  assert.ok(co.longestRunWindowSupportEndSample<=evidence.sourceProvenance.representedSampleCount);
  assert.equal(co.longestRunAudibleEventDurationSeconds,null);
  assert.equal(co.durationSemantics,"SAMPLE_BOUNDED_FFT_WINDOW_SUPPORT_NOT_EVENT_DURATION");
  assert.equal(band.measurementFamilies.stereo.independentCorroborations,0);
  assert.equal(band.potentialProductionDefect,"NOT_DETERMINED");
  assert.equal(result.scoringImpact,"NONE");
  assert.deepEqual(evidence,before);
});

// Normative duration acceptance: report FFT-window support bounded by actual
// analyzed samples, never audible-event duration or omitted trailing samples.
test("Auralis 2D4C normative: sample-bounded support and unknown audible-event duration",()=>{
  for(const sr of [44100,48000]){
    for(const n of [1024,2048,4095,4096,4097,6145,6244,8192]){
      const signal=auralis2d4aTone(n,sr,125);
      const inverted=Float32Array.from(signal,x=>-x);
      const evidence=auralis2d3Synthetic([signal,inverted],sr);
      const provenance=evidence.sourceProvenance;
      const expectedFrames=n<4096?1:1+Math.floor((n-4096)/2048);
      const represented=Math.min(n,(expectedFrames-1)*2048+4096);
      assert.equal(provenance.representedSampleCount,represented);
      assert.equal(provenance.omittedTrailingSampleCount,n-represented);
      assert.equal(provenance.zeroPaddedSampleCount,Math.max(0,4096-n));
      const d2=interpretStage2d1EngineeringEvidence(evidence);
      const d3=interpretStage2d3CrossMeasurementEvidence(evidence);
      assert.equal(d2.schemaVersion,"stage2d1-descriptive-observations-v2");
      assert.equal(d3.schemaVersion,"stage2d3-dependent-corroboration-v2");
      assert.equal(d2.scoringImpact,"NONE");assert.equal(d3.scoringImpact,"NONE");
      for(const condition of d2.conditions){
        for(const strength of Object.values(condition.evidenceStrength)){
          assert.equal(strength.durationSemantics,"SAMPLE_BOUNDED_FFT_WINDOW_SUPPORT_NOT_EVENT_DURATION");
          assert.equal(strength.longestRunAudibleEventDurationSeconds,null);
          assert.ok(strength.longestRunWindowSupportSeconds>=0);
          assert.ok(strength.longestRunWindowSupportSeconds<=represented/sr+1e-9);
          const start=strength.longestRunWindowSupportStartSample;
          const end=strength.longestRunWindowSupportEndSample;
          if(strength.longestRunFrames===0){
            assert.equal(start,null);assert.equal(end,null);
            assert.equal(strength.longestRunWindowSupportSeconds,0);
          }else{
            assert.ok(Number.isSafeInteger(start)&&start>=0);
            assert.ok(Number.isSafeInteger(end)&&end<=represented&&end>start);
            assert.ok(Math.abs(strength.longestRunWindowSupportSeconds-(end-start)/sr)<1e-10);
          }
        }
        const cancellation=condition.evidenceStrength.completeCancellation;
        assert.equal(cancellation.longestRunFrames,expectedFrames);
        assert.equal(cancellation.longestRunWindowSupportStartSample,0);
        assert.equal(cancellation.longestRunWindowSupportEndSample,represented);
        assert.ok(Math.abs(cancellation.longestRunWindowSupportSeconds-represented/sr)<1e-10);
      }
      for(const band of d3.bands){
        const co=band.temporalCoincidence;
        assert.equal(co.longestRunAudibleEventDurationSeconds,null);
        assert.equal(co.durationSemantics,"SAMPLE_BOUNDED_FFT_WINDOW_SUPPORT_NOT_EVENT_DURATION");
        assert.ok(co.longestRunWindowSupportSeconds>=0&&co.longestRunWindowSupportSeconds<=represented/sr+1e-9);
        assert.equal(co.longestRunWindowSupportStartSample,null);
        assert.equal(co.longestRunWindowSupportEndSample,null);
        assert.equal(co.longestRunWindowSupportSeconds,0);
      }
    }
    const n=16384,begin=5500,pulseSamples=350;
    const left=new Float32Array(n);
    for(let i=0;i<n;i++){
      const amplitude=i>=begin&&i<begin+pulseSamples?0.6:0.0002;
      left[i]=amplitude*Math.sin(2*Math.PI*125*i/sr);
    }
    const right=Float32Array.from(left,x=>-x);
    const evidence=auralis2d3Synthetic([left,right],sr);
    const co=interpretStage2d3CrossMeasurementEvidence(evidence).bands[1].temporalCoincidence;
    assert.ok(co.coincidentFrames>=2);
    assert.equal(co.contiguousEvents,1);
    assert.equal(co.longestRunAudibleEventDurationSeconds,null);
    assert.equal(co.durationSemantics,"SAMPLE_BOUNDED_FFT_WINDOW_SUPPORT_NOT_EVENT_DURATION");
    const start=co.longestRunWindowSupportStartSample,end=co.longestRunWindowSupportEndSample;
    assert.ok(Number.isSafeInteger(start)&&start>=0);
    assert.ok(Number.isSafeInteger(end)&&end<=evidence.sourceProvenance.representedSampleCount);
    assert.ok(end>start);
    assert.ok(Math.abs(co.longestRunWindowSupportSeconds-(end-start)/sr)<1e-10);
    assert.ok(co.longestRunWindowSupportSeconds>pulseSamples/sr,
      "FFT support may exceed pulse time but must never be labeled audible-event duration");
  }
});
