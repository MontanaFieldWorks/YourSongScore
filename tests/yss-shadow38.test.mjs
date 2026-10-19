import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {loadPinned,runSong,Gate,options,BASE,MODEL,MAX_REQUESTS,MAX_USD,CONFIRM} from "../scripts/yss-shadow38.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
// actions/checkout is shallow by default; fetch the exact public baseline from GitHub
// when missing. This makes NO Google or Gemini calls and does not alter production.
try {execFileSync("git",["show",BASE+":server.ts"],{cwd:root,stdio:"ignore"});}
catch {execFileSync("git",["fetch","--no-tags","--depth=1","origin",BASE],{cwd:root,stdio:"ignore"});}

test("paid mode requires extra explicit confirmation",()=>{
 assert.equal(options([]).paid,false);
 assert.throws(()=>options(["--execute"]),/authorization/);
 assert.throws(()=>options(["--confirm",CONFIRM]),/dry-run/);
 assert.equal(options(["--execute","--confirm",CONFIRM]).paid,true);
});
test("all prompts and schemas are extracted from pinned main without running server",()=>{
 const h=loadPinned(root,()=>{throw Error("should not call");});
 assert.ok(h.user.includes("BLIND AUDITION MODE"));
 assert.ok(h.p.SYSTEM_PROMPT.includes("BLIND AUDIO-ONLY EVIDENCE"));
 assert.ok(h.p.SUBMETRIC_SYSTEM_PROMPT_2.includes("ARTISTIC ALIGNMENT QUALITY-TIER RUBRIC"));
 assert.equal(h.p.PRODUCTION_QUALITY_TIER_SCORES.REFERENCE,96);
 assert.equal(BASE.length,40);
 assert.equal(MODEL,"gemini-3.8-flash");
});
test("two dry-run songs exercise genre, 3 score passes and deterministic recomputation",async()=>{
 const gate=new Gate({dry:true});
 const h=loadPinned(root,x=>gate.request(x));
 const c=await runSong(h,gate,"chandelier",Buffer.from("dry-run sample"));
 const b=await runSong(h,gate,"braden",Buffer.from("dry-run sample"));
 assert.ok(c.critique.subMetricsCall2.artisticAnalysis);
 assert.ok(b.critique.subMetricsCall3.musicTheorySubs);
 assert.equal(c.critique.subMetricsCall2.artisticAnalysis.artisticAlignment.score,85);
 assert.equal(b.critique.subMetricsCall1.mudPrevention.score,null);
 assert.equal(b.critique.performance.vocalApplicable,false);
 assert.equal(gate.dry,true);
 assert.ok(gate.calls<=MAX_REQUESTS);
 assert.ok(gate.history.every(x=>x.model===MODEL));
});
test("one failed provider call counts as one, no retry",async()=>{
 let count=0;
 const gate=new Gate({dry:false,client:{models:{generateContent:async()=>{count++;throw Error("synthetic failure");}}}});
 await assert.rejects(gate.request({model:"gemini-2.5-flash",contents:{parts:[]},
   config:{responseSchema:{type:"OBJECT"},responseMimeType:"application/json"}}),/synthetic failure/);
 assert.equal(gate.calls,1);assert.equal(count,1);
});
test("hard stops: request cap, spending gate, schema guard, model guard",async()=>{
 const gate=new Gate({dry:true});
 await assert.rejects(gate.request({model:"gemini-flash-latest",config:{}}),/Pinned source model/);
 await assert.rejects(gate.request({model:"gemini-2.5-flash",config:{}}),/structured-output/);
 assert.equal(gate.calls,0);
 gate.calls=MAX_REQUESTS;
 await assert.rejects(gate.request({model:"gemini-2.5-flash",config:{}}),/maximum/);
 gate.calls=0;gate.estimatedUsd=MAX_USD;
 await assert.rejects(gate.request({model:"gemini-2.5-flash",config:{}}),/spend gate/);
});
