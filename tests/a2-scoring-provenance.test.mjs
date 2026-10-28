import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import {
  captureA2BeforeClient, captureA2AfterClient, captureA2BrowserUnavailable,
  captureA2ServerProductionInputs, captureA2ServerMixInputs,
  exactMixContribution, getA2ScoringProvenanceRows,
  appendA2ProvenanceToSourceDiagnostics,
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
  assert.equal((report.match(/appendA2ProvenanceToSourceDiagnostics\(wsSourceDiagnostics, critique\)/g)||[]).length,1);
  assert.equal((server.match(/model: "gemini-2\.5-flash"/g)||[]).length,7);
  assert.equal((server.match(/\.\.\.tierMetricProperties/g)||[]).length,36);
  assert.match(server, /\[c1Ready\.spaceAndDensity\?\.score, 35\]/);
  assert.match(server, /computeMixBalanceScore\(c1Ready, true\)/);
});


test("undefined browser stage is never marked COMPLETED, even with a server ledger", () => {
  const c = f();
  captureA2ServerMixInputs(c);
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, M, "Browser scoring stage"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Contribution provenance"), "CAPTURED_SERVER_ONLY_BROWSER_NOT_CAPTURED");
  approx(row(rows, M, "Exact pre-round weighted contribution (points)"), 88*25/75);
  assert.equal(row(rows, M, "Pre-client score after server reconciliation"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Post-client child score"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Contribution basis"), "SERVER MIX INPUTS ONLY (BROWSER STAGE NOT CAPTURED)");
  // Neither the mere presence of A2 nor a client cap candidate proves a browser pass.
  c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing.clientCapReason = "NONE";
  assert.equal(row(getA2ScoringProvenanceRows(c), M, "Browser scoring stage"), "NOT_CAPTURED");
});

test("inapplicable Midrange records NOT_APPLICABLE contribution with remaining denominator", () => {
  const c = f();
  c.subMetricsCall1.midrangeSpacing.applicable = false;
  c.subMetricsCall1.midrangeSpacing.score = 0;
  c.subMetricsCall1.lowEndDivision.applicable = false;
  captureA2ServerMixInputs(c);
  captureA2BeforeClient(c);
  captureA2AfterClient(c, { midrangeCap: null, spaceDensityCeiling: null });
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, M, "Browser scoring stage"), "COMPLETED");
  assert.equal(row(rows, M, "Metric applicability"), "false");
  assert.equal(row(rows, M, "Actual aggregation denominator (weight units)"), 30);
  assert.equal(row(rows, M, "Effective aggregate weight (%; computed from exact ratio)"), "NOT_APPLICABLE");
  assert.equal(row(rows, M, "Exact pre-round weighted contribution (points)"), "NOT_APPLICABLE");
  assert.equal(row(rows, M, "Contribution provenance"), "CAPTURED_POST_CLIENT");
  assert.equal(c.subMetricsCall1.midrangeSpacing.score, 0);
});

test("legacy data never gets an invented A2 contribution or a fabricated capture status", () => {
  const c = f();
  delete c.subMetricsCall1.a2ScoringProvenance;
  const before = structuredClone(c);
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, M, "Browser scoring stage"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Actual aggregation denominator (weight units)"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Effective aggregate weight (%; computed from exact ratio)"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Exact pre-round weighted contribution (points)"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Contribution provenance"), "NOT_CAPTURED (legacy report; A2 ledger absent)");
  assert.deepEqual(c, before);
});

test("post-browser Mix contribution is frozen at scoring, not reconstructed from later report data", () => {
  const c = f();
  captureA2ServerMixInputs(c);
  captureA2BeforeClient(c);
  c.subMetricsCall1.midrangeSpacing.score = 72;
  captureA2AfterClient(c, { midrangeCap: 72, spaceDensityCeiling: null });
  const trace = c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing;
  assert.equal(trace.postClientMixDenominator, 75);
  approx(trace.postClientMixEffectiveWeight, 100 / 3);
  assert.equal(trace.postClientMixContribution, 24);
  // A later edit/legacy replay must not silently rewrite captured arithmetic.
  c.subMetricsCall1.midrangeSpacing.score = 80;
  c.subMetricsCall1.lowEndDivision.applicable = false;
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, M, "Current score shown in report"), 80);
  assert.equal(row(rows, M, "Actual aggregation denominator (weight units)"), 75);
  approx(row(rows, M, "Effective aggregate weight (%; computed from exact ratio)"), 100 / 3);
  assert.equal(row(rows, M, "Exact pre-round weighted contribution (points)"), 24);
  assert.equal(row(rows, M, "Contribution provenance"), "CAPTURED_POST_CLIENT");
  assert.equal(row(rows, M, "Contribution basis"), "FROZEN POST-CLIENT MIX AGGREGATION BEFORE PARENT CEILING");
});

