import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getClimaxTrajectoryEvidenceRows } from "../src/lib/climaxEvidenceExport.ts";

const fixture = () => ({
  subMetricsCall2: { acousticTension: { climaxTrajectory: {
    qualityTier: "ABOVE_AVERAGE",
    score: 90,
    commentary: "The arrangement earns its release in the final section.",
  } } },
  liveMetrics: {
    calculatedClimaxTrajectoryScore: 57,
    calculatedClimaxPositionRatio: 0.04,
    calculatedClimaxBuildDb: 2.7,
  },
});

const rowsToMap = (rows) => Object.fromEntries(rows.map(row => [row.field, row.value]));

test("preserves original Gemini tier, numeric score, and complete commentary verbatim", () => {
  const report = fixture();
  const original = structuredClone(report);
  const rows = getClimaxTrajectoryEvidenceRows(report);
  const fields = rowsToMap(rows);
  assert.equal(fields["Gemini Call 2 qualityTier (model judgment)"], "ABOVE_AVERAGE");
  assert.equal(fields["Gemini Call 2 numeric score (mapped tier)"], 90);
  assert.equal(fields["Original Gemini Call 2 commentary (UNVERIFIED)"], original.subMetricsCall2.acousticTension.climaxTrajectory.commentary);
  assert.match(fields["Score provenance (Gemini vs DSP fallback)"], /Gemini Call 2 tier-mapped quality score/);
  assert.equal(fields["Legacy DSP fallback score (not used when Call 2 is present)"], 57);
  assert.deepEqual(report, original);
});

test("measured DSP position and build are separate from Gemini quality judgment", () => {
  const fields = rowsToMap(getClimaxTrajectoryEvidenceRows(fixture()));
  assert.equal(fields["DSP measured energy peak position (not a quality score)"], "4.0% of runtime");
  assert.equal(fields["DSP measured energy build (not a quality score)"], "2.7 dB above opening baseline");
  assert.match(fields["Evidence interpretation"], /do not validate the quality tier/);
});

test("when Call 2 missing, clearly identifies fallback without inventing Gemini evidence", () => {
  const fields = rowsToMap(getClimaxTrajectoryEvidenceRows({
    liveMetrics: { calculatedClimaxTrajectoryScore: 73 },
  }));
  assert.match(fields["Score provenance (Gemini vs DSP fallback)"], /Legacy DSP fallback score/);
  assert.equal(fields["Legacy DSP fallback score (not used when Call 2 is present)"], 73);
  assert.equal(fields["Gemini Call 2 qualityTier (model judgment)"], "NOT_CAPTURED");
  assert.equal(fields["Gemini Call 2 numeric score (mapped tier)"], "NOT_CAPTURED");
  assert.equal(fields["Original Gemini Call 2 commentary (UNVERIFIED)"], "NOT_CAPTURED");
});

test("missing evidence stays explicit and does not create a fabricated score", () => {
  const rows = getClimaxTrajectoryEvidenceRows(null);
  const fields = rowsToMap(rows);
  assert.match(fields["Score provenance (Gemini vs DSP fallback)"], /Neither Call 2 score nor DSP fallback captured/);
  assert.equal(fields["Gemini Call 2 numeric score (mapped tier)"], "NOT_CAPTURED");
  assert.equal(fields["DSP measured energy peak position (not a quality score)"], "NOT_CAPTURED");
  assert.equal(fields["DSP measured energy build (not a quality score)"], "NOT_CAPTURED");
  assert.equal(rows.length, 8);
});

test("invalid numeric fields do not leak NaN or Infinity into Excel diagnostics", () => {
  const fields = rowsToMap(getClimaxTrajectoryEvidenceRows({
    subMetricsCall2: { acousticTension: { climaxTrajectory: { score: Infinity, commentary: "" } } },
    liveMetrics: { calculatedClimaxTrajectoryScore: NaN, calculatedClimaxPositionRatio: NaN, calculatedClimaxBuildDb: -Infinity },
  }));
  assert.equal(fields["Gemini Call 2 numeric score (mapped tier)"], "NOT_CAPTURED");
  assert.equal(fields["Legacy DSP fallback score (not used when Call 2 is present)"], "NOT_CAPTURED");
  assert.equal(fields["Original Gemini Call 2 commentary (UNVERIFIED)"], "NOT_CAPTURED");
  assert.equal(fields["DSP measured energy peak position (not a quality score)"], "NOT_CAPTURED");
  assert.equal(fields["DSP measured energy build (not a quality score)"], "NOT_CAPTURED");
});

test("numeric zero, when captured, is preserved as raw evidence rather than treated as missing", () => {
  const fields = rowsToMap(getClimaxTrajectoryEvidenceRows({
    subMetricsCall2: { acousticTension: { climaxTrajectory: { score: 0, qualityTier: "SEVERE", commentary: "No discernible arc." } } },
    liveMetrics: { calculatedClimaxTrajectoryScore: 0, calculatedClimaxPositionRatio: 0, calculatedClimaxBuildDb: 0 },
  }));
  assert.equal(fields["Gemini Call 2 numeric score (mapped tier)"], 0);
  assert.equal(fields["Legacy DSP fallback score (not used when Call 2 is present)"], 0);
  assert.equal(fields["DSP measured energy peak position (not a quality score)"], "0.0% of runtime");
});

test("Excel Source Diagnostics uses helper while public report and scoring sources remain unchanged", async () => {
  const display = await readFile("src/components/CritiqueDisplay.tsx", "utf8");
  assert.match(display, /import \{ getClimaxTrajectoryEvidenceRows \} from "\.\.\/lib\/climaxEvidenceExport";/);
  assert.match(display, /for \(const evidence of getClimaxTrajectoryEvidenceRows\(critique\)\)/);
  assert.match(display, /wsSourceDiagnostics\.addRow\(evidence\)/);
  assert.match(display, /field: "Competing peaks \(informational; not scored\)"/);
  assert.match(display, /name: "Climax Trajectory",\s*score: climaxTrajectoryQualityScore \?\? 75/);
  const src = await readFile("server.ts", "utf8");
  assert.match(src, /assignTierScore\(call2\?\.acousticTension\?\.climaxTrajectory/);
});
