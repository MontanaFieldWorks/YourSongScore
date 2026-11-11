#!/usr/bin/env node
// Research-only Gemini 3.8 shadow runner. No production server imports or writes.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import vm from "node:vm";
import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import ts from "typescript";
import {GoogleGenAI,Type} from "@google/genai";

export const BASE="9d32e31912a4e7ff7919a9a64d8c20a2987682db";
export const MODEL="gemini-3.8-flash";
export const MAX_REQUESTS=11;
export const MAX_USD=5;
export const CONFIRM="RUN_YSS_SHADOW38_PAID";
export const EXPECTED_AUDIO={
  chandelier:"d88420262baf2bf9e18349a38c928b1cede5b7ab6c87635004be3e61c964a3f6",
  braden:"996bb44b30054eeab3b36ac07ce9f438e8b014e52c01ec42a05e210050636e3e",
};
export const sha256=b=>crypto.createHash("sha256").update(b).digest("hex");
// Estimated 2026 introductory prices; self-imposed gate, NOT a provider billing cap.
const INPUT_RATE=0.75/1e6, OUTPUT_RATE=3.75/1e6;
const readGit=(root,file)=>execFileSync("git",["show",BASE+":"+file],
  {cwd:root,encoding:"utf8",maxBuffer:12*1024*1024});
