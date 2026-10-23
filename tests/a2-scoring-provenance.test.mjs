import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  captureA2BeforeClient, captureA2AfterClient, captureA2BrowserUnavailable,
  captureA2ServerProductionInputs, captureA2ServerMixInputs,
  exactMixContribution, getA2ScoringProvenanceRows,
} from "../src/lib/a2ScoringProvenance.ts";
import {
  a2InternalAccessAllowed, withholdA2RawEvidence, getRestrictedA2RawEvidence,
} from "../src/lib/a2InternalEvidence.ts";

const SECRET = "private-a2-test-secret-12345678901234567890";
const f = () => ({
  productionScoringVersion: "scoring-tier-v8-mud-diagnostic",
  subMetricsCall1: {
    aestheticDesign: { score: 90 }, paletteCohesion: { score: 85 },
    spaceAndDensity: { qualityTier: "PROFESSIONAL_HIGH", score: 88, commentary: "Safe displayed Space commentary" },
    midrangeSpacing: { qualityTier: "PROFESSIONAL_HIGH", score: 88, commentary: "Safe displayed Midrange commentary" },
    lowEndDivision: { score: 88, applicable: true }, sibilanceShaving: { score: 85, applicable: true },
    stereoWidth: { score: 88, applicable: true },
    a2ScoringProvenance: {
      spaceAndDensity: { rawQualityTier: "PROFESSIONAL_HIGH", rawCommentary: "RAW PRIVATE SPACE CLAIM", canonicalMappedScore: 88, serverCap: null, serverCapReason: "NONE" },
      midrangeSpacing: { rawQualityTier: "PROFESSIONAL_HIGH", rawCommentary: "RAW PRIVATE MIDRANGE CLAIM", canonicalMappedScore: 88, serverCapReason: "NOT_APPLICABLE" },
    },
  },
  scores: { overallProduction: 88 }, mixQuality: { score: 88 },
  productionFinishEvidence: { ceiling: null, summary: "No multi-signal outlier" },
  mixBalanceEvidence: { midrangeCap: 72, summary: "Measured evidence" },
  liveMetrics: { calculatedMidrangeFlatness: .38, calculatedMidrangeFlux: 12.5,
    calculatedCoreMidsBandEnergy: 47, calculatedLowMidsBandEnergy: 67,
    calculatedFinishMidPct: 25.1, calculatedFinishSubPct: 2.1, calculatedFinishAirPct: 1.2 },
});
const row = (rows, section, field) => {
  const hit = rows.find(x => x.section === section && x.field === field);
  assert.ok(hit, "missing row: " + section + "/" + field);
  return hit.value;
};
const approx = (a, b) => assert.ok(Math.abs(a-b) < 0.000001, String(a) + " != " + String(b));
const S = "A2 Space & Density", M = "A2 Midrange Spacing";

test("Server Production Index contribution uses original 35/100 weighting", () => {
  const c = f(), old = structuredClone(c.scores);
  captureA2ServerProductionInputs(c);
  const e = c.subMetricsCall1.a2ScoringProvenance.spaceAndDensity;
  assert.equal(e.productionDenominator, 100);
  assert.equal(e.productionContribution, 30.8);
  approx(e.productionWeightedMean, 88.05);
  assert.deepEqual(c.scores, old);
});

test("Server Production Index correctly renormalizes missing child without changing score", () => {
  const c = f();
  delete c.subMetricsCall1.aestheticDesign.score;
  captureA2ServerProductionInputs(c);
  let e = c.subMetricsCall1.a2ScoringProvenance.spaceAndDensity;
  assert.equal(e.productionDenominator, 60);
  approx(e.productionEffectiveWeight, 3500/60);
  approx(e.productionContribution, 88*35/60);
  c.subMetricsCall1.spaceAndDensity.applicable = false;
  captureA2ServerProductionInputs(c);
  assert.equal(e.productionDenominator, 60); // server weightedAvg checks numeric only
  delete c.subMetricsCall1.spaceAndDensity.score;
  captureA2ServerProductionInputs(c);
  assert.equal(e.productionContribution, null);
  assert.equal(e.productionDenominator, 25);
});

