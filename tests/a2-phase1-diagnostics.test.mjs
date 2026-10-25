import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ExcelJS from "exceljs";
import { appendA2ProvenanceToSourceDiagnostics } from "../src/lib/a2ScoringProvenance.ts";
import {
  describeLowEndGateFactors,
  inspectA2NarrativeConflicts,
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
