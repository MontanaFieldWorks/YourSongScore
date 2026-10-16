import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  computeMixBalanceScore,
  markMudPreventionDiagnosticOnly,
  isMudDiagnosticCritique,
  MUD_DIAGNOSTIC_SCORING_VERSION,
  MUD_DIAGNOSTIC_STATUS,
  getMixBalanceEffectiveWeight,
} from "../src/lib/mudPreventionDiagnostic.ts";

const fullMix = () => ({
  mudPrevention: { score: 68, qualityTier: "NEEDS_WORK", commentary: "raw low-mid observation" },
  midrangeSpacing: { score: 88 },
  lowEndDivision: { score: 88, applicable: true },
  sibilanceShaving: { score: 88, applicable: true },
  stereoWidth: { score: 88 },
});

test("only Mud Prevention becomes unscored while its source evidence survives", () => {
  const critique = { productionScoringVersion: MUD_DIAGNOSTIC_SCORING_VERSION, subMetricsCall1: fullMix() };
  const previous = structuredClone(critique.subMetricsCall1);
  assert.equal(computeMixBalanceScore(critique.subMetricsCall1, false), 83);
  markMudPreventionDiagnosticOnly(critique);
  assert.equal(isMudDiagnosticCritique(critique), true);
  assert.equal(critique.subMetricsCall1.mudPrevention.scoringStatus, MUD_DIAGNOSTIC_STATUS);
  assert.equal(critique.subMetricsCall1.mudPrevention.score, null);
  assert.equal(critique.subMetricsCall1.mudPrevention.qualityTier, previous.mudPrevention.qualityTier);
  assert.equal(critique.subMetricsCall1.mudPrevention.commentary, previous.mudPrevention.commentary);
  for (const metric of ["midrangeSpacing", "lowEndDivision", "sibilanceShaving", "stereoWidth"]) {
    assert.deepEqual(critique.subMetricsCall1[metric], previous[metric]);
  }
  assert.equal(computeMixBalanceScore(critique.subMetricsCall1, true), 88);
});

test("Low-End Division and Sibilance N/A exclusions are independently renormalized", () => {
  const call1 = fullMix();
  call1.midrangeSpacing.score = 76;
  call1.lowEndDivision.score = 0;
  call1.lowEndDivision.applicable = false;
  call1.sibilanceShaving.score = 92;
  call1.stereoWidth.score = 80;
  assert.equal(computeMixBalanceScore(call1, true), Math.round((76 * 25 + 92 * 15 + 80 * 15) / 55));
  assert.equal(getMixBalanceEffectiveWeight(call1, "midrangeSpacing"), 45.5);
  assert.equal(getMixBalanceEffectiveWeight(call1, "lowEndDivision"), null);
  call1.sibilanceShaving.applicable = false;
  assert.equal(computeMixBalanceScore(call1, true), Math.round((76 * 25 + 80 * 15) / 40));
  assert.equal(getMixBalanceEffectiveWeight(call1, "midrangeSpacing"), 62.5);
  assert.equal(call1.lowEndDivision.applicable, false);
  assert.equal(call1.sibilanceShaving.applicable, false);
});

test("diagnostic-only is distinct from N/A and cannot create a fake zero", () => {
  assert.equal(computeMixBalanceScore({ mudPrevention: { score: null } }, true), null);
  assert.equal(computeMixBalanceScore(null, true), null);
  assert.equal(computeMixBalanceScore({ ...fullMix(), midrangeSpacing: { score: 0 } }, true), 59);
});

test("historical scoring versions remain legacy and can move in either direction in counterfactuals", () => {
  const archive = { productionScoringVersion: "scoring-tier-v7", subMetricsCall1: fullMix(), mixQuality: { score: 83 } };
  assert.equal(isMudDiagnosticCritique(archive), false);
  assert.equal(computeMixBalanceScore(archive.subMetricsCall1, false), 83);
  assert.equal(archive.mixQuality.score, 83);
  archive.subMetricsCall1.mudPrevention.score = 98;
  assert.equal(computeMixBalanceScore(archive.subMetricsCall1, false), 91);
  assert.equal(computeMixBalanceScore(archive.subMetricsCall1, true), 88);
  assert.equal(archive.mixQuality.score, 83); // No stored report rewrite.
});

test("server and client share the same mix formula and v8 marker", async () => {
  const server = await readFile(new URL("../server.ts", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(server, /computeMixBalanceScore\(c1Ready, true\)/);
  assert.match(server, /markMudPreventionDiagnosticOnly\(parsedCritique\)/);
  assert.match(server, /productionScoringVersion = MUD_DIAGNOSTIC_SCORING_VERSION/g);
  assert.match(app, /computeMixBalanceScore\(call1, isMudDiagnosticCritique\(critique\)\)/);
  assert.match(app, /markMudPreventionDiagnosticOnly\(critique\)/);
});

test("unvalidated mud-flux scoring gates are removed without disabling independent caps", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const scoringRegion = app.slice(app.indexOf("let midrangeCap"), app.indexOf("const mixEvidenceSummary"));
  assert.doesNotMatch(scoringRegion, /mudFlux\s*[><=]/);
  assert.doesNotMatch(scoringRegion, /mudPrevention\.score\s*=/);
  assert.match(scoringRegion, /midrangeFlatness\s*<=\s*0\.40/);
  assert.match(scoringRegion, /midrangeFlatness\s*<\s*0\.45/);
  assert.match(scoringRegion, /bassBandEnergy\s*>\s*87/);
  assert.match(scoringRegion, /lowMidBandEnergy\s*>\s*72/);
  assert.match(scoringRegion, /if \(spectralCap !== null/);
});

test("Excel and UI mark only new Mud Prevention rows diagnostic-only", async () => {
  const display = await readFile(new URL("../src/components/CritiqueDisplay.tsx", import.meta.url), "utf8");
  assert.match(display, /m\.id === "mix" && idx === 0 && isMudDiagnosticCritique\(critique\)/);
  assert.match(display, /diagnosticMud \? "DIAGNOSTIC ONLY"/);
  assert.match(display, /diagnosticMud \? "—"/);
  assert.match(display, /applicable: !diagnosticMud && realSub\?\.applicable !== false/);
  assert.match(display, /wsSourceDiagnostics\.addRow\(\{ section: "Mud Prevention"/);
  assert.match(display, /betaMixWeightLabel\("lowEndDivision"\)/);
});
