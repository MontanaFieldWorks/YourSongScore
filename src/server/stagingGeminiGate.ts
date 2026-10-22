// ISOLATED YSS GEMINI 3.8 STAGING ONLY. Never merge into production.
// All gate mutations are durable Postgres transactions. A restart cannot reset this test.
import crypto from "node:crypto";
import pg from "pg";
import type { Pool as PgPool, PoolClient } from "pg";
const { Pool } = pg;

export const STAGING_MODEL = "gemini-3.8-flash";
export const STAGING_AUDIO_SHA256 = "d88420262baf2bf9e18349a38c928b1cede5b7ab6c87635004be3e61c964a3f6";
export const STAGING_PRIOR_ATTEMPTS = 1;
export const STAGING_LIFETIME_CAP = 11;
export const STAGING_NEW_CAP = 6;
export const STAGING_PRIOR_RESERVE = 1.25;
export const STAGING_NEW_ESTIMATED_CAP = 3.75;
export const STAGING_TOTAL_ESTIMATED_CAP = 5;
const OUTPUT_RATE = 3.75 / 1_000_000; // conservative: price ALL counted tokens at highest standard rate
const RUN_ID = "chandelier-20261022-once";

export class StagingStop extends Error {
  public code: string;
  constructor(code: string) { super(code); this.name = "StagingStop"; this.code = code; }
}
const safeCode = (s: string) => { throw new StagingStop(s); };
const sha256 = (bytes: Buffer) => crypto.createHash("sha256").update(bytes).digest("hex");

export function conservativeTotalCost(usage: any) {
  const total=usage?.totalTokenCount;
  if(!Number.isSafeInteger(total)||total<=0) return safeCode("UNACCOUNTABLE_TOTAL");
  const fields=["promptTokenCount","candidatesTokenCount","thoughtsTokenCount"];
  let identified=0;
  for(const key of fields) {
    const n=usage?.[key];
    if(n!==undefined&&n!==null) {
      if(!Number.isSafeInteger(n)||n<0) return safeCode("INVALID_USAGE_FIELD");
      identified+=n;
    }
  }
  if(identified>total) return safeCode("INCONSISTENT_USAGE_TOTAL");
  if(usage?.cachedContentTokenCount!==undefined&&usage?.cachedContentTokenCount!==null) {
    const cached=usage.cachedContentTokenCount;
    if(!Number.isSafeInteger(cached)||cached<0 || (usage.promptTokenCount!==undefined&&cached>usage.promptTokenCount)) {
      return safeCode("INVALID_CACHE_USAGE");
    }
  }
  return {total,estimatedUsd:total*OUTPUT_RATE,unallocatedTokens:total-identified};
}

