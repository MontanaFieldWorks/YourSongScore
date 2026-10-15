import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { transform } from "esbuild";

const helperSource = await readFile("src/lib/sourceVerificationDiagnostics.ts", "utf8");
const compiled = await transform(helperSource, { loader: "ts", format: "esm" });
const { getSourceVerificationRows } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.code).toString("base64")
);
const displaySource = await readFile("src/components/CritiqueDisplay.tsx", "utf8");
const values = (rows) => Object.fromEntries(rows.map(row => [row.section + "/" + row.field, row.value]));

test("Excel workbook includes a diagnostic-only source evidence worksheet", () => {
  assert.match(displaySource, /addWorksheet\("Source Diagnostics"/);
  assert.match(displaySource, /getSourceVerificationRows\(critique\)/);
  assert.match(displaySource, /getSourceVerificationRows.*?\bfrom\b/s);
});

test("preserves independent low-end pass evidence and rejection reasons", () => {
  const critique = {
    subMetricsCall1: {
      lowEndDivision: {
        applicable: false,
        commentary: "Final N/A decision",
        sourceVerification: {
          firstPassPercussionType: "KICK",
          secondPassPercussionType: "NO_AUDIT",
          firstPassBassType: "DEDICATED_SYNTH_OR_SUB",
          secondPassBassType: "NO_AUDIT",
          corroborated: false,
          firstPassPercussionEvidence: "isolated kick attack",
          secondPassPercussionEvidence: "",
          firstPassCommentary: "Kick and bass are both audible",
          rejectionReasons: ["SECOND_PASS_UNAVAILABLE"],
        },
      },
    },
  };
  const before = structuredClone(critique);
  const rowValues = values(getSourceVerificationRows(critique));
  assert.equal(rowValues["Low-End Division/First-pass original commentary"], "Kick and bass are both audible");
  assert.equal(rowValues["Low-End Division/Gate rejection reasons"], "SECOND_PASS_UNAVAILABLE");
  assert.equal(rowValues["Low-End Division/Passes corroborated"], "false");
  assert.equal(rowValues["Low-End Division/Final applicable"], "false");
  assert.deepEqual(critique, before);
});

test("distinguishes raw vocal-layer decision from code-forced N/A", () => {
  const critique = {
    subMetricsCall3: { vocalTrackingSubs: { vocalLayerFit: {
      applicable: false,
      commentary: "Not applicable: no layering established",
      sourceVerification: {
        rawLayerPresence: false,
        rawApplicable: true,
        rawCommentary: "Uncertain backing ad-libs",
        forcedNotApplicable: true,
        decisionSource: "CALL3_SINGLE_LISTEN",
      },
    } } },
  };
  const rowValues = values(getSourceVerificationRows(critique));
  assert.equal(rowValues["Vocal Layer Fit/Raw backing layer presence"], "false");
  assert.equal(rowValues["Vocal Layer Fit/Raw applicable"], "true");
  assert.equal(rowValues["Vocal Layer Fit/Raw original commentary"], "Uncertain backing ad-libs");
  assert.equal(rowValues["Vocal Layer Fit/Gate forced N/A"], "true");
  assert.equal(rowValues["Vocal Layer Fit/Decision source"], "CALL3_SINGLE_LISTEN");
});

test("absent diagnostics are explicitly marked unavailable rather than inferred absent", () => {
  const rowValues = values(getSourceVerificationRows({}));
  assert.equal(rowValues["Low-End Division/Diagnostic capture"], "NOT_CAPTURED");
  assert.equal(rowValues["Low-End Division/First-pass percussion type"], "NOT_CAPTURED");
  assert.equal(rowValues["Vocal Layer Fit/Diagnostic capture"], "NOT_CAPTURED");
  assert.equal(rowValues["Vocal Layer Fit/Raw backing layer presence"], "NOT_CAPTURED");
});