test("older completed-stage traces without frozen post-client inputs never invent their contribution", () => {
  const c = f();
  captureA2ServerMixInputs(c);
  captureA2BeforeClient(c);
  c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing.browserScoringStage = "COMPLETED";
  c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing.postClientScore = 72;
  c.subMetricsCall1.midrangeSpacing.score = 72;
  const rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, M, "Browser scoring stage"), "COMPLETED");
  assert.equal(row(rows, M, "Actual aggregation denominator (weight units)"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Effective aggregate weight (%; computed from exact ratio)"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Exact pre-round weighted contribution (points)"), "NOT_CAPTURED");
  assert.equal(row(rows, M, "Contribution provenance"), "NOT_CAPTURED (post-client aggregation snapshot absent)");
  assert.equal(row(rows, M, "Contribution basis"), "POST-CLIENT MIX NOT_CAPTURED (no frozen snapshot)");
  approx(row(rows, M, "Server Mix Balance contribution before browser correction"), 88*25/75);
});

test("simulated sanitized API response roundtrips through ACTUAL A2 ExcelJS Source Diagnostics writer", async () => {
  const c = f();
  captureA2ServerProductionInputs(c);
  captureA2ServerMixInputs(c);
  const originalScores = {
    production: c.scores.overallProduction,
    mix: c.mixQuality.score,
    space: c.subMetricsCall1.spaceAndDensity.score,
    mids: c.subMetricsCall1.midrangeSpacing.score,
  };
  withholdA2RawEvidence(c);
  // Simulates the public JSON response serialization performed on every critique route.
  const apiResponse = JSON.parse(JSON.stringify({ critique: c }));
  assert.ok(!JSON.stringify(apiResponse).includes("RAW PRIVATE"));
  const client = apiResponse.critique;
  captureA2BeforeClient(client);
  client.subMetricsCall1.midrangeSpacing.score = 72; // existing DSP guard simulated
  captureA2AfterClient(client, { midrangeCap: 72, spaceDensityCeiling: null });
  const book = new ExcelJS.Workbook();
  const source = book.addWorksheet("Source Diagnostics");
  source.columns = [
    { header: "Metric", key: "section", width: 24 },
    { header: "Diagnostic field", key: "field", width: 38 },
    { header: "Recorded evidence / decision", key: "value", width: 110 },
  ];
  appendA2ProvenanceToSourceDiagnostics(source, client);
  const buffer = await book.xlsx.writeBuffer();
  const replay = new ExcelJS.Workbook();
  await replay.xlsx.load(buffer);
  const sheet = replay.getWorksheet("Source Diagnostics");
  assert.ok(sheet);
  assert.equal(sheet.getCell("A1").value, "Metric");
  assert.equal(sheet.getCell("B1").value, "Diagnostic field");
  const cells = [];
  const map = new Map();
  sheet.eachRow((excelRow, index) => {
    for (let col = 1; col <= 3; col++) cells.push(String(excelRow.getCell(col).value ?? ""));
    if (index > 1) map.set(String(excelRow.getCell(1).value)+"::"+String(excelRow.getCell(2).value),excelRow.getCell(3).value);
  });
  const readWorkbook = (section, field) => {
    const key = section+"::"+field;
    assert.ok(map.has(key), "Workbook missing " + key);
    return map.get(key);
  };
  assert.ok(!cells.join(" ").includes("RAW PRIVATE"));
  assert.ok(!cells.join(" ").includes("rawCommentary"));
  assert.equal(readWorkbook(M,"Raw Gemini qualityTier/commentary access"),"RESTRICTED_INTERNAL_ONLY");
  assert.match(readWorkbook(M,"Original raw Gemini commentary in ordinary export"),/REDACTED/);
  assert.equal(readWorkbook(M,"Browser scoring stage"),"COMPLETED");
  assert.equal(readWorkbook(M,"Actual aggregation denominator (weight units)"),75);
  assert.equal(readWorkbook(M,"Exact pre-round weighted contribution (points)"),24);
  assert.equal(readWorkbook(M,"Pre-client score after server reconciliation"),88);
  assert.equal(readWorkbook(M,"Post-client child score"),72);
  assert.equal(readWorkbook(M,"Client cap reason"),"MIDRANGE_FLATNESS_CAP");
  assert.equal(readWorkbook(S,"Exact pre-round weighted contribution (points)"),30.8);
  assert.equal(readWorkbook(S,"Contribution basis"),"SERVER ORIGINAL AGGREGATION (not recomputed from post-client score)");
  assert.equal(client.scores.overallProduction,originalScores.production);
  assert.equal(client.mixQuality.score,originalScores.mix);
  assert.equal(client.subMetricsCall1.spaceAndDensity.score,originalScores.space);
  assert.equal(originalScores.mids,88);
});


const W = "A2 Parent Weight Paths";

