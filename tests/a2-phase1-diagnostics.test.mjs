import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { appendA2ProvenanceToSourceDiagnostics } from "../src/lib/a2ScoringProvenance.ts";
import {
  describeLowEndGateFactors,
  inspectA2NarrativeConflicts,
  inspectA2VocalLayerEvidence,
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
