import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getMudPreventionPublicCommentary } from "../src/lib/mudPreventionReporting.ts";
import { computeMixBalanceScore } from "../src/lib/mudPreventionDiagnostic.ts";

const fixture = () => ({
  productionScoringVersion: "scoring-tier-v8-mud-diagnostic",
  subMetricsCall1: {
    mudPrevention: {
      score: null, scoringStatus: "DIAGNOSTIC_ONLY", qualityTier: "PROFESSIONAL_HIGH",
      commentary: "Despite significant low-mid energy, the mix avoids genuine mud.",
    },
    midrangeSpacing: { score: 72, applicable: true },
    lowEndDivision: { score: 93, applicable: true },
    sibilanceShaving: { score: 88, applicable: true },
    stereoWidth: { score: 88, applicable: true },
  },
  mixBalanceEvidence: { lowMidEnergy: 71, coreMidEnergy: 46, mudFlux: 46.34 },
});

test("public Mud Prevention commentary uses measured evidence without claiming clarity or intent", () => {
  const report = fixture();
  const publicText = getMudPreventionPublicCommentary(report);
  assert.match(publicText, /DIAGNOSTIC ONLY/);
  assert.match(publicText, /71\.0 \/ 46\.0/);
  assert.match(publicText, /46\.34/);
  assert.match(publicText, /gain-dependent diagnostic/);
  assert.match(publicText, /do not establish audible masking/);
  assert.doesNotMatch(publicText, /avoids genuine mud|intentionally warm|PROFESSIONAL_HIGH/);
});

test("raw Gemini text is preserved unchanged and formatter has no score side effects", () => {
  const report = fixture();
  const before = structuredClone(report);
  const scoreBefore = computeMixBalanceScore(report.subMetricsCall1, true);
  getMudPreventionPublicCommentary(report);
  const scoreAfter = computeMixBalanceScore(report.subMetricsCall1, true);
  assert.deepEqual(report, before);
  assert.equal(report.subMetricsCall1.mudPrevention.commentary, before.subMetricsCall1.mudPrevention.commentary);
  assert.equal(scoreBefore, scoreAfter);
  assert.equal(scoreAfter, 84);
});

test("missing or invalid spectral evidence does not invent measurements or quality verdicts", () => {
  for (const report of [{}, { mixBalanceEvidence: { lowMidEnergy: NaN, coreMidEnergy: Infinity, mudFlux: null } }]) {
    const publicText = getMudPreventionPublicCommentary(report);
    assert.match(publicText, /DIAGNOSTIC ONLY/);
    assert.match(publicText, /No clean\/muddy conclusion/);
    assert.doesNotMatch(publicText, /NaN|Infinity|undefined|Measured low-mid\/core|Measured 150/);
  }
});

test("flux fallback uses captured live DSP only, not guessed values", () => {
  const publicText = getMudPreventionPublicCommentary({ liveMetrics: { calculatedMudFlux: 14.6 } });
  assert.match(publicText, /14\.60/);
  assert.doesNotMatch(publicText, /relative band indices/);
});

test("UI and public Excel use one safe formatter; raw commentary stays on labeled internal sheet", async () => {
  const display = await readFile("src/components/CritiqueDisplay.tsx", "utf8");
  assert.match(display, /import \{ getMudPreventionPublicCommentary \} from "\.\.\/lib\/mudPreventionReporting"/);
  assert.match(display, /const subText = diagnosticMud\s*\? getMudPreventionPublicCommentary\(critique\)/);
  assert.match(display, /\{diagnosticMud\s*\? getMudPreventionPublicCommentary\(critique\)/);
  assert.match(display, /Original Gemini commentary \(UNVERIFIED; internal diagnostics only\)/);
  assert.match(display, /UNVERIFIED listening interpretation retained for internal audit only/);
  assert.match(display, /\["Original Gemini commentary \(UNVERIFIED; internal diagnostics only\)", critique\?\.subMetricsCall1\?\.mudPrevention\?\.commentary \|\| "NOT_CAPTURED"\]/);
  assert.match(display, /if \(isMudDiagnosticCritique\(critique\)\) \{/);
  assert.match(display, /diagnosticMud \? "DIAGNOSTIC ONLY"/);
  assert.doesNotMatch(display, /Diagnostic evidence only; no score or automatic penalty\. \$\{realSub\?\.commentary/);
});

test("existing historical (non-diagnostic) reports still use original submetric presentation", async () => {
  const display = await readFile("src/components/CritiqueDisplay.tsx", "utf8");
  assert.match(display, /: realSub \? realSub\.commentary : getSubScoreExplanationText\(param\.name, subScore\)/);
  assert.match(display, /: \(fallbackWarning\) \+ \(realSub \? realSub\.commentary : getSubScoreExplanationText\(param\.name, subScore\)\)/);
});
