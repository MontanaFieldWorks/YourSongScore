import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {conservativeTotalCost,StagingGeminiGate,STAGING_AUDIO_SHA256,STAGING_MODEL,STAGING_PRIOR_ATTEMPTS,STAGING_LIFETIME_CAP,STAGING_NEW_CAP,STAGING_PRIOR_RESERVE,STAGING_NEW_ESTIMATED_CAP} from "../src/server/stagingGeminiGate.ts";

test("source pins exact model and original Chandelier SHA",()=>{
  assert.equal(STAGING_MODEL,"gemini-3.8-flash");
  assert.equal(STAGING_AUDIO_SHA256,"d88420262baf2bf9e18349a38c928b1cede5b7ab6c87635004be3e61c964a3f6");
});
test("carries the old attempt and estimated reserve forward",()=>{
  assert.equal(STAGING_PRIOR_ATTEMPTS,1);
  assert.equal(STAGING_LIFETIME_CAP,11);
  assert.equal(STAGING_NEW_CAP,6);
  assert.equal(STAGING_PRIOR_RESERVE,1.25);
  assert.equal(STAGING_NEW_ESTIMATED_CAP,3.75);
});
test("absence of optional thinking tokens does not count as free",()=>{
 const priced=conservativeTotalCost({promptTokenCount:1000,candidatesTokenCount:2000,totalTokenCount:3500});
 assert.equal(priced.unallocatedTokens,500);
 assert.equal(priced.estimatedUsd,3500*3.75/1e6);
});
test("total with zero missing categorical counts is still priced conservatively",()=>{
 const priced=conservativeTotalCost({totalTokenCount:4000});
 assert.equal(priced.unallocatedTokens,4000);
 assert.equal(priced.estimatedUsd,4000*3.75/1e6);
});
test("invalid or missing usage fails closed",()=>{
 for(const u of [null,{}, {totalTokenCount:0},{totalTokenCount:NaN},{totalTokenCount:4,promptTokenCount:5},{totalTokenCount:5,thoughtsTokenCount:-1}])
 assert.throws(()=>conservativeTotalCost(u));
});
test("staging stays unarmed without secrets and a durable datastore",async()=>{
 const gate=new StagingGeminiGate();
 if(!process.env.YSS_STAGING_DATABASE_URL) {
   assert.equal(gate.isConfigured(),false);
   await assert.rejects(()=>gate.begin(Buffer.from("not chandelier")));
 }
});
test("full YSS upload route is gated and alternative POST analysis is blocked",()=>{
 const src=fs.readFileSync(new URL("../server.ts",import.meta.url),"utf8");
 assert.match(src,/const STAGING_MODE = true/);
 assert.match(src,/stagingGate\.begin\(req\.file\.buffer\)/);
 assert.match(src,/stagingGate\.complete\(\)/);
 assert.match(src,/stagingGate\.abort\(\)/);
 assert.match(src,/stagingGate\.generate\(ai, params\)/);
 assert.match(src,/STAGING_ONLY_CHANDELIER_FILE_UPLOAD/);
 assert.match(src,/STAGING_MODE \|\| isGeminiPrepayExhausted\(subErr\)/);
});
test("the gate logs attempted requests before contacting provider",()=>{
 const src=fs.readFileSync(new URL("../src/server/stagingGeminiGate.ts",import.meta.url),"utf8");
 assert.ok(src.indexOf("const slot=await this.claimAttempt()") < src.indexOf("client.models.generateContent"));
 assert.ok(src.indexOf("INSERT INTO yss38_stage_attempt") < src.indexOf("client.models.generateContent"));
 assert.match(src,/ON CONFLICT \(id\) DO NOTHING/);
 assert.match(src,/FOR UPDATE/);
});
test("production scoring and prompts remain unchanged by the staging change",()=>{
 const src=fs.readFileSync(new URL("../server.ts",import.meta.url),"utf8");
 assert.ok(src.includes('model: "gemini-2.5-flash"'));
 assert.ok(src.includes("const SCORE_CALIBRATION = "));
 assert.ok(src.includes("const SYSTEM_PROMPT = "));
});