function declaration(source,name) {
  const tree=ts.createSourceFile("fragment.ts",source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS);
  for(const node of tree.statements) {
    if(ts.isVariableStatement(node)) {
      for(const d of node.declarationList.declarations) {
        if(d.name.getText(tree)===name && d.initializer) {
          return "const "+name+" = "+d.initializer.getText(tree)+";";
        }
      }
    }
    if(ts.isFunctionDeclaration(node)&&node.name?.text===name) return node.getText(tree).replace(/^export\s+/, "");
  }
  throw Error("Missing pinned production symbol: "+name);
}
const VARS=[
  "GENRE_ENUM_VALUES","SUBGENRE_ENUM_VALUES","GENRE_TAXONOMY_TEXT",
  "SCORE_CALIBRATION","SYSTEM_PROMPT","GENRE_RECHECK_SCHEMA","CRITIQUE_SCHEMA",
  "PRODUCTION_QUALITY_TIER_VALUES","PRODUCTION_QUALITY_TIER_SCORES",
  "tierMetricProperties","SUBMETRICS_SCHEMA_1","SUBMETRIC_SYSTEM_PROMPT",
  "SUBMETRICS_SCHEMA_2","SUBMETRIC_SYSTEM_PROMPT_2",
  "CHORD_KEY_ANALYSIS_SCHEMA","CHORD_KEY_ANALYSIS_PROMPT",
  "SUBMETRICS_SCHEMA_3","SUBMETRIC_SYSTEM_PROMPT_3",
];
const FNS=[
  "applyDeterministicProductionTierScores","assignTierScore",
  "applyDeterministicHeadlineTierScoresCall2","applyDeterministicHeadlineTierScoresCall3",
  "geminiErrorStatus","isGeminiPrepayExhausted",
  "performCritiqueAnalysis","performSubMetricsCall1","performChordKeyAnalysis",
  "performSubMetricsCall2","performSubMetricsCall3","validateGenrePair",
  "verifyInstrumentalGenreIfNeeded","isApplicable","computeParent","applyParent",
  "hasSpecificLowPercussionEvidence","reconcileParentScores",
  "enforceClassicalInstrumentalSourceNeutrality","hasUsableProvidedTitle",
  "enforceBlindReportIntegrity",
];
export function loadPinned(root,requestFn) {
  const server=readGit(root,"server.ts");
  const genre=readGit(root,"src/data/musicData.ts");
  const lib=readGit(root,"src/lib/mudPreventionDiagnostic.ts");
  const libNames=["MUD_DIAGNOSTIC_SCORING_VERSION","MUD_DIAGNOSTIC_STATUS",
    "markMudPreventionDiagnosticOnly","computeMixBalanceScore"];
  const chunks=[
    declaration(genre,"GENRE_MAP"),
    ...VARS.map(n=>declaration(server,n)),
    ...libNames.map(n=>declaration(lib,n)),
    ...FNS.map(n=>declaration(server,n)),
    "globalThis.shadow = {"+[...VARS,...FNS].join(",")+"};",
  ];
  const compile=x=>ts.transpileModule(x,{compilerOptions:{
    target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None
  }}).outputText;
  const ctx=vm.createContext({Type,ai:{},generateContentWithRetry:requestFn,
    console:{log(){},error(){},warn(){}}});
  vm.runInContext(compile(chunks.join("\n")),ctx,{timeout:5000});
  const anchor='let userInstruction = "Analyze this songwriters track from the direct URL stream.';
  const a=server.indexOf(anchor),b=server.indexOf("const parsedCritique = await performCritiqueAnalysis(",a);
  if(a<0||b<=a)throw Error("Missing direct-upload blind user-instruction source");
  const user=vm.runInContext(compile("(() => {const metaGenre='';const metaTitle='';"+
    "const detectedKey='';"+server.slice(a,b)+"return userInstruction;})()"),
    ctx,{timeout:2000});
  return {p:ctx.shadow,user,sourceHash:sha256(server)};
}
function mock(schema,song,key="") {
  if(schema?.type===Type.OBJECT) {
    const v={};for(const k of schema.required||[])v[k]=mock(schema.properties?.[k],song,k);
    return v;
  }
  if(schema?.type===Type.ARRAY)return [];
  if(schema?.enum?.length) {
    if(key==="qualityTier")return "PROFESSIONAL";
    if(key==="genre")return song==="braden"?"Classical":"Pop";
    if(key==="subgenre")return song==="braden"?"Traditional Classical":"Mainstream Top 40";
    return schema.enum[0];
  }
  if(schema?.type===Type.STRING)return "DRY RUN FIXTURE - NOT AN AUDIO ANALYSIS";
  if(schema?.type===Type.BOOLEAN) {
    if(["vocalApplicable","applicable","hasVocals"].includes(key))return song!=="braden";
    return false;
  }
  if(schema?.type===Type.INTEGER||schema?.type===Type.NUMBER)return 85;
  return null;
}
// Independently check provider JSON before production parsing/reconciliation.
// A schema/parse failure is a charged request and stops all subsequent calls.
export function validateStructured(schema,value,where="$") {
  if(value===null && schema?.nullable===true)return;
  if(schema?.enum && !schema.enum.includes(value))
    throw Error(where+": value is outside declared enum");
  switch(schema?.type) {
    case Type.OBJECT:
      if(!value||typeof value!=="object"||Array.isArray(value))
        throw Error(where+": expected object");
      for(const key of schema.required||[]) {
        if(!Object.prototype.hasOwnProperty.call(value,key))
          throw Error(where+"."+key+": required property missing");
      }
      for(const [key,field] of Object.entries(schema.properties||{})) {
        if(Object.prototype.hasOwnProperty.call(value,key))
          validateStructured(field,value[key],where+"."+key);
      }
      break;
    case Type.ARRAY:
      if(!Array.isArray(value))throw Error(where+": expected array");
      if(schema.items) value.forEach((item,i)=>validateStructured(schema.items,item,where+"["+i+"]"));
      break;
    case Type.STRING:
      if(typeof value!=="string")throw Error(where+": expected string");
      break;
    case Type.BOOLEAN:
      if(typeof value!=="boolean")throw Error(where+": expected boolean");
      break;
    case Type.INTEGER:
      if(!Number.isSafeInteger(value))throw Error(where+": expected integer");
      break;
    case Type.NUMBER:
      if(typeof value!=="number"||!Number.isFinite(value))
        throw Error(where+": expected finite number");
      break;
  }
}
export class Gate {
  constructor({dry=true,client=null,record=()=>{}}={}) {
    this.dry=dry;this.client=client;this.record=record;
    this.calls=0;this.estimatedUsd=0;this.history=[];this.song="";this.phase="";this.stopped=false;
  }
  async request(req) {
    if(this.stopped)throw Error("Prior provider failure: no additional requests permitted");
    if(this.calls>=MAX_REQUESTS)throw Error("11-request maximum reached");
    if(this.estimatedUsd+0.5>MAX_USD)throw Error("Conservative $5 estimated spend gate");
    if(req.model!=="gemini-2.5-flash")throw Error("Pinned source model call changed");
    if(!req.config?.responseSchema||req.config.responseMimeType!=="application/json") {
      throw Error("Missing production structured-output contract");
    }
    const config={...req.config,thinkingConfig:{thinkingLevel:"MEDIUM"},maxOutputTokens:32768};
    delete config.temperature;delete config.seed;delete config.tools;delete config.toolConfig;
    const slot=++this.calls;const start=Date.now();
    let resp;
    try {
      resp=this.dry
        ? {text:JSON.stringify(mock(config.responseSchema,this.song)),
           usageMetadata:{promptTokenCount:100,candidatesTokenCount:100,thoughtsTokenCount:100,totalTokenCount:300}}
        : await this.client.models.generateContent({model:MODEL,contents:req.contents,config});
    }catch(e) {
      this.stopped=true;
      const row={slot,song:this.song,phase:this.phase,status:"ERROR",
        milliseconds:Date.now()-start,message:String(e?.message||e).slice(0,220)};
      this.history.push(row);this.record(row);throw e;
    }
    const u=resp.usageMetadata||{};
    const input=u.promptTokenCount,output=u.candidatesTokenCount,thinking=u.thoughtsTokenCount;
    if(![input,output,thinking].every(v=>Number.isFinite(v)&&v>=0)) {
      this.stopped=true;
      const row={slot,song:this.song,phase:this.phase,status:"MISSING_USAGE"};
      this.history.push(row);this.record(row);
      throw Error("Missing usage data, fail closed");
    }
    const usd=input*INPUT_RATE+(output+thinking)*OUTPUT_RATE;
    this.estimatedUsd+=usd;
    const row={slot,song:this.song,phase:this.phase,status:"OK",model:MODEL,
      sourceTemperature:Number.isFinite(req.config.temperature)?req.config.temperature:null,
      shadowTemperature:"OMITTED_PROVIDER_DEFAULT",thinkingLevel:"MEDIUM",
      milliseconds:Date.now()-start,inputTokens:input,outputTokens:output,
      thinkingTokens:thinking,totalTokens:u.totalTokenCount??null,estimatedUsd:usd};
    if(this.estimatedUsd>MAX_USD) {
      this.stopped=true;row.status="OVER_BUDGET";
      this.history.push(row);this.record(row);
      throw Error("Estimated charge cap crossed: stop");
    }
    try {
      if(typeof resp.text!=="string"||!resp.text.trim())throw Error("Empty response");
      validateStructured(config.responseSchema,JSON.parse(resp.text));
    }catch(e) {
      this.stopped=true;row.status="SCHEMA_ERROR";
      row.message=String(e?.message||e).slice(0,220);
      this.history.push(row);this.record(row);
      throw Error("Invalid structured provider response: "+row.message);
    }
    this.history.push(row);this.record(row);
    return resp;
  }
}
// Prevent an expensive partially completed second song. Either song can consume
// five standard requests plus one conditional instrumental-genre verification.
// Keep the approved global 11-attempt limit; never silently increase it.
export function reserveSecondSongBudget(gate) {
  const required=6;
  if(gate.stopped)throw Error("Prior provider failure: second song prohibited");
  if(MAX_REQUESTS-gate.calls<required)
    throw Error("Second song not started: cannot reserve six possible requests inside 11-request cap");
  if(MAX_USD-gate.estimatedUsd<required*0.5)
    throw Error("Second song not started: insufficient conservative cost reservation");
}