export class StagingGeminiGate {
  private pool: PgPool | null;
  private ready: Promise<void> | null = null;
  private active = false;
  private stoppedInMemory = false;
  constructor() {
    this.pool = process.env.YSS_STAGING_DATABASE_URL
      ? new Pool({connectionString:process.env.YSS_STAGING_DATABASE_URL,max:3,connectionTimeoutMillis:8000})
      : null;
  }
  public isConfigured() {
    return !!this.pool && process.env.YSS_GEMINI_MODEL===STAGING_MODEL &&
      !!process.env.GEMINI_API_KEY && !!process.env.YSS_STAGING_ACCESS_PASSWORD &&
      new Date().getUTCFullYear()===2026;
  }
  private async setup() {
    if(!this.pool) return safeCode("STAGING_DATABASE_UNCONFIGURED");
    if(!this.ready) {
      this.ready = (async()=>{
        await this.pool!.query(`CREATE TABLE IF NOT EXISTS yss38_stage_run (
          id TEXT PRIMARY KEY, status TEXT NOT NULL, attempts INTEGER NOT NULL,
          estimated_usd DOUBLE PRECISION NOT NULL, prior_attempts INTEGER NOT NULL,
          prior_reserved_usd DOUBLE PRECISION NOT NULL)`);
        await this.pool!.query(`CREATE TABLE IF NOT EXISTS yss38_stage_attempt (
          id BIGSERIAL PRIMARY KEY, run_id TEXT NOT NULL,
          slot INTEGER NOT NULL, status TEXT NOT NULL, token_total BIGINT,
          estimated_usd DOUBLE PRECISION, UNIQUE(run_id,slot))`);
      })().catch(err=>{this.ready=null;throw err;});
    }
    await this.ready;
  }
  private async transact<T>(fn:(conn:PoolClient)=>Promise<T>):Promise<T> {
    await this.setup();
    const conn=await this.pool!.connect();
    try {
      await conn.query("BEGIN");
      const result=await fn(conn);
      await conn.query("COMMIT");
      return result;
    } catch(e) {
      try {await conn.query("ROLLBACK");}catch{}
      throw e;
    }finally{conn.release();}
  }
  async begin(audio:Buffer) {
    if(!this.isConfigured())return safeCode("STAGING_NOT_ARMED");
    if(this.active||this.stoppedInMemory)return safeCode("SINGLE_RUN_ALREADY_STARTED");
    if(sha256(audio)!==STAGING_AUDIO_SHA256)return safeCode("ONLY_PINNED_CHANDELIER_ALLOWED");
    await this.transact(async conn=>{
      await conn.query("INSERT INTO yss38_stage_run (id,status,attempts,estimated_usd,prior_attempts,prior_reserved_usd) VALUES ($1,'READY',0,0,1,1.25) ON CONFLICT (id) DO NOTHING",[RUN_ID]);
      const r=await conn.query("SELECT * FROM yss38_stage_run WHERE id=$1 FOR UPDATE",[RUN_ID]);
      if(r.rows.length!==1||r.rows[0].status!=="READY"||
         Number(r.rows[0].prior_attempts)!==STAGING_PRIOR_ATTEMPTS ||
         Number(r.rows[0].prior_reserved_usd)!==STAGING_PRIOR_RESERVE) {
        return safeCode("STAGING_ONE_TIME_RUN_ALREADY_CLAIMED");
      }
      await conn.query("UPDATE yss38_stage_run SET status='RUNNING' WHERE id=$1",[RUN_ID]);
    });
    this.active=true;
  }
  private async claimAttempt():Promise<number> {
    if(!this.active||this.stoppedInMemory)return safeCode("RUN_NOT_ACTIVE");
    return this.transact(async conn=>{
      const r=await conn.query("SELECT * FROM yss38_stage_run WHERE id=$1 FOR UPDATE",[RUN_ID]);
      const st=r.rows[0];
      if(!st||st.status!=="RUNNING")return safeCode("RUN_NOT_ACTIVE");
      const attempts=Number(st.attempts),estimate=Number(st.estimated_usd);
      if(!Number.isSafeInteger(attempts)||!Number.isFinite(estimate)||
         attempts>=STAGING_NEW_CAP||attempts+STAGING_PRIOR_ATTEMPTS>=STAGING_LIFETIME_CAP)
         return safeCode("LIFETIME_ATTEMPT_CAP");
      if(estimate+0.5>STAGING_NEW_ESTIMATED_CAP || estimate+STAGING_PRIOR_RESERVE+0.5>STAGING_TOTAL_ESTIMATED_CAP)
         return safeCode("LIFETIME_ESTIMATED_COST_CAP");
      const slot=attempts+1;
      // A committed ATTEMPTED row MUST exist before contacting Google. Any crash consumes this slot.
      await conn.query("INSERT INTO yss38_stage_attempt (run_id,slot,status) VALUES ($1,$2,'ATTEMPTED')",[RUN_ID,slot]);
      await conn.query("UPDATE yss38_stage_run SET attempts=$2 WHERE id=$1",[RUN_ID,slot]);
      return slot;
    });
  }
  private async markPaid(slot:number, status:string, total:number|null, estimated:number|null) {
    return this.transact(async conn=>{
      const r=await conn.query("SELECT * FROM yss38_stage_run WHERE id=$1 FOR UPDATE",[RUN_ID]);
      if(!r.rows[0]||r.rows[0].status!=="RUNNING") return safeCode("LEDGER_RUN_NOT_ACTIVE");
      await conn.query("UPDATE yss38_stage_attempt SET status=$3,token_total=$4,estimated_usd=$5 WHERE run_id=$1 AND slot=$2 AND status='ATTEMPTED'",[RUN_ID,slot,status,total,estimated]);
      const cumulative=Number(r.rows[0].estimated_usd)+(estimated||0);
      await conn.query("UPDATE yss38_stage_run SET estimated_usd=$2, status=$3 WHERE id=$1",[RUN_ID,cumulative,
        status==="OK" && cumulative<=STAGING_NEW_ESTIMATED_CAP ? "RUNNING":"STOPPED"]);
      return cumulative;
    });
  }
  async generate(client:any,params:any) {
    if(!this.active||this.stoppedInMemory)return safeCode("RUN_NOT_ACTIVE");
    if(params.model!=="gemini-2.5-flash"||!params.config?.responseSchema) return safeCode("UNEXPECTED_PRODUCTION_REQUEST");
    const slot=await this.claimAttempt();
    const config={...params.config,thinkingConfig:{thinkingLevel:"MEDIUM"},maxOutputTokens:32768};
    delete config.seed;delete config.temperature;delete config.topP;delete config.topK;delete config.candidateCount;
    delete config.tools;delete config.toolConfig;
    let response:any;
    try {
      response=await client.models.generateContent({model:STAGING_MODEL,contents:params.contents,config});
    }catch{
      this.stoppedInMemory=true;
      try{await this.markPaid(slot,"PROVIDER_ERROR",null,null);}catch{}
      return safeCode("PROVIDER_ERROR_NO_RETRY");
    }
    let priced:{total:number,estimatedUsd:number,unallocatedTokens:number};
    try{priced=conservativeTotalCost(response?.usageMetadata);}
    catch{
      this.stoppedInMemory=true;
      try{await this.markPaid(slot,"MISSING_OR_INVALID_USAGE",null,null);}catch{}
      return safeCode("UNACCOUNTABLE_RESPONSE_STOP");
    }
    try {
      const cumulative=await this.markPaid(slot,"OK",priced.total,priced.estimatedUsd);
      if(cumulative>STAGING_NEW_ESTIMATED_CAP) {
        this.stoppedInMemory=true;
        return safeCode("COST_LIMIT_CROSSED_STOP");
      }
    }catch(e){this.stoppedInMemory=true;throw e;}
    return response;
  }
  async complete() {
    if(!this.active||this.stoppedInMemory)return safeCode("RUN_NOT_COMPLETABLE");
    await this.transact(async conn=>{
      const r=await conn.query("UPDATE yss38_stage_run SET status='COMPLETED' WHERE id=$1 AND status='RUNNING' RETURNING id",[RUN_ID]);
      if(r.rows.length!==1)return safeCode("RUN_NOT_COMPLETABLE");
    });
    this.active=false;
  }
  async abort() {
    if(!this.active)return;
    this.stoppedInMemory=true;
    try{await this.transact(async conn=>{await conn.query("UPDATE yss38_stage_run SET status='STOPPED' WHERE id=$1 AND status='RUNNING'",[RUN_ID]);});}catch{}
    this.active=false;
  }
  async status() {
    if(!this.isConfigured())return {ready:false,reason:"STAGING_NOT_CONFIGURED"};
    await this.setup();
    const r=await this.pool!.query("SELECT status,attempts,estimated_usd FROM yss38_stage_run WHERE id=$1",[RUN_ID]);
    return {ready:true,state:r.rows[0]?.status??"READY",newAttempts:r.rows[0]?.attempts??0,
      lifetimeAttempts:STAGING_PRIOR_ATTEMPTS+(Number(r.rows[0]?.attempts)||0),
      newEstimatedUsd:r.rows[0]?.estimated_usd??0, priorReservedUsd:STAGING_PRIOR_RESERVE};
  }
}
