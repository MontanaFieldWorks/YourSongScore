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
  // The real workbook must preserve formula-only headline paths without
  // implying an invented model call or reconstructed historical contribution.
  assert.equal(readWorkbook(W,"Spectral Match direct path to Streaming Readiness (%)"),3);
  assert.equal(readWorkbook(W,"Frozen Mix Balance denominator (weight units)"),75);
  approx(readWorkbook(W,"Midrange conditional Sonic Soundprint path via Mix Balance (%)"),50/3);
  assert.equal(readWorkbook(W,"Mix Balance denominator provenance"),"CAPTURED_POST_CLIENT");

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


/**
 * Post-A2 read-only fixtures transcribed from the four exported workbooks
 * (October 28, 2026). These are frozen OBSERVATIONS, not DSP ground-truth
 * scores and not a new production input or a causal paired-song correction.
 */
const A2_FOUR_CASE_OBSERVATIONS = Object.freeze([
  { id: "BOSTON_CLEAN", pair: "BOSTON", spectral: 88, space: 88, modelTier: "PROFESSIONAL_HIGH", midrange: 88,
    flatness: .571, midrangeCap: null, lowEndApplicable: false,
    production: 88, mix: 86, vocal: 88, instrumental: 89,
    sonic: 87, streaming: 89, backingLayers: false },
  { id: "T01_B", pair: "BOSTON", spectral: 68, space: 88, modelTier: "PROFESSIONAL_HIGH", midrange: 76,
    flatness: .445, midrangeCap: 76, lowEndApplicable: true,
    production: 89, mix: 84, vocal: 91, instrumental: 89,
    sonic: 87, streaming: 88, backingLayers: true },
  { id: "DRAKE_CLEAN", pair: "DRAKE", spectral: 88, space: 88, modelTier: "PROFESSIONAL_HIGH", midrange: 88,
    flatness: .515, midrangeCap: null, lowEndApplicable: true,
    production: 89, mix: 89, vocal: 87, instrumental: 87,
    sonic: 88, streaming: 91, backingLayers: true },
  { id: "T02_B", pair: "DRAKE", spectral: 76, space: 88, modelTier: "PROFESSIONAL_HIGH", midrange: 72,
    flatness: .365, midrangeCap: 72, lowEndApplicable: true,
    production: 88, mix: 84, vocal: 87, instrumental: 88,
    sonic: 86, streaming: 87, backingLayers: false },
]);

test("post-A2 four-case evidence fixes paired deltas without implying automatic validity", () => {
  const c = A2_FOUR_CASE_OBSERVATIONS;
  assert.deepEqual(c.map(x => x.id), ["BOSTON_CLEAN", "T01_B", "DRAKE_CLEAN", "T02_B"]);
  assert.deepEqual([c[0].spectral-c[1].spectral, c[2].spectral-c[3].spectral], [20,12]);
  assert.deepEqual([c[0].midrange-c[1].midrange, c[2].midrange-c[3].midrange], [12,16]);
  assert.deepEqual([c[0].production-c[1].production, c[2].production-c[3].production], [-1,1]);
  assert.deepEqual([c[0].sonic-c[1].sonic, c[2].sonic-c[3].sonic], [0,2]);
  assert.deepEqual([c[0].streaming-c[1].streaming, c[2].streaming-c[3].streaming], [1,4]);
  for (const [clean, altered] of [[c[0],c[1]],[c[2],c[3]]]) {
    assert.equal(clean.pair, altered.pair);
    assert.notEqual(clean.backingLayers, altered.backingLayers,
      "single-listen presence flipped within unchanged underlying song");
  }
});