export async function runSong(h,gate,song,bytes) {
  const p=h.p,part={inlineData:{mimeType:"audio/mpeg",data:bytes.toString("base64")}};
  gate.song=song;gate.phase="main-critique";
  const c=await p.performCritiqueAnalysis([part,h.user],p.SYSTEM_PROMPT,false);
  c.productionScoringVersion="scoring-tier-v8-mud-diagnostic";
  gate.phase="instrumental-genre-if-applicable";
  await p.verifyInstrumentalGenreIfNeeded(part,c,false);
  if(gate.stopped)throw Error("Instrumental-genre request failed; stop despite production fallback");
  p.validateGenrePair(c);
  gate.phase="call-1-production";
  c.subMetricsCall1=await p.performSubMetricsCall1(part,c);
  gate.phase="chord-key";
  c.chordKeyAnalysis=await p.performChordKeyAnalysis(part);
  let chord;
  if(c.chordKeyAnalysis?.keySignature&&c.chordKeyAnalysis?.chordsUsed?.length) {
    const k=c.chordKeyAnalysis;
    chord="Key: "+k.keySignature+". Chord vocabulary used: "+
      k.chordsUsed.map(x=>x.chord+" ("+x.romanNumeral+")").join(", ")+
      ". (Note: this is the song's overall key and chord vocabulary, not a timed section-by-section progression.)";
  }
  gate.phase="call-2-artistic";
  c.subMetricsCall2=await p.performSubMetricsCall2(part,c,chord);
  gate.phase="call-3-performance";
  c.subMetricsCall3=await p.performSubMetricsCall3(part,c);
  p.validateGenrePair(c);p.reconcileParentScores(c);
  p.enforceClassicalInstrumentalSourceNeutrality(c);
  p.enforceBlindReportIntegrity(c,"");
  return {critique:c,note:"Compatibility shadow only: browser DSP measurements and images unavailable; no production score parity"};
}
export function options(argv) {
  const val=k=>argv.includes(k)?argv[argv.indexOf(k)+1]:null;
  const paid=argv.includes("--execute");
  if(paid&&val("--confirm")!==CONFIRM)throw Error("Separate paid authorization flag required");
  if(!paid&&argv.includes("--confirm"))throw Error("Cannot confirm payment in dry-run");
  const explicitOut=val("--out");
  return {paid,root:val("--repo")||process.cwd(),chandelier:val("--chandelier"),
    braden:val("--braden"),out:explicitOut||path.join(os.tmpdir(),"yss-shadow38"),
    explicitOut:Boolean(explicitOut)};
}
function checked(file,expected) {
  const buf=fs.readFileSync(file);
  if(buf.length>15*1024*1024)throw Error("Audio exceeds current YSS limit");
  if(sha256(buf)!==expected)throw Error("Audio SHA-256 mismatch; stopped without API call");
  return buf;
}
// A paid ledger must be intentionally placed on persistent storage, away from
// OS temp and the git checkout. No filesystem can guarantee backup or durability.
export function validatePaidOutput(o) {
  if(!o.paid)return;
  if(!o.explicitOut||!path.isAbsolute(o.out))
    throw Error("Paid mode requires an explicit absolute --out directory on persistent storage");
  const out=path.resolve(o.out),tmp=path.resolve(os.tmpdir()),repo=path.resolve(o.root);
  if(out===tmp||out.startsWith(tmp+path.sep))
    throw Error("Paid ledger cannot use temporary storage");
  if(out===repo||out.startsWith(repo+path.sep))
    throw Error("Paid ledger cannot be stored inside the git checkout");
}
// Atomic exclusive creation protects against concurrent or repeated paid runs.
export function claimPaidLedger(file) {
  const fd=fs.openSync(file,"wx",0o600);
  fs.closeSync(fd);
}
export async function main(argv) {
  const o=options(argv);
  if(!o.chandelier||!o.braden)throw Error("Both --chandelier and --braden audio paths are required");
  validatePaidOutput(o);
  const a=checked(o.chandelier,EXPECTED_AUDIO.chandelier);
  const b=checked(o.braden,EXPECTED_AUDIO.braden);
  if(o.paid&&Date.now()>=Date.UTC(2027,0,1))throw Error("2026 introductory pricing expired; new review required");
  if(o.paid&&!process.env.GEMINI_API_KEY)throw Error("GEMINI_API_KEY unavailable; do not paste secrets in arguments");
  fs.mkdirSync(o.out,{recursive:true,mode:0o700});
  if(o.paid) {
    // Reject symlink escapes into temp or checkout as well as lexical paths.
    validatePaidOutput({...o,out:fs.realpathSync(o.out)});
  }
  const ledger=path.join(o.out,"ledger.jsonl");
  // Fail closed on restart or concurrent launch. Paid request counts may never reset.
  // A partial/failed paid run requires separate review, not an automatic resume.
  if(o.paid) {
    try {claimPaidLedger(ledger);}
    catch {throw Error("Existing paid-run ledger or inaccessible ledger: rerun prohibited without review");}
  }
  const client=o.paid?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null;
  const gate=new Gate({dry:!o.paid,client,record:row=>
    fs.appendFileSync(ledger,JSON.stringify(row)+"\n",{mode:0o600})});
  const h=loadPinned(o.root,r=>gate.request(r));
  let failure=null;
  let summary;
  try {
    for(const [label,bytes] of [["chandelier",a],["braden",b]]) {
      // If Chandelier unexpectedly triggers instrumental verification, do not
      // begin Braden: there would not be six remaining slots to finish it.
      if(label==="braden")reserveSecondSongBudget(gate);
      const output=await runSong(h,gate,label,bytes);
      fs.writeFileSync(path.join(o.out,label+".json"),JSON.stringify(output,null,2),{mode:0o600});
    }
  }catch(e){failure=e;throw e;
  }finally{
    summary={mode:o.paid?"PAID":"DRY_RUN_NO_API_CALLS",
      status:failure?"STOPPED":"COMPLETED",stopReason:failure?String(failure.message||failure):null,
      model:MODEL,pinnedSource:BASE,sourceHash:h.sourceHash,requests:gate.calls,
      estimatedUsd:gate.estimatedUsd,maxRequests:MAX_REQUESTS,maxEstimatedUsd:MAX_USD,
      costBasis:"Estimated 2026 introductory token prices; not a guaranteed billing cap",
      sourceModel:"gemini-2.5-flash",shadowModel:MODEL,
      thinkingLevel:"MEDIUM",
      productionTemperature:"0 for main submetric passes; 0.1 for chord/key",
      shadowTemperature:"OMITTED_PROVIDER_DEFAULT",shadowSeed:"OMITTED_PROVIDER_DEFAULT",
      maxOutputTokens:32768,browserDspIncluded:false,
      missingProductionContext:["browser-computed DSP evidence","visuals","validated key context"],
      songOrder:["chandelier","braden"],
      secondSongReservation:"Six remaining requests and $3 estimated cost room required before Braden",
      requestLedger:"ledger.jsonl",
      history:gate.history.map(({slot,song,phase,status,estimatedUsd})=>({slot,song,phase,status,estimatedUsd:estimatedUsd??null}))};
    fs.writeFileSync(path.join(o.out,"summary.json"),JSON.stringify(summary,null,2),{mode:0o600});
  }
  return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x,null,2)))
    .catch(e=>{console.error("SHADOW STOPPED:",e.message);process.exitCode=1;});
}
