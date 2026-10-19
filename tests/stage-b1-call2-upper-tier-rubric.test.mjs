import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const server=readFileSync(new URL("../server.ts",import.meta.url),"utf8");
const call2=server.match(/const SUBMETRIC_SYSTEM_PROMPT_2 = `([\s\S]*?)`;/)?.[1];
assert.ok(call2,"Call 2 prompt required");
const call2Intro=call2.split("- artisticAlignment (part of artisticAnalysis):")[0];
const art=call2.split("- artisticAlignment (part of artisticAnalysis):")[1]?.split("- atmosphericDepth (part of artisticAnalysis):")[0];
assert.ok(art,"Artistic Alignment block must remain intact");
test("three Call 2 upper tiers require distinct, musically grounded evidence",()=>{
  for(const tier of ["REFERENCE","EXCEPTIONAL","ABOVE_AVERAGE"]){
    assert.equal(call2Intro.split("\n").filter(s=>s.startsWith("- "+tier+":")).length,1,tier+" descriptor must be unique");
  }
  assert.match(call2Intro,/REFERENCE: rare benchmark-level execution/);
  assert.match(call2Intro,/essentially all meaningful, applicable opportunities/);
  assert.match(call2Intro,/more consistently integrated and compelling than EXCEPTIONAL/);
  assert.match(call2Intro,/EXCEPTIONAL: exceptionally accomplished execution beyond one isolated above-average moment/);
  assert.match(call2Intro,/distinct strengths reinforce each other or the same musical quality stays compelling/);
  assert.match(call2Intro,/ABOVE_AVERAGE: at least one concrete, audibly identifiable strength/);
  assert.match(call2Intro,/A localized standout can qualify/);
  assert.match(call2Intro,/Do not require added complexity, instrumentation, or sections/);
  assert.match(call2Intro,/Do not vary tiers merely to create numerical spread/);
});
test("Artistic Alignment keeps the independent three-observation gate at all three tiers",()=>{
  for(const tier of ["REFERENCE","EXCEPTIONAL","ABOVE_AVERAGE"]){
    const row=art.split("\n").find(s=>s.trim().startsWith("- "+tier+":"));
    assert.ok(row,"missing "+tier);
    assert.match(row,/at least THREE independent/);
    assert.match(row,/applicable/);
  }
  assert.match(art,/REFERENCE:[^\n]+sustained integration is a benchmark beyond EXCEPTIONAL/);
  assert.match(art,/EXCEPTIONAL:[^\n]+reinforce one another into an unusually compelling whole/);
  assert.match(art,/ABOVE_AVERAGE:[^\n]+need not combine into the sustained, unusually integrated artistic world/);
  assert.match(art,/PROFESSIONAL \(85\), not LIMITED \(79\)/);
  assert.match(art,/PROFESSIONAL: ordinary but competently coherent identity/);
  assert.match(art,/LIMITED: a real, nameable artistic weakness/);
  assert.match(art,/DISTINCTIVENESS VS COHERENCE/);
  assert.match(art,/roughness, lack of mastering, sparse instrumentation or unconventional form/);
  assert.match(art,/Genre compatibility removes a mismatch penalty but never earns a high tier/);
});
test("tier map, 36 shared metric fields and all production model sites unchanged",()=>{
  const map=server.match(/const PRODUCTION_QUALITY_TIER_SCORES:[\s\S]*?= \{([\s\S]*?)\};/)?.[1];
  assert.ok(map);
  assert.deepEqual([...map.matchAll(/^\s*(\w+):\s*(\d+),?\s*$/gm)].map(m=>[m[1],Number(m[2])]),[["REFERENCE",96],["EXCEPTIONAL",93],["ABOVE_AVERAGE",90],["PROFESSIONAL_HIGH",88],["PROFESSIONAL",85],["LIMITED",79],["MATERIAL_ISSUE",71],["SEVERE",58]]);
  assert.equal([...server.matchAll(/\.\.\.tierMetricProperties/g)].length,36);
  assert.equal([...server.matchAll(/model:\s*"gemini-2\.5-flash"/g)].length,7);
  assert.doesNotMatch(map,/DEFINITIVE/);
  assert.match(server,/\[c2Ready\.artisticAnalysis\.artisticAlignment\?\.score, 30\]/);
  assert.match(server,/\[c2Ready\.acousticTension\.climaxTrajectory\?\.score, 50\]/);
  assert.match(server,/\[c1Ready\.aestheticDesign\?\.score, 40\]/);
  assert.equal([...server.matchAll(/markMudPreventionDiagnosticOnly\(parsedCritique\)/g)].length,1);
  assert.equal([...server.matchAll(/computeMixBalanceScore\(c1Ready, true\)/g)].length,1);
});
test("blind audition, source-honesty, calibration, genre-fairness and anti-clustering safeguards survive",()=>{
  const cal=server.match(/const SCORE_CALIBRATION = `([\s\S]*?)`;/)?.[1];
  assert.ok(cal);
  assert.match(call2,/STRICT ANONYMOUS AUDITION/);
  assert.match(call2,/DO NOT CONFIDENTLY ASSERT UNVERIFIABLE PRODUCTION TECHNIQUES/);
  assert.match(call2,/Do not vary tiers merely to create numerical spread/);
  assert.match(call2,/VOICE - MANDATORY/);
  assert.match(call2,/a deliberately simple, repetitive hook is not automatically a flaw/i);
  assert.match(cal,/SOURCE-LEVEL CLAIMS REQUIRE SOURCE-LEVEL EVIDENCE/);
  assert.match(cal,/GENRE COMPATIBILITY vs DEMONSTRATED CRAFT/);
  assert.match(cal,/ENTERING 89\+ REQUIRES POSITIVE EVIDENCE/);
});