test("post-A2 replay preserves four raw PROFESSIONAL_HIGH tiers, deterministic cap stages and exact mix denominators", () => {
  const client = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(client, /midrangeFlatness <= 0\.40/);
  assert.match(client, /midrangeFlatness < 0\.45/);
  assert.match(client, /midrangeCap = 72/);
  assert.match(client, /midrangeCap = 76/);
  for (const item of A2_FOUR_CASE_OBSERVATIONS) {
    const deterministicCap = item.flatness <= .40 ? 72 :
      item.flatness < .45 ? 76 : null;
    assert.equal(deterministicCap, item.midrangeCap, item.id);
    const c = f();
    c.subMetricsCall1.lowEndDivision.applicable = item.lowEndApplicable;
    captureA2ServerMixInputs(c);
    captureA2BeforeClient(c);
    const originalModel = c.subMetricsCall1.midrangeSpacing.qualityTier;
    assert.equal(originalModel, "PROFESSIONAL_HIGH");
    c.subMetricsCall1.midrangeSpacing.score = item.midrange;
    captureA2AfterClient(c, {
      midrangeCap: deterministicCap, spaceDensityCeiling: null,
    });
    const rows = getA2ScoringProvenanceRows(c);
    assert.equal(row(rows, M, "Model-selected qualityTier (existing public metric)"),
      "PROFESSIONAL_HIGH", item.id);
    assert.equal(row(rows, M, "Pre-client score after server reconciliation"), 88);
    assert.equal(row(rows, M, "Post-client child score"), item.midrange, item.id);
    assert.equal(row(rows, M, "Browser scoring stage"), "COMPLETED", item.id);
    assert.equal(row(rows, M, "Client cap reason"),
      deterministicCap === null ? "NONE" : "MIDRANGE_FLATNESS_CAP", item.id);
    const denom = item.lowEndApplicable ? 75 : 55;
    assert.equal(row(rows, M, "Actual aggregation denominator (weight units)"), denom, item.id);
    approx(row(rows, M, "Exact pre-round weighted contribution (points)"),
      item.midrange * 25 / denom);
    assert.equal(c.scores.overallProduction, 88,
      "provenance capture never recalculates the scored Production Index");
  }
});

test("post-A2 Drake streaming-match counterfactual reproduces both final scores and isolates profile sensitivity", () => {
  const display = readFileSync(new URL("../src/components/CritiqueDisplay.tsx", import.meta.url), "utf8")
    .replace(/\s+/g, " ");
  assert.ok(display.includes("(completionRate * 0.40) + (echoNestAvgMatch * 0.30) + (commercialReadinessVal * 0.30)"),
    "replay must match current 40/30/30 production calculation");
  assert.ok(display.includes("Math.round((commercialReadinessVal * 0.70) + (overallProductionVal * 0.20))"),
    "replay must match current estimated skip-probability inputs");
  const cleanMatches = [100,100,100,100,100,100,100];
  const alteredMatches = [100,100,100,70,53,100,100];
  const average = scores => scores.reduce((sum,n)=>sum+n,0)/scores.length;
  assert.equal(average(cleanMatches), 100);
  assert.equal(average(alteredMatches), 89);
  // Explicitly hold liveSkipModifier at zero; both archived Drake masters
  // exceed the -12.5 LUFS penalty floor, and no negative-phase penalty is
  // established by these report fixtures. This is a conditional replay.
  const streaming = (engagement, production, genreMatch) => {
    const skip = Math.min(85, Math.max(0, 91-Math.round(engagement*.70+production*.20)));
    const completion = Math.min(100, Math.max(15, 100-skip));
    return Math.round(completion*.40+genreMatch*.30+engagement*.30);
  };
  assert.equal(streaming(87,89,average(cleanMatches)), 91);
  assert.equal(streaming(86,88,average(alteredMatches)), 87);
  assert.equal(streaming(86,88,average(cleanMatches)), 91,
    "altered Drake with clean matching profile is a four-point counterfactual, not verified restoration");
  assert.equal(streaming(86,88,average(cleanMatches))-streaming(86,88,average(alteredMatches)), 4);
});

