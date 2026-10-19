import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
const calibration = server.match(/const SCORE_CALIBRATION = `([\s\S]*?)`;/)?.[1];
const call2 = server.match(/const SUBMETRIC_SYSTEM_PROMPT_2 = `([\s\S]*?)`;/)?.[1];
assert.ok(calibration, "SCORE_CALIBRATION must be available");
assert.ok(call2, "Call 2 tier prompt must be available");

test("removed impossible numeric anti-clustering mandate without discarding evidence-grounded tier selection", () => {
  assert.doesNotMatch(calibration, /ANTI-CLUSTERING - MANDATORY/);
  assert.doesNotMatch(calibration, /values ending in 1, 3, 6 and 7/);
  assert.match(calibration, /ENTERING 89\+ REQUIRES POSITIVE EVIDENCE/);
  assert.match(calibration, /SOURCE-LEVEL CLAIMS REQUIRE SOURCE-LEVEL EVIDENCE/);
  assert.match(calibration, /GENRE COMPATIBILITY vs DEMONSTRATED CRAFT/);
  assert.match(call2, /Do not vary tiers merely to create numerical spread/);
});

test("Artistic Alignment uses existing professional tier for ordinary artistic coherence and limited only for weakness", () => {
  const start = call2.indexOf("- artisticAlignment (part of artisticAnalysis):");
  const end = call2.indexOf("- atmosphericDepth (part of artisticAnalysis):",start);
  assert.ok(start >= 0 && end > start, "Artistic Alignment block must have explicit boundaries");
  const rubric = call2.slice(start,end);
  assert.match(rubric, /PROFESSIONAL \(85\)/);
  assert.match(rubric, /LIMITED \(79\)/);
  assert.match(rubric, /PROFESSIONAL: ordinary but competently coherent identity/);
  assert.match(rubric, /LIMITED: a real, nameable artistic weakness/);
  assert.match(rubric, /at least THREE independent/);
  assert.match(rubric, /DISTINCTIVENESS VS COHERENCE/);
  assert.match(rubric, /roughness, lack of mastering, sparse instrumentation or unconventional form/);
  assert.match(rubric, /Genre compatibility removes a mismatch penalty but never earns a high tier/);
  assert.doesNotMatch(rubric, /76-82|neutral starting point.*76-80|score 82 or below|SCORE BANDS:/i);
});

test("quality-tier mapping stays identical and no definitive tier is introduced", () => {
  const block = server.match(/const PRODUCTION_QUALITY_TIER_SCORES:[\s\S]*?= \{([\s\S]*?)\};/)?.[1];
  assert.ok(block, "Tier mapping must exist");
  const rows = [...block.matchAll(/^\s*(\w+):\s*(\d+),?\s*$/gm)].map(m => [m[1],Number(m[2])]);
  assert.deepEqual(rows, [["REFERENCE",96],["EXCEPTIONAL",93],["ABOVE_AVERAGE",90],["PROFESSIONAL_HIGH",88],["PROFESSIONAL",85],["LIMITED",79],["MATERIAL_ISSUE",71],["SEVERE",58]]);
  assert.doesNotMatch(block,/DEFINITIVE/);
});

test("tier schema fields and score assignment methods remain present for all 36 children", () => {
  const count = [...server.matchAll(/\.\.\.tierMetricProperties/g)].length;
  assert.equal(count, 36);
  for(const section of ["applyDeterministicProductionTierScores","applyDeterministicHeadlineTierScoresCall2","applyDeterministicHeadlineTierScoresCall3","function reconcileParentScores"])assert.ok(server.includes(section),section);
  assert.match(server,/const score\s*=\s*PRODUCTION_QUALITY_TIER_SCORES|const canonicalScore = PRODUCTION_QUALITY_TIER_SCORES/);
});

test("Artistic Alignment remains 30% of its parent; Climax Trajectory and Mix Balance retain prior weights", () => {
  assert.match(server,/\[c2Ready\.artisticAnalysis\.artisticAlignment\?\.score, 30\]/);
  assert.match(server,/\[c2Ready\.acousticTension\.climaxTrajectory\?\.score, 50\]/);
  assert.match(server,/computeMixBalanceScore\(c1Ready, true\)/);
  assert.match(server,/markMudPreventionDiagnosticOnly\(parsedCritique\)/);
  assert.match(server,/model: "gemini-2\.5-flash"/);
});
