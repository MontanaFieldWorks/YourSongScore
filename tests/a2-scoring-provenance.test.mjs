import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  captureA2BeforeClient,
  captureA2AfterClient,
  getA2ScoringProvenanceRows,
} from "../src/lib/a2ScoringProvenance.ts";

const fixture = () => ({
  productionScoringVersion: "scoring-tier-v8-mud-diagnostic",
  subMetricsCall1: {
    spaceAndDensity: { qualityTier: "PROFESSIONAL_HIGH", score: 88, commentary: "current space commentary" },
    midrangeSpacing: { qualityTier: "PROFESSIONAL_HIGH", score: 88, commentary: "current midrange commentary" },
    lowEndDivision: { score: 88, applicable: true },
    sibilanceShaving: { score: 85, applicable: true },
    stereoWidth: { score: 88, applicable: true },
    a2ScoringProvenance: {
      spaceAndDensity: { rawQualityTier: "PROFESSIONAL_HIGH", rawCommentary: "Raw Gemini space critique", canonicalMappedScore: 88 },
      midrangeSpacing: { rawQualityTier: "PROFESSIONAL_HIGH", rawCommentary: "Raw Gemini mids critique", canonicalMappedScore: 88 },
    },
  },
  scores: { overallProduction: 88 },
  mixQuality: { score: 88 },
  productionFinishEvidence: { ceiling: null, summary: "No multi-signal finish outlier" },
  liveMetrics: { calculatedMidrangeFlatness: .38, calculatedMidrangeFlux: 12.5, calculatedCoreMidsBandEnergy: 47, calculatedLowMidsBandEnergy: 67, calculatedFinishMidPct: 25.1, calculatedFinishSubPct: 2.1, calculatedFinishAirPct: 1.2, calculatedCrestFactorDb: 14.3 },
  mixBalanceEvidence: { midrangeCap: 72, summary: "Real measured evidence" },
});

const read = (rows, section, field) => {
  const match = rows.find(x => x.section === section && x.field === field);
  assert.ok(match, "missing row: " + section + "/" + field);
  return match.value;
};

test("captures raw Call 1 evidence and both stage scores while leaving score calculations untouched", () => {
  const c = fixture();
  const originalScores = {
    space: c.subMetricsCall1.spaceAndDensity.score,
    mids: c.subMetricsCall1.midrangeSpacing.score,
    production: c.scores.overallProduction,
    mix: c.mixQuality.score,
  };
  captureA2BeforeClient(c);
  assert.deepEqual(originalScores, {
    space: c.subMetricsCall1.spaceAndDensity.score,
    mids: c.subMetricsCall1.midrangeSpacing.score,
    production: c.scores.overallProduction,
    mix: c.mixQuality.score,
  });
  c.subMetricsCall1.midrangeSpacing.score = 72; // simulated EXISTING client cap; helper never assigns
  captureA2AfterClient(c, { midrangeCap: 72, spaceDensityCeiling: null });
  const rows = getA2ScoringProvenanceRows(c);
  const section = "A2 Midrange Spacing";
  assert.equal(read(rows, section, "Raw Gemini Call 1 qualityTier (UNVERIFIED)"), "PROFESSIONAL_HIGH");
  assert.equal(read(rows, section, "Original Gemini Call 1 commentary (UNVERIFIED)"), "Raw Gemini mids critique");
  assert.equal(read(rows, section, "Server canonical tier-mapped score (before server ceiling)"), 88);
  assert.equal(read(rows, section, "Pre-client score (after server reconciliation)"), 88);
  assert.equal(read(rows, section, "Post-client score (after all client guardrails)"), 72);
  assert.equal(read(rows, section, "Client score-change/cap reason"), "MIDRANGE_FLATNESS_CAP");
  assert.equal(read(rows, section, "Client cap limit (if applied)"), 72);
  assert.equal(read(rows, section, "Effective parent weight (percent)"), 33.3);
  assert.equal(read(rows, section, "Weighted point contribution BEFORE parent ceiling/penalties"), 23.976);
  assert.equal(read(rows, section, "DSP midrange spectral flatness"), .38);
  assert.equal(read(rows, section, "DSP midrange spectral flux"), 12.5);
  assert.equal(c.subMetricsCall1.spaceAndDensity.score, 88);
  assert.equal(c.subMetricsCall1.midrangeSpacing.score, 72);
  assert.equal(c.scores.overallProduction, 88);
  assert.equal(c.mixQuality.score, 88);
});