test("Mix contribution uses exact applicable denominator, never rounded display weight", () => {
  const c = f();
  let m = exactMixContribution(c);
  assert.equal(m.denominator, 75);
  assert.equal(m.contribution, 88*25/75);
  approx(m.effectiveWeight, 100/3);
  c.subMetricsCall1.lowEndDivision.applicable = false;
  m = exactMixContribution(c);
  assert.equal(m.denominator, 55);
  assert.equal(m.contribution, 40);
  approx(m.effectiveWeight, 2500/55);
  c.subMetricsCall1.sibilanceShaving.applicable = false;
  m = exactMixContribution(c);
  assert.equal(m.denominator, 40);
  assert.equal(m.contribution, 55);
  c.subMetricsCall1.midrangeSpacing.applicable = false;
  m = exactMixContribution(c);
  assert.equal(m.contribution, null);
  assert.equal(m.effectiveWeight, null);
});

test("Historical scored Mud Prevention retains 25 weight units", () => {
  const c = f();
  c.productionScoringVersion = "legacy"; c.subMetricsCall1.mudPrevention = { score: 88 };
  assert.equal(exactMixContribution(c).denominator, 100);
});

test("No cap, server cap, client cap and final parent are reported as distinct", () => {
  const c = f();
  captureA2ServerProductionInputs(c);
  const e = c.subMetricsCall1.a2ScoringProvenance.spaceAndDensity;
  e.serverProductionParentScore = 84;
  e.serverCap = 85; e.serverCapReason = "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING";
  c.subMetricsCall1.spaceAndDensity.score = 85;
  captureA2ServerMixInputs(c);
  captureA2BeforeClient(c);
  c.subMetricsCall1.spaceAndDensity.score = 84;
  c.subMetricsCall1.midrangeSpacing.score = 72;
  captureA2AfterClient(c, { midrangeCap: 72, spaceDensityCeiling: 84 });
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, S, "Server-side cap"), 85);
  assert.equal(row(rows, S, "Pre-client score after server reconciliation"), 85);
  assert.equal(row(rows, S, "Post-client child score"), 84);
  assert.equal(row(rows, S, "Exact pre-round weighted contribution (points)"), 30.8);
  assert.equal(row(rows, S, "Server original parent score after ceiling"), 84);
  assert.equal(row(rows, M, "Server-side cap"), "NOT_APPLICABLE");
  assert.equal(row(rows, M, "Client cap reason"), "MIDRANGE_FLATNESS_CAP");
  assert.equal(row(rows, M, "Exact pre-round weighted contribution (points)"), 24);
  assert.equal(row(rows, M, "Server Mix Balance contribution before browser correction"), 88*25/75);
  assert.equal(c.scores.overallProduction, 88);
  assert.equal(c.mixQuality.score, 88);
});

test("NONE when cap does not apply and missing DSP is explicitly marked", () => {
  const c = f();
  captureA2BeforeClient(c);
  captureA2AfterClient(c, { midrangeCap: null, spaceDensityCeiling: null });
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, S, "Server-side cap"), "NONE");
  assert.equal(row(rows, S, "Server-side cap reason"), "NONE");
  assert.equal(row(rows, M, "Client cap reason"), "NONE");
  assert.equal(row(rows, M, "Applied client cap"), "NONE");
  const absent = f();
  const existingScore = absent.subMetricsCall1.midrangeSpacing.score;
  captureA2BrowserUnavailable(absent);
  const noDsp = getA2ScoringProvenanceRows(absent);
  assert.equal(row(noDsp, M, "Browser scoring stage"), "BROWSER_DSP_UNAVAILABLE");
  assert.equal(row(noDsp, M, "Post-client child score"), "NOT_CAPTURED");
  assert.equal(absent.subMetricsCall1.midrangeSpacing.score, existingScore);
});

