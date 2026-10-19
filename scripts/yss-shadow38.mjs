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
    if(ts.isFunctionDeclaration(node)&&node.name?.text===name)\n      return node.getText(tree).replace(/^export\\s+/, "");
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
  "geminiErrorStatus","isGeminiPrepayExhausted",\n  "performCritiqueAnalysis","performSubMetricsCall1","performChordKeyAnalysis",
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
      milliseconds:Date.now()-start,inputTokens:input,outputTokens:output,
      thinkingTokens:thinking,totalTokens:u.totalTokenCount??null,estimatedUsd:usd};
    this.history.push(row);this.record(row);
    if(this.estimatedUsd>MAX_USD){this.stopped=true;throw Error("Estimated charge cap crossed: stop");}
    if(!resp.text){this.stopped=true;throw Error("Empty response; no retries");}
    return resp;
  }
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
  return {paid,root:val("--repo")||process.cwd(),chandelier:val("--chandelier"),
    braden:val("--braden"),out:val("--out")||path.join(os.tmpdir(),"yss-shadow38")};
}
function checked(file,expected) {
  const buf=fs.readFileSync(file);
  if(buf.length>15*1024*1024)throw Error("Audio exceeds current YSS limit");
  if(sha256(buf)!==expected)throw Error("Audio SHA-256 mismatch; stopped without API call");
  return buf;
}
export async function main(argv) {
  const o=options(argv);
  if(!o.chandelier||!o.braden)throw Error("Both --chandelier and --braden audio paths are required");
  const a=checked(o.chandelier,EXPECTED_AUDIO.chandelier);
  const b=checked(o.braden,EXPECTED_AUDIO.braden);
  if(o.paid&&!process.env.GEMINI_API_KEY)throw Error("GEMINI_API_KEY unavailable; do not paste secrets in arguments");
  fs.mkdirSync(o.out,{recursive:true,mode:0o700});
  const ledger=path.join(o.out,"ledger.jsonl");
  // Fail closed on restart or concurrent launch. Paid request counts may never reset.
  // A partial/failed paid run requires separate review, not an automatic resume.
  if(o.paid) {
    let fd;
    try {fd=fs.openSync(ledger,"wx",0o600);}
    catch {throw Error("Existing paid-run ledger: rerun prohibited without review");}
    fs.closeSync(fd);
  }
  const client=o.paid?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null;
  const gate=new Gate({dry:!o.paid,client,record:row=>
    fs.appendFileSync(ledger,JSON.stringify(row)+"\n",{mode:0o600})});
  const h=loadPinned(o.root,r=>gate.request(r));
  for(const [label,bytes] of [["chandelier",a],["braden",b]]) {
    const output=await runSong(h,gate,label,bytes);
    fs.writeFileSync(path.join(o.out,label+".json"),JSON.stringify(output,null,2),{mode:0o600});
  }
  const summary={mode:o.paid?"PAID":"DRY_RUN_NO_API_CALLS",model:MODEL,
    pinnedSource:BASE,sourceHash:h.sourceHash,requests:gate.calls,
    estimatedUsd:gate.estimatedUsd,maxRequests:MAX_REQUESTS,maxEstimatedUsd:MAX_USD,
    browserDspIncluded:false};
  fs.writeFileSync(path.join(o.out,"summary.json"),JSON.stringify(summary,null,2),{mode:0o600});
  return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x,null,2)))
    .catch(e=>{console.error("SHADOW STOPPED:",e.message);process.exitCode=1;});
}