test("post-A2 Sonic Soundprint cancellation and Production Index exclusion replay source formulas", () => {
  const display = readFileSync(new URL("../src/components/CritiqueDisplay.tsx", import.meta.url), "utf8");
  const server = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
  assert.match(display, /critique\?\.mixQuality\?\.score \?\? 75\) \* 0\.50/);
  assert.match(display, /critique\?\.performance\?\.vocalScore \?\? 75\) \* 0\.30/);
  assert.match(display, /critique\?\.performance\?\.instrumentalScore \?\? 75\) \* 0\.20/);
  assert.match(server, /\[c1Ready\.aestheticDesign\?\.score, 40\]/);
  assert.match(server, /\[c1Ready\.spaceAndDensity\?\.score, 35\]/);
  assert.match(server, /\[c1Ready\.paletteCohesion\?\.score, 25\]/);
  const sonicBase = c => Math.round(c.mix*.50+c.vocal*.30+c.instrumental*.20);
  for (const c of A2_FOUR_CASE_OBSERVATIONS)
    assert.equal(sonicBase(c), c.sonic, c.id);
  const b0=A2_FOUR_CASE_OBSERVATIONS[0],b1=A2_FOUR_CASE_OBSERVATIONS[1];
  approx((b0.mix-b1.mix)*.50, 1);
  approx((b0.vocal-b1.vocal)*.30, -.9);
  assert.equal(sonicBase(b0)-sonicBase(b1), 0);
  // Illustrative unchanged palette/space fixture. Do not attribute observed
  // production parent movement to Spectral Match or Midrange Spacing.
  assert.equal(Math.round(88*.4+88*.35+88*.25), 88);
  assert.equal(Math.round(90*.4+88*.35+88*.25), 89);
  const frozen = getA2ScoringProvenanceRows(f());
  assert.equal(row(frozen, "A2 Parent Weight Paths",
    "Spectral Match direct weight in Production Index (%)"), 0);
  assert.equal(row(frozen, "A2 Parent Weight Paths",
    "Midrange Spacing direct weight in Production Index (%)"), 0);
});


/**
 * Stage A: nonpaid contract diagnostics only. The observations below are frozen
 * A2 workbook transcriptions, not source-isolated masking labels. No new Gemini
 * calls, scoring formulas, cap policies, or production diagnostics are used.
 * The fixture's modelTier captures the observed choice, not a raw model narrative.
 */
test("Stage A freezes model tier mapping for both 88-saturated Call 1 metrics", () => {
  const server=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
  const start=server.indexOf("const PRODUCTION_QUALITY_TIER_SCORES:");
  const end=server.indexOf("const tierMetricProperties",start);
  assert.ok(start>=0 && end>start,"tier map must be found in current production source");
  const mapping=server.slice(start,end);
  const frozenTiers={
    REFERENCE:96, EXCEPTIONAL:93, ABOVE_AVERAGE:90,
    PROFESSIONAL_HIGH:88, PROFESSIONAL:85, LIMITED:79,
    MATERIAL_ISSUE:71, SEVERE:58,
  };
  for(const [tier,score] of Object.entries(frozenTiers))
    assert.match(mapping,new RegExp("\\b"+tier+"\\s*:\\s*"+score+"\\b"),tier);
  assert.match(server,/metric\.score = canonicalScore/);
  assert.match(server,/rawQualityTier: original\.qualityTier/);
  assert.match(server,/rawCommentary: original\.commentary/);
  for(const caseRecord of A2_FOUR_CASE_OBSERVATIONS) {
    assert.equal(caseRecord.modelTier,"PROFESSIONAL_HIGH",caseRecord.id);
    assert.equal(frozenTiers[caseRecord.modelTier],caseRecord.space,caseRecord.id);
    assert.equal(caseRecord.space,88,caseRecord.id);
    assert.equal(caseRecord.midrange<=88,true,caseRecord.id);
  }
});

