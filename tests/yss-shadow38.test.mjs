import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {loadPinned,runSong,Gate,options,validateStructured,claimPaidLedger,reserveSecondSongBudget,validatePaidOutput,main,sha256,EXPECTED_AUDIO,BASE,MODEL,MAX_REQUESTS,MAX_USD,CONFIRM} from "../scripts/yss-shadow38.mjs";
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

const envelope=()=>({
 model:"gemini-2.5-flash",
 contents:{parts:[{text:"synthetic fixture"}]},
 config:{responseMimeType:"application/json",temperature:0,
  responseSchema:{type:"OBJECT",properties:{ok:{type:"BOOLEAN"}},required:["ok"]}},
});
const usage={promptTokenCount:1000,candidatesTokenCount:2000,
 thoughtsTokenCount:3000,totalTokenCount:6000};

test("returned structured JSON is checked, including required and typed properties",()=>{
 const schema=envelope().config.responseSchema;
 assert.doesNotThrow(()=>validateStructured(schema,{ok:true}));
 assert.throws(()=>validateStructured(schema,{}),/required property missing/);
 assert.throws(()=>validateStructured(schema,{ok:"yes"}),/expected boolean/);
 assert.throws(()=>validateStructured({type:"ARRAY",items:{type:"INTEGER"}},[1,2.2]),/expected integer/);
 assert.throws(()=>validateStructured({type:"STRING",enum:["A","B"]},"C"),/declared enum/);
});

test("real-provider adapter pins Gemini 3.8 Medium without old sampling and counts thinking tokens",async()=>{
 let sent;let calls=0;
 const gate=new Gate({dry:false,client:{models:{generateContent:async p=>{
   sent=p;calls++;return {text:'{"ok":true}',usageMetadata:usage};
 }}}});
 await gate.request(envelope());
 assert.equal(calls,1);
 assert.equal(sent.model,MODEL);
 assert.equal(sent.config.thinkingConfig.thinkingLevel.toLowerCase(),"medium");
 assert.equal(sent.config.temperature,undefined);
 assert.equal(gate.history[0].inputTokens,1000);
 assert.equal(gate.history[0].thinkingTokens,3000);
 assert.equal(gate.history[0].totalTokens,6000);
 assert.ok(Math.abs(gate.estimatedUsd-(1000*0.75+5000*3.75)/1e6)<1e-12);
});

test("malformed or schema-invalid paid provider response fails closed after one charged attempt",async()=>{
 for(const bad of ["{", "{}", '{"ok":"not-a-boolean"}']) {
   let calls=0;
   const gate=new Gate({dry:false,client:{models:{generateContent:async()=>{
     calls++;return {text:bad,usageMetadata:usage};
   }}}});
   await assert.rejects(gate.request(envelope()),/Invalid structured provider response/);
   assert.equal(calls,1);assert.equal(gate.calls,1);
   assert.equal(gate.history[0].status,"SCHEMA_ERROR");
   assert.equal(gate.stopped,true);
   await assert.rejects(gate.request(envelope()),/Prior provider failure/);
   assert.equal(calls,1);
 }
});

test("missing token accounting and unforeseen cost overrun stop without retry",async()=>{
 const missing=new Gate({dry:false,client:{models:{generateContent:async()=>({
   text:'{"ok":true}',usageMetadata:{promptTokenCount:10,candidatesTokenCount:10}
 })}}});
 await assert.rejects(missing.request(envelope()),/Missing usage data/);
 assert.equal(missing.history[0].status,"MISSING_USAGE");
 assert.equal(missing.stopped,true);
 const over=new Gate({dry:false,client:{models:{generateContent:async()=>({
   text:'{"ok":true}',usageMetadata:{promptTokenCount:10000000,candidatesTokenCount:1000,
   thoughtsTokenCount:1000,totalTokenCount:10002000}
 })}}});
 await assert.rejects(over.request(envelope()),/Estimated charge cap crossed/);
 assert.equal(over.history[0].status,"OVER_BUDGET");
 assert.equal(over.calls,1);assert.equal(over.stopped,true);
});