test("A2 weight path captures exact effective mix share and unchanged parent scores", () => {
  const c = f();
  const frozenBefore = structuredClone(c);
  captureA2ServerProductionInputs(c);
  captureA2ServerMixInputs(c);
  captureA2BeforeClient(c);
  c.subMetricsCall1.midrangeSpacing.score = 76; // synthetic browser cap, not an A2 recording
  captureA2AfterClient(c, { midrangeCap: 76, spaceDensityCeiling: null });
  const state = structuredClone(c);
  let rows = getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, W, "Diagnostic record scope"), "FORMULA_ONLY_PLUS_CAPTURED_A2_INPUTS");
  assert.equal(row(rows, W, "Spectral Match direct weight in Production Index (%)"), 0);
  assert.equal(row(rows, W, "Midrange Spacing direct weight in Production Index (%)"), 0);
  assert.equal(row(rows, W, "Spectral Match nominal weight in Engagement Power (%)"), 10);
  assert.equal(row(rows, W, "Spectral Match direct path to Streaming Readiness (%)"), 3);
  assert.match(row(rows, W, "Streaming Readiness completion proxy caveat"), /not total sensitivity/);
  assert.equal(row(rows, W, "Frozen Mix Balance denominator (weight units)"), 75);
  approx(row(rows, W, "Midrange effective Mix Balance weight from frozen A2 denominator (%)"), 100/3);
  approx(row(rows, W, "Midrange conditional Sonic Soundprint path via Mix Balance (%)"), 50/3);
  assert.equal(row(rows, W, "Mix Balance denominator provenance"), "CAPTURED_POST_CLIENT");
  assert.deepEqual(c, state); // pure report diagnostics
  assert.deepEqual(c.scores, frozenBefore.scores);
  assert.deepEqual(c.mixQuality, frozenBefore.mixQuality);

  // Compare frozen 55-weight vs 75-weight applicability cases, not fabricated
  // original Boston parent scores. Other inputs are held fixed for sensitivity.
  const cleanCase = f();
  cleanCase.subMetricsCall1.lowEndDivision.applicable = false;
  captureA2ServerMixInputs(cleanCase);
  captureA2BeforeClient(cleanCase);
  captureA2AfterClient(cleanCase, { midrangeCap: null, spaceDensityCeiling: null });
  rows = getA2ScoringProvenanceRows(cleanCase);
  assert.equal(row(rows, W, "Frozen Mix Balance denominator (weight units)"), 55);
  approx(row(rows, W, "Midrange effective Mix Balance weight from frozen A2 denominator (%)"), 2500/55);
  approx(row(rows, W, "Midrange conditional Sonic Soundprint path via Mix Balance (%)"), 1250/55);
});

test("A2 parent dilution checks Boston arithmetic without asserting missing paired evidence", () => {
  // Formula-only illustrative replay, NOT a reconstructed historical export.
  const cleanProduction = Math.round(88*.40 + 88*.35 + 88*.25);
  const alteredProduction = Math.round(90*.40 + 88*.35 + 88*.25);
  assert.equal(cleanProduction, 88);
  assert.equal(alteredProduction, 89);
  const spectralToEngagement = (88-68) * .10;
  assert.equal(spectralToEngagement, 2);
  const streamingDirectPath = spectralToEngagement * .30;
  approx(streamingDirectPath, .6);
  const midrangeEffectWithCleanDenominator = (88-76)*25/55;
  const midrangeEffectWithAlteredDenominator = (88-76)*25/75;
  approx(midrangeEffectWithCleanDenominator, 60/11);
  assert.equal(midrangeEffectWithAlteredDenominator, 4);
  // Neither figure equals an observed Mix Balance delta: all other scores and
  // applicability decisions would need to be frozen to make a causal claim.
});

test("legacy and incomplete browser A2 traces do not invent dilution contribution", () => {
  const legacy=f();
  delete legacy.subMetricsCall1.a2ScoringProvenance;
  let rows=getA2ScoringProvenanceRows(legacy);
  assert.equal(row(rows, W, "Diagnostic record scope"), "NOT_CAPTURED (legacy/non-A2)");
  assert.equal(row(rows, W, "Frozen Mix Balance denominator (weight units)"), "NOT_CAPTURED");
  assert.equal(row(rows, W, "Midrange conditional Sonic Soundprint path via Mix Balance (%)"), "NOT_CAPTURED");
  const c=f();
  captureA2ServerMixInputs(c);
  captureA2BeforeClient(c);
  c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing.browserScoringStage="COMPLETED";
  const rows2=getA2ScoringProvenanceRows(c);
  assert.equal(row(rows2, W, "Frozen Mix Balance denominator (weight units)"), "NOT_CAPTURED");
  assert.equal(row(rows2, W, "Mix Balance denominator provenance"),
    "NOT_CAPTURED (missing frozen post-client denominator)");
  c.subMetricsCall1.midrangeSpacing.applicable=false;
  c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing.browserScoringStage="BROWSER_DSP_UNAVAILABLE";
  rows=getA2ScoringProvenanceRows(c);
  assert.equal(row(rows, W, "Midrange conditional Sonic Soundprint path via Mix Balance (%)"), "NOT_APPLICABLE");
  assert.equal(row(rows, W, "Mix Balance denominator provenance"), "SERVER_ONLY_BROWSER_UNAVAILABLE");
});