test("Stage A frozen A2 replay distinguishes captured tier, server parent, browser cap and missing raw evidence", () => {
  for(const item of A2_FOUR_CASE_OBSERVATIONS) {
    const c=f();
    const originalScores=structuredClone(c.scores);
    const originalRaw=structuredClone(c.subMetricsCall1.a2ScoringProvenance);
    assert.equal(item.modelTier,c.subMetricsCall1.spaceAndDensity.qualityTier,item.id);
    assert.equal(item.modelTier,c.subMetricsCall1.midrangeSpacing.qualityTier,item.id);
    c.subMetricsCall1.lowEndDivision.applicable=item.lowEndApplicable;
    captureA2ServerProductionInputs(c);
    captureA2ServerMixInputs(c);
    captureA2BeforeClient(c);
    c.subMetricsCall1.midrangeSpacing.score=item.midrange; // frozen final value, NOT replayed DSP
    captureA2AfterClient(c,{midrangeCap:item.midrangeCap,spaceDensityCeiling:null});
    const rows=getA2ScoringProvenanceRows(c);
    assert.equal(row(rows,S,"Model-selected qualityTier (existing public metric)"),item.modelTier,item.id);
    assert.equal(row(rows,S,"Canonical mapped score before server caps"),88,item.id);
    assert.equal(row(rows,S,"Post-client child score"),item.space,item.id);
    assert.equal(row(rows,S,"Server-side cap"),"NONE",item.id);
    assert.equal(row(rows,S,"Applied client cap"),"NONE",item.id);
    assert.equal(row(rows,M,"Model-selected qualityTier (existing public metric)"),item.modelTier,item.id);
    assert.equal(row(rows,M,"Canonical mapped score before server caps"),88,item.id);
    assert.equal(row(rows,M,"Post-client child score"),item.midrange,item.id);
    assert.equal(row(rows,M,"Actual aggregation denominator (weight units)"),
      item.lowEndApplicable?75:55,item.id);
    assert.equal(row(rows,S,"Exact pre-round weighted contribution (points)"),30.8,item.id);
    approx(row(rows,M,"Exact pre-round weighted contribution (points)"),
      item.midrange*25/(item.lowEndApplicable?75:55));
    assert.equal(row(rows,S,"Raw Gemini qualityTier/commentary access"),"NOT_CAPTURED",item.id);
    assert.equal(row(rows,M,"Raw Gemini qualityTier/commentary access"),"NOT_CAPTURED",item.id);
    assert.ok(!JSON.stringify(rows).includes("RAW PRIVATE"),"private synthetic fixture text must not export");
    assert.equal(c.subMetricsCall1.a2ScoringProvenance.spaceAndDensity.rawCommentary,
      originalRaw.spaceAndDensity.rawCommentary,"capture must not rewrite raw model text");
    assert.equal(c.subMetricsCall1.a2ScoringProvenance.midrangeSpacing.rawQualityTier,
      originalRaw.midrangeSpacing.rawQualityTier,"capture must not rewrite original tier");
    assert.deepEqual(c.scores,originalScores,"diagnostics do not recompute a production parent");
    assert.equal(c.mixQuality.score,88,"diagnostics do not recompute Mix Balance");
    assert.equal(item.production,[88,89,89,88][A2_FOUR_CASE_OBSERVATIONS.indexOf(item)],
      "actual frozen A2 parent is a separate observed value, not reconstructed from synthetic inputs");
  }
  const legacy={subMetricsCall1:{spaceAndDensity:{score:88},midrangeSpacing:{score:88}}};
  const snapshot=structuredClone(legacy);
  const rows=getA2ScoringProvenanceRows(legacy);
  assert.deepEqual(legacy,snapshot);
  assert.equal(row(rows,S,"Canonical mapped score before server caps"),"NOT_CAPTURED");
  assert.equal(row(rows,M,"Canonical mapped score before server caps"),"NOT_CAPTURED");
  assert.equal(row(rows,S,"Raw Gemini qualityTier/commentary access"),"NOT_CAPTURED");
});