test("exactly eleven possible requests; twelfth denied before contacting provider",async()=>{
 const gate=new Gate({dry:true});
 const schema=envelope();
 for(let i=0;i<MAX_REQUESTS;i++)await gate.request(schema);
 assert.equal(gate.calls,11);
 await assert.rejects(gate.request(schema),/11-request maximum/);
 assert.equal(gate.calls,11);
});

test("exclusive paid-run ledger refuses replay and concurrency",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"yss-shadow38-ledger-"));
 const file=path.join(dir,"ledger.jsonl");
 try {
   claimPaidLedger(file);
   assert.ok(fs.existsSync(file));
   assert.throws(()=>claimPaidLedger(file),{code:"EEXIST"});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("second song is refused before its first paid request when six slots cannot be reserved",()=>{
 const g=new Gate({dry:true});
 g.calls=5;
 assert.doesNotThrow(()=>reserveSecondSongBudget(g));
 g.calls=6;
 assert.throws(()=>reserveSecondSongBudget(g),/Second song not started/);
 assert.equal(g.calls,6);
 g.calls=5;g.estimatedUsd=2.01;
 assert.throws(()=>reserveSecondSongBudget(g),/cost reservation/);
 g.estimatedUsd=0;g.stopped=true;
 assert.throws(()=>reserveSecondSongBudget(g),/Prior provider failure/);
});

test("paid execution requires explicit persistent output outside temp and git",()=>{
 const opts={paid:true,root,out:path.join(os.homedir(),"yss-shadow38-test-persistent"),explicitOut:true};
 assert.doesNotThrow(()=>validatePaidOutput(opts));
 assert.throws(()=>validatePaidOutput({...opts,explicitOut:false}),/explicit absolute/);
 assert.throws(()=>validatePaidOutput({...opts,out:"relative/path"}),/explicit absolute/);
 assert.throws(()=>validatePaidOutput({...opts,out:path.join(os.tmpdir(),"paid-ledger")}),/temporary storage/);
 assert.throws(()=>validatePaidOutput({...opts,out:path.join(root,"paid-ledger")}),/git checkout/);
 assert.doesNotThrow(()=>validatePaidOutput({...opts,paid:false,out:path.join(os.tmpdir(),"dry-run")}));
});

test("complete zero-API dry run produces two song files and an honest 11-call summary",async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"yss-shadow38-end-to-end-"));
 const origA=EXPECTED_AUDIO.chandelier,origB=EXPECTED_AUDIO.braden;
 try {
  const a=Buffer.from("synthetic Chandelier dry fixture");
  const b=Buffer.from("synthetic Braden dry fixture");
  const aPath=path.join(dir,"a.mp3"),bPath=path.join(dir,"b.mp3");
  fs.writeFileSync(aPath,a);fs.writeFileSync(bPath,b);
  EXPECTED_AUDIO.chandelier=sha256(a);EXPECTED_AUDIO.braden=sha256(b);
  const out=path.join(dir,"dry");
  const s=await main(["--repo",root,"--chandelier",aPath,"--braden",bPath,"--out",out]);
  assert.equal(s.status,"COMPLETED");
  assert.equal(s.mode,"DRY_RUN_NO_API_CALLS");
  assert.equal(s.requests,11);
  assert.equal(s.model,MODEL);
  assert.equal(s.sourceModel,"gemini-2.5-flash");
  assert.equal(s.shadowTemperature,"OMITTED_PROVIDER_DEFAULT");
  assert.equal(s.thinkingLevel,"MEDIUM");
  assert.equal(s.browserDspIncluded,false);
  assert.equal(s.history.length,11);
  assert.ok(fs.existsSync(path.join(out,"chandelier.json")));
  assert.ok(fs.existsSync(path.join(out,"braden.json")));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,"summary.json"),"utf8")).requests,11);
 }finally{
  EXPECTED_AUDIO.chandelier=origA;EXPECTED_AUDIO.braden=origB;
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
