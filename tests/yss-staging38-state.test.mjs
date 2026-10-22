import test from "node:test";
import assert from "node:assert/strict";
import { StagingGeminiGate, StagingStop } from "../src/server/stagingGeminiGate.ts";
const original = { m: process.env.YSS_GEMINI_MODEL, k: process.env.GEMINI_API_KEY, p: process.env.YSS_STAGING_ACCESS_PASSWORD };
process.env.YSS_GEMINI_MODEL="gemini-3.8-flash";
process.env.GEMINI_API_KEY="FAKE_NO_NETWORK_KEY";
process.env.YSS_STAGING_ACCESS_PASSWORD="fake_password_longer_than_16";

class FakePool {
  row = {status:"RUNNING",attempts:0,estimated_usd:0,prior_attempts:1,prior_reserved_usd:1.25};
  attempts=[];
  commits=0;
  async query(sql,args=[]) {
    if(sql.startsWith("CREATE TABLE")||sql==="BEGIN"||sql==="ROLLBACK")return {rows:[],rowCount:0};
    if(sql==="COMMIT"){this.commits++;return {rows:[]};}
    if(sql.startsWith("INSERT INTO yss38_stage_run")) return {rows:[],rowCount:1};
    if(sql.startsWith("SELECT * FROM yss38_stage_run"))return {rows:[{...this.row}],rowCount:1};
    if(sql.startsWith("INSERT INTO yss38_stage_attempt")) {
      this.attempts.push({slot:args[1],status:"ATTEMPTED"});
      return {rows:[],rowCount:1};
    }
    if(sql.startsWith("UPDATE yss38_stage_run SET attempts=")) {this.row.attempts=args[1];return {rows:[],rowCount:1};}
    if(sql.startsWith("UPDATE yss38_stage_attempt SET status=")) {
      const r=this.attempts.find(a=>a.slot===args[1]&&a.status==="ATTEMPTED");
      if(!r)throw Error("Fake DB cannot find ATTEMPTED row");
      r.status=args[2];r.total=args[3];r.estimated=args[4];
      return {rows:[],rowCount:1};
    }
    if(sql.startsWith("UPDATE yss38_stage_run SET estimated_usd=")) {
      this.row.estimated_usd=args[1];this.row.status=args[2];return {rows:[],rowCount:1};
    }
    if(sql.startsWith("UPDATE yss38_stage_run SET status='STOPPED'")){
      this.row.status="STOPPED";return {rows:[],rowCount:1};
    }
    if(sql.startsWith("UPDATE yss38_stage_run SET status='COMPLETED'")) {
      if(this.row.status!=="RUNNING")return {rows:[],rowCount:0};
      this.row.status="COMPLETED";return {rows:[{id:"chandelier-20261022-once"}],rowCount:1};
    }
    if(sql.startsWith("SELECT status,attempts,estimated_usd"))return {rows:[{...this.row}]};
    throw Error("Unmocked SQL: "+sql.slice(0,100));
  }
  async connect() {return {query:(...a)=>this.query(...a),release(){}};}
}
function harness() {
 const gate=new StagingGeminiGate();
 const db=new FakePool();
 gate.pool=db; gate.active=true;
 const params={model:"gemini-2.5-flash",contents:[{parts:[{text:"mock only"}]}],config:{responseSchema:{type:"OBJECT"},temperature:0.1,seed:1}};
 return {gate,db,params};
}
function fakeClient(db, usage={totalTokenCount:300, promptTokenCount:120}) {
 return {models:{generateContent:async options=>{
   assert.equal(options.model,"gemini-3.8-flash");
   assert.equal(options.config.thinkingConfig.thinkingLevel,"MEDIUM");
   assert.equal(options.config.maxOutputTokens,32768);
   assert.equal(options.config.seed,undefined);
   assert.equal(options.config.temperature,undefined);
   assert.equal(db.attempts.at(-1).status,"ATTEMPTED");
   assert.ok(db.commits>=1, "attempt ledger COMMITTED before provider");
   return {usageMetadata:usage,text:"{}"};
 }}};
}
test("commit ATTEMPTED before fake provider and reconcile usage conservatively",async()=>{
 const {gate,db,params}=harness();
 const r=await gate.generate(fakeClient(db),params);
 assert.equal(r.text,"{}");
 assert.equal(db.attempts.length,1);
 assert.equal(db.attempts[0].status,"OK");
 assert.equal(db.row.attempts,1);
 assert.equal(db.row.status,"RUNNING");
 assert.ok(db.row.estimated_usd>0);
});
test("no seventh new attempt, historical first attempt preserved",async()=>{
 const {gate,db,params}=harness();
 for(let i=0;i<6;i++)await gate.generate(fakeClient(db),params);
 await assert.rejects(()=>gate.generate(fakeClient(db),params),/LIFETIME_ATTEMPT_CAP/);
 assert.equal(db.attempts.length,6);
 assert.equal(db.row.attempts+1,7);
});
test("provider rejection halts without retry and status stays STOPPED",async()=>{
 const {gate,db,params}=harness();
 let calls=0;
 const client={models:{generateContent:async()=>{calls++;throw Error("PRIVATE_PROVIDER_ERROR");}}};
 await assert.rejects(()=>gate.generate(client,params),/PROVIDER_ERROR_NO_RETRY/);
 assert.equal(calls,1);
 assert.equal(db.attempts[0].status,"PROVIDER_ERROR");
 assert.equal(db.row.status,"STOPPED");
 await assert.rejects(()=>gate.generate(client,params),/RUN_NOT_ACTIVE/);
 assert.equal(calls,1);
 const next=new StagingGeminiGate();next.pool=db;
 await assert.rejects(()=>next.begin(Buffer.from("not correct audio")),/ONLY_PINNED_CHANDELIER_ALLOWED/);
});
test("missing total token usage fails closed and does not assume free",async()=>{
 const {gate,db,params}=harness();
 await assert.rejects(()=>gate.generate(fakeClient(db,{promptTokenCount:100}),params),/UNACCOUNTABLE_RESPONSE_STOP/);
 assert.equal(db.row.status,"STOPPED");
 assert.equal(db.attempts[0].status,"MISSING_OR_INVALID_USAGE");
});
test("conservative overspend halts and blocks future attempts",async()=>{
 const {gate,db,params}=harness();
 await assert.rejects(()=>gate.generate(fakeClient(db,{totalTokenCount:1_100_000}),params),/COST_LIMIT_CROSSED_STOP/);
 assert.equal(db.attempts.length,1);
 assert.equal(db.row.status,"STOPPED");
 assert.ok(db.row.estimated_usd>3.75);
});
test("wrong model or missing response schema never invokes provider",async()=>{
 const {gate,db,params}=harness();
 let calls=0;const client={models:{generateContent:async()=>{calls++;}}};
 await assert.rejects(()=>gate.generate(client,{...params,model:"gemini-3.8-flash"}),/UNEXPECTED_PRODUCTION_REQUEST/);
 await assert.rejects(()=>gate.generate(client,{...params,config:{}}),/UNEXPECTED_PRODUCTION_REQUEST/);
 assert.equal(calls,0);
 assert.equal(db.attempts.length,0);
});
process.on("exit",()=>{for(const [env,v] of [["YSS_GEMINI_MODEL",original.m],["GEMINI_API_KEY",original.k],["YSS_STAGING_ACCESS_PASSWORD",original.p]]) {if(v===undefined)delete process.env[env];else process.env[env]=v;}});