test("Stage A guards the exact DSP correction path and does not invent a Space & Density midrange cap", () => {
  const client=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(client,/midrangeFlatness <= 0\.40/);
  assert.match(client,/midrangeFlatness < 0\.45/);
  assert.match(client,/midrangeCap = 72/);
  assert.match(client,/midrangeCap = 76/);
  assert.match(client,/const mudCap: number \| null = null/);
  assert.match(client,/if \(midrangeCap !== null && call1\?\.midrangeSpacing/);
  assert.match(client,/spaceDensityCeiling = Math\.min\(88, ceiling \+ 4\)/);
  assert.match(server,/spaceDensityCeiling = Math\.min\(88, finishCeiling \+ 4\)/);
  assert.match(server,/\[c1Ready\.spaceAndDensity\?\.score, 35\]/);
  assert.match(server,/\[c1Ready\.aestheticDesign\?\.score, 40\]/);
  assert.match(server,/\[c1Ready\.paletteCohesion\?\.score, 25\]/);
  for(const item of A2_FOUR_CASE_OBSERVATIONS) {
    const cap=item.flatness<=.40?72:item.flatness<.45?76:null;
    assert.equal(cap,item.midrangeCap,item.id);
    assert.equal(Math.min(88,cap??88),item.midrange,item.id);
    assert.equal(item.space,88,item.id);
  }
  for(const [flatness,expected] of [[.399,72],[.40,72],[.401,76],[.449,76],[.45,null],[.571,null]]) {
    assert.equal(flatness<=.40?72:flatness<.45?76:null,expected,String(flatness));
  }
  // A spectrum-only deviation is not proof of unintended crowding, so do not
  // silently create a new automatic Space & Density penalty in the test.
});

test("Stage B resolves the two Call 1 tier-only rubric ambiguities while retaining genre and cap safeguards", () => {
  const server=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
  const start=server.indexOf("const SUBMETRIC_SYSTEM_PROMPT =");
  const end=server.indexOf("async function performSubMetricsCall1(",start);
  assert.ok(start>=0 && end>start);
  const prompt=server.slice(start,end);
  const space=prompt.split("RUBRIC ANCHOR FOR SPACE & DENSITY:")[1]
    ?.split("RUBRIC ANCHOR FOR PALETTE COHESION:")[0];
  const mid=prompt.split("RUBRIC ANCHOR FOR MIDRANGE SPACING:")[1]
    ?.split("RUBRIC ANCHOR FOR LOW-END DIVISION:")[0];
  assert.ok(space && mid,"both exact Call 1 rubric sections must be found");
  assert.match(prompt,/you are NOT authorized to choose an exact numeric score/);
  assert.match(prompt,/- PROFESSIONAL_HIGH: notably strong and well-controlled professional execution/);
  assert.match(prompt,/- PROFESSIONAL: clean, competent, release-ready execution/);
  assert.match(prompt,/THIS is the correct default for problem-free commercial work/);
  assert.doesNotMatch(space,/before assigning a numeric score for spaceAndDensity/);
  assert.match(space,/before selecting a qualityTier for spaceAndDensity/);
  for(const [label,section] of [["Space",space],["Midrange",mid]]) {
    assert.match(section,/QUALITY-TIER EVIDENCE GATE \(return qualityTier, never a numeric score\)/,label);
    for(const [tier,score] of [["PROFESSIONAL",85],["PROFESSIONAL_HIGH",88],["ABOVE_AVERAGE",90],
      ["LIMITED",79],["MATERIAL_ISSUE",71],["SEVERE",58]]) {
      assert.match(section,new RegExp("- "+tier+" \\("+score+"\\):"),label+" "+tier);
    }
    assert.match(section,/DEFAULT/,label);
    assert.match(section,/not|NOT/,label);
  }
  assert.match(space,/Intentional arrangement density/);
  assert.match(mid,/Protect genre-appropriate shoegaze walls/);
  assert.match(prompt,/SOURCE-CLAIM GATE/);
  assert.match(mid,/Never invent competing instruments/);
  assert.match(server,/const PRODUCTION_QUALITY_TIER_SCORES/);
  // Contract assertions do not prove Gemini's future behavior or acoustic truth.
});


test("Stage B six-band contract uses original normalized magnitudes, not relative power percentages", () => {
  const dsp=readFileSync(new URL("../src/lib/liveAudioAnalyzer.ts",import.meta.url),"utf8");
  const server=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  const bandStart=dsp.indexOf("const bandRanges = [");
  const bandEnd=dsp.indexOf("const finishBandTotal =",bandStart);
  assert.ok(bandStart>=0&&bandEnd>bandStart);
  const calc=dsp.slice(bandStart,bandEnd);
  for(const [min,max] of [[20,64],[64,250],[250,1000],[1000,4000],[4000,8000],[8000,20000]])
    assert.ok(calc.includes("{ min: "+min+", max: "+max+" }"),"original band range "+min+"-"+max);
  assert.match(calc,/const bandDbFloor = -22/);
  assert.match(calc,/const bandDbCeiling = 45/);
  assert.match(calc,/let db = 20 \* Math\.log10\(avgMag \|\| 0\.0001\)/);
  assert.match(calc,/bandEnergies\[b\] = Math\.max\(0, Math\.min\(100, Math\.round\(score\)\)\)/);
  assert.match(calc,/const finishBandRanges = \[/);
  assert.match(calc,/const finishBandPowerSums = new Float64Array\(6\)/);
  assert.match(app,/formData\.append\("lowMidsBandEnergy", String\(liveMetrics\?\.calculatedLowMidsBandEnergy \?\? ""\)\)/);
  assert.match(server,/const bandEnergySummary = measuredBandEnergies/);
  const summary=server.split("const bandEnergySummary = measuredBandEnergies")[1]
    ?.split("const mudEvidenceSummary =",1)[0];
  assert.ok(summary);
  for(const field of ["subBass","bass","lowMids","coreMids","presence","air"])
    assert.ok(summary.includes("measuredBandEnergies."+field),field);
  assert.doesNotMatch(summary,/\?\? 'N\/A'\}%/,"normalized levels must not be marked %");
  assert.match(server,/SIX INDEPENDENT NORMALIZED BAND-LEVEL INDICES/);
  assert.match(server,/NOT relative-power shares/);
  assert.match(server,/DIFFERENT frequency boundaries/);
  assert.doesNotMatch(server,/relative energy per band - Sub-Bass/);
  // Level changes alter evidence prose, never the raw measurement fields or their serialization.
});

test("Stage B Excel six-band levels display raw normalized values, not invented percentages", () => {
  const report=readFileSync(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  assert.match(report,/FREQUENCY BALANCE \(6-BAND NORMALIZED LEVELS, NOT %\)/);
  assert.match(report,/\["Band", "Frequency Range", "Level \(0-100\)", "Vs Genre Target"\]/);
  assert.match(report,/wsEngineering\.getCell\(engRow, 4\)\.value = String\(row\.val\);/);
  assert.doesNotMatch(report,/wsEngineering\.getCell\(engRow, 4\)\.value = \x60\$\{row\.val\}%\x60;/);
  for(const name of ["calculatedSubBassBandEnergy","calculatedBassBandEnergy","calculatedLowMidsBandEnergy",
    "calculatedCoreMidsBandEnergy","calculatedPresenceBandEnergy","calculatedAirBandEnergy"])
    assert.ok(report.includes(name),"frozen sensor input "+name);
});

test("Stage B neither changes the DSP thresholds nor turns mud diagnostic-only into a score", () => {
  const server=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
  const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
  assert.match(server,/REFERENCE: 96/);
  assert.match(server,/PROFESSIONAL_HIGH: 88/);
  assert.match(server,/PROFESSIONAL: 85/);
  assert.match(server,/metric\.score = canonicalScore/);
  assert.match(app,/midrangeFlatness <= 0\.40/);
  assert.match(app,/midrangeFlatness < 0\.45/);
  assert.match(app,/const mudCap: number \| null = null/);
  assert.match(server,/captureA2ServerMixInputs\(parsedCritique\)/);
  assert.match(server,/captureA2ServerProductionInputs\(parsedCritique\)/);
  assert.match(server,/withholdA2RawEvidence\(parsedCritique\)/);
});