test("server cap is distinguishable from a later client cap; Space & Density weight is 35%", () => {
  const c = fixture();
  c.subMetricsCall1.a2ScoringProvenance.spaceAndDensity.serverCap = 85;
  c.subMetricsCall1.a2ScoringProvenance.spaceAndDensity.serverCapReason = "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING";
  c.subMetricsCall1.spaceAndDensity.score = 85;
  captureA2BeforeClient(c);
  captureA2AfterClient(c, { midrangeCap: null, spaceDensityCeiling: 84 });
  const rows = getA2ScoringProvenanceRows(c), section = "A2 Space & Density";
  assert.equal(read(rows, section, "Server canonical tier-mapped score (before server ceiling)"), 88);
  assert.equal(read(rows, section, "Server-side production-finish cap"), 85);
  assert.equal(read(rows, section, "Pre-client score (after server reconciliation)"), 85);
  assert.equal(read(rows, section, "Post-client score (after all client guardrails)"), 85);
  assert.equal(read(rows, section, "Client score-change/cap reason"), "NONE");
  assert.equal(read(rows, section, "Effective parent weight (percent)"), 35);
  assert.equal(read(rows, section, "Weighted point contribution BEFORE parent ceiling/penalties"), 29.75);
});

test("N/A Low-End Division is renormalized; parent score not treated as a child contribution", () => {
  const c = fixture();
  c.subMetricsCall1.lowEndDivision.applicable = false;
  captureA2BeforeClient(c);
  captureA2AfterClient(c, { midrangeCap: null, spaceDensityCeiling: null });
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(read(rows, "A2 Midrange Spacing", "Effective parent weight (percent)"), 45.5);
  assert.equal(read(rows, "A2 Midrange Spacing", "Weighted point contribution BEFORE parent ceiling/penalties"), 40.04);
  assert.equal(read(rows, "A2 Midrange Spacing", "Final parent total (may include other children/caps/penalties)"), 88);
});

test("unknown or legacy evidence does not manufacture raw tiers, caps, DSP measurements or mapped scores", () => {
  const legacy = { subMetricsCall1: { midrangeSpacing: { score: 88 }, spaceAndDensity: { score: 85 } } };
  const before = structuredClone(legacy);
  captureA2BeforeClient(legacy);
  captureA2AfterClient(legacy, { midrangeCap: null, spaceDensityCeiling: null });
  const rows = getA2ScoringProvenanceRows(legacy);
  assert.deepEqual(legacy, before);
  assert.equal(read(rows, "A2 Space & Density", "A2 capture"), "NOT_CAPTURED (legacy report or Call 1 unavailable)");
  assert.equal(read(rows, "A2 Space & Density", "Raw Gemini Call 1 qualityTier (UNVERIFIED)"), "NOT_CAPTURED");
  assert.equal(read(rows, "A2 Midrange Spacing", "Effective parent weight (percent)"), "NOT_CAPTURED");
  assert.equal(read(rows, "A2 Midrange Spacing", "DSP midrange spectral flatness"), "NOT_CAPTURED");
});

test("source capture and worksheet integration remain diagnostic-only; no new provider prompts, schemas or scoring formulas", () => {
  const server = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const report = readFileSync(new URL("../src/components/CritiqueDisplay.tsx", import.meta.url), "utf8");
  assert.match(server, /call1\.a2ScoringProvenance = \{\};/);
  assert.match(server, /a2Entry\.canonicalMappedScore = canonicalScore/);
  assert.match(server, /trace\.serverCapReason = "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING"/);
  assert.match(app, /captureA2BeforeClient\(critique\)/);
  assert.match(app, /captureA2AfterClient\(critique, \{ midrangeCap, spaceDensityCeiling: null \}\)/);
  assert.match(app, /captureA2AfterClient\(critique, \{ midrangeCap, spaceDensityCeiling \}\)/);
  const first = report.indexOf('workbook.addWorksheet("Source Diagnostics"');
  const append = report.indexOf("getA2ScoringProvenanceRows(critique)");
  assert.ok(first >= 0 && append > first);
  assert.equal(report.match(/getA2ScoringProvenanceRows\(critique\)/g)?.length, 1);
  assert.equal((server.match(/model: "gemini-2\.5-flash"/g) || []).length, 7);
  assert.equal((server.match(/\.\.\.tierMetricProperties/g) || []).length, 36);
  assert.match(server, /\[c1Ready\.spaceAndDensity\?\.score, 35\]/);
  assert.match(server, /computeMixBalanceScore\(c1Ready, true\)/);
});