test("Legacy and missing metric cases never invent evidence", () => {
  const c = { subMetricsCall1: { spaceAndDensity: { score: 85 } } };
  const old = structuredClone(c);
  captureA2BeforeClient(c);
  captureA2AfterClient(c, { midrangeCap: null, spaceDensityCeiling: null });
  assert.deepEqual(c, old);
  const rows = getA2ScoringProvenanceRows(c);
  assert.match(row(rows, S, "A2 capture"), /NOT_CAPTURED/);
  assert.equal(row(rows, S, "Server-side cap"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Exact pre-round weighted contribution (points)"), "NOT_CAPTURED");
});

test("Raw A2 evidence is withheld from public JSON and only authorized token can retrieve", () => {
  const c = f(), raw = c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing.rawCommentary;
  const id = withholdA2RawEvidence(c, 1000);
  assert.match(id, /^[0-9a-f-]{36}$/i);
  assert.ok(!JSON.stringify(c).includes("RAW PRIVATE"));
  assert.ok(!JSON.stringify(c).includes("rawCommentary"));
  assert.ok(!JSON.stringify(c).includes("rawQualityTier"));
  assert.equal(c.subMetricsCall1.midrangeSpacing.commentary, "Safe displayed Midrange commentary");
  assert.equal(a2InternalAccessAllowed("Bearer " + SECRET, SECRET), true);
  assert.equal(getRestrictedA2RawEvidence(id, "Bearer wrong", SECRET, 1001), null);
  assert.equal(getRestrictedA2RawEvidence(id, "Bearer " + SECRET, "short", 1001), null);
  assert.equal(getRestrictedA2RawEvidence(id, "Bearer " + SECRET, SECRET, 1001).midrangeSpacing.commentary, raw);
  assert.equal(getRestrictedA2RawEvidence(id, "Bearer " + SECRET, SECRET, 1000 + 24*60*60*1000 + 1), null);
});

test("Ordinary Excel Source Diagnostics never leaks raw text even from an unredacted fixture", () => {
  const c = f();
  assert.ok(!JSON.stringify(getA2ScoringProvenanceRows(c)).includes("RAW PRIVATE"));
  withholdA2RawEvidence(c);
  const rows = getA2ScoringProvenanceRows(c);
  assert.ok(!JSON.stringify(rows).includes("RAW PRIVATE"));
  assert.match(JSON.stringify(rows), /REDACTED/);
  assert.match(JSON.stringify(rows), /RESTRICTED_INTERNAL_ONLY/);
});

test("Static integration gates preserve Gemini 2.5, tier schema, scoring weights and report boundary", () => {
  const server = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  const report = readFileSync(new URL("../src/components/CritiqueDisplay.tsx", import.meta.url), "utf8");
  assert.equal((server.match(/withholdA2RawEvidence\((?:parsedCritique|critique)\)/g)||[]).length,3);
  assert.match(server, /app\.get\("\/api\/internal\/a2-evidence\/:id"/);
  assert.match(server, /process\.env\.YSS_A2_INTERNAL_TOKEN/);
  assert.match(server, /captureA2ServerProductionInputs\(parsedCritique\)/);
  assert.match(server, /captureA2ServerMixInputs\(parsedCritique\)/);
  assert.match(app, /captureA2BrowserUnavailable\(overriddenCritique\)/);
  assert.match(app, /captureA2BrowserUnavailable\(overriddenFinalCritique\)/);
  assert.equal((report.match(/getA2ScoringProvenanceRows\(critique\)/g)||[]).length,1);
  assert.equal((server.match(/model: "gemini-2\.5-flash"/g)||[]).length,7);
  assert.equal((server.match(/\.\.\.tierMetricProperties/g)||[]).length,36);
  assert.match(server, /\[c1Ready\.spaceAndDensity\?\.score, 35\]/);
  assert.match(server, /computeMixBalanceScore\(c1Ready, true\)/);
});
