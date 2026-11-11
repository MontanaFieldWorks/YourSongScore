/**
 * Read-only A2 scoring provenance. This module never assigns a scored metric,
 * parent score, applicability flag or scoring weight.
 * The raw model output is withheld server-side before public serialization.
 */
import { isMudDiagnosticCritique } from "./mudPreventionDiagnostic.ts";

export type A2DiagnosticRow = { section: string; field: string; value: string | number };

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numberOrMissing = (v: unknown): number | "NOT_CAPTURED" =>
  finite(v) ? v : "NOT_CAPTURED";
const textOrMissing = (v: unknown): string =>
  typeof v === "string" && v.trim() ? v : "NOT_CAPTURED";
const roundTo = (value: number, places = 6) =>
  Math.round((value + Number.EPSILON) * 10 ** places) / 10 ** places;

const PRODUCTION: Array<[string, number]> = [
  ["aestheticDesign", 40],
  ["spaceAndDensity", 35],
  ["paletteCohesion", 25],
];
const MIX: Array<[string, number]> = [
  ["mudPrevention", 25],
  ["midrangeSpacing", 25],
  ["lowEndDivision", 20],
  ["sibilanceShaving", 15],
  ["stereoWidth", 15],
];

const freshEntry = (critique: any, key: string): any =>
  critique?.subMetricsCall1?.a2ScoringProvenance?.[key];

/** Mirror the server's Production Index weightedAvg: finite score, no N/A filter. */
export function captureA2ServerProductionInputs(critique: any): void {
  const entry = freshEntry(critique, "spaceAndDensity");
  if (!entry) return;
  const call1 = critique.subMetricsCall1;
  const scored = PRODUCTION.filter(([key]) => finite(call1?.[key]?.score));
  const denominator = scored.reduce((sum, [, weight]) => sum + weight, 0);
  const actual = call1?.spaceAndDensity?.score;
  entry.productionWeightUnits = finite(actual) ? 35 : null;
  entry.productionDenominator = denominator || null;
  entry.productionContribution = finite(actual) && denominator
    ? (actual * 35 / denominator) : null;
  entry.productionEffectiveWeight = finite(actual) && denominator
    ? (35 * 100 / denominator) : null;
  entry.productionWeightedMean = denominator
    ? scored.reduce((total, [key, weight]) => total + call1[key].score * weight, 0) / denominator
    : null;
}


/**
 * Stage 3D-2K: numeric-only Spectral Match ledger for existing decisions.
 * These snapshots never select a score, cap, applicability, or model response.
 * Do not copy unredacted Gemini commentary to this ledger.
 */
export function captureA2ServerSpectralScore(critique: any, finishCeiling: number | null): void {
  const entry = freshEntry(critique, "spectralMatch");
  if (!entry) return;
  const metric = critique?.subMetricsCall1?.spectralMatch;
  if (metric?.applicable === false) {
    entry.serverSpectralStatus = "NOT_APPLICABLE";
    entry.serverScoreAfterFinishCap = null;
    entry.serverFinishCapCandidate = null;
    entry.serverFinishCapApplied = null;
    entry.serverFinishCapReason = "NOT_APPLICABLE";
    return;
  }
  const original = entry.canonicalMappedScore;
  const after = metric?.score;
  if (!finite(original) || !finite(after)) {
    entry.serverSpectralStatus = "NOT_CAPTURED";
    entry.serverScoreAfterFinishCap = null;
    entry.serverFinishCapCandidate = null;
    entry.serverFinishCapApplied = null;
    entry.serverFinishCapReason = "NOT_CAPTURED";
    return;
  }
  // A null ceiling proves "no cap" only when finish evidence explicitly
  // records null; missing or contradictory evidence is never an implicit NONE.
  const finish = critique?.productionFinishEvidence;
  const ceilingKnown = finish !== null && typeof finish === "object" &&
    Object.prototype.hasOwnProperty.call(finish, "ceiling") &&
    (finish.ceiling === null || finite(finish.ceiling)) &&
    finish.ceiling === finishCeiling;
  const capKnown = finishCeiling === null || finite(finishCeiling);
  const expected = capKnown ? finishCeiling === null ?
    original : Math.min(original, finishCeiling) : null;
  const valid = ceilingKnown && capKnown && after === expected;
  entry.serverSpectralStatus = !ceilingKnown || !capKnown ? "NOT_CAPTURED" :
    valid ? "CAPTURED" : "UNATTRIBUTED_SCORE_CHANGE";
  entry.serverScoreAfterFinishCap = after;
  entry.serverFinishCapCandidate = ceilingKnown && finite(finishCeiling) ? finishCeiling : null;
  const applied = valid && finite(finishCeiling) && original > finishCeiling;
  entry.serverFinishCapApplied = valid ? applied : null;
  entry.serverFinishCapReason = !ceilingKnown || !capKnown ? "NOT_CAPTURED" :
    !valid ? "UNATTRIBUTED_SCORE_CHANGE" :
    applied ? "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING" : "NONE";
}

export function captureA2SpectralAfterBrowserMix(critique: any, spectralCap: number | null): void {
  const entry = freshEntry(critique, "spectralMatch");
  if (!entry) return;
  const metric = critique?.subMetricsCall1?.spectralMatch;
  if (metric?.applicable === false) {
    entry.browserSpectralStatus = "NOT_APPLICABLE";
    entry.afterSpectralCapScore = null;
    entry.browserSpectralCapCandidate = null;
    entry.browserSpectralCapApplied = null;
    entry.browserSpectralCapReason = "NOT_APPLICABLE";
    return;
  }
  const before = entry.preClientScore;
  const after = metric?.score;
  if (!finite(before) || !finite(after)) {
    entry.browserSpectralStatus = "NOT_CAPTURED";
    entry.afterSpectralCapScore = null;
    entry.browserSpectralCapCandidate = null;
    entry.browserSpectralCapApplied = null;
    entry.browserSpectralCapReason = "NOT_CAPTURED";
    return;
  }
  // Explicit null means no selected cap; undefined means missing evidence.
  const capKnown = spectralCap === null || finite(spectralCap);
  const serverVerified = entry.serverSpectralStatus === "CAPTURED" &&
    finite(entry.serverScoreAfterFinishCap) &&
    before === entry.serverScoreAfterFinishCap;
  const expected = capKnown ? spectralCap === null ?
    before : Math.min(before, spectralCap) : null;
  const valid = capKnown && serverVerified && after === expected;
  entry.browserSpectralStatus = !capKnown || !serverVerified ? "NOT_CAPTURED" :
    valid ? "CAPTURED" : "UNATTRIBUTED_SCORE_CHANGE";
  entry.afterSpectralCapScore = after;
  entry.browserSpectralCapCandidate = capKnown && finite(spectralCap) ? spectralCap : null;
  const applied = valid && finite(spectralCap) && before > spectralCap;
  entry.browserSpectralCapApplied = valid ? applied : null;
  entry.browserSpectralCapReason = !capKnown || !serverVerified ? "NOT_CAPTURED" :
    !valid ? "UNATTRIBUTED_SCORE_CHANGE" :
    applied ? "BROWSER_SPECTRAL_OUTLIER_CAP" : "NONE";
}

export function captureA2SpectralAfterFinish(critique: any, finishCeiling: number | null): void {
  const entry = freshEntry(critique, "spectralMatch");
  if (!entry) return;
  const metric = critique?.subMetricsCall1?.spectralMatch;
  if (metric?.applicable === false) {
    entry.browserFinishStatus = "NOT_APPLICABLE";
    entry.afterFinishCeilingScore = null;
    entry.finalScore = null;
    entry.browserFinishCapCandidate = null;
    entry.browserFinishCapApplied = null;
    entry.browserFinishCapReason = "NOT_APPLICABLE";
    return;
  }
  const before = entry.afterSpectralCapScore;
  const after = metric?.score;
  if (entry.browserSpectralStatus !== "CAPTURED" || !finite(before) || !finite(after)) {
    entry.browserFinishStatus = "NOT_CAPTURED";
    entry.afterFinishCeilingScore = null;
    entry.finalScore = null;
    entry.browserFinishCapCandidate = null;
    entry.browserFinishCapApplied = null;
    entry.browserFinishCapReason = "NOT_CAPTURED";
    return;
  }
  // Verify the selected browser ceiling against its reconciled finish record.
  const finish = critique?.productionFinishEvidence;
  const ceilingKnown = finish !== null && typeof finish === "object" &&
    Object.prototype.hasOwnProperty.call(finish, "ceiling") &&
    (finish.ceiling === null || finite(finish.ceiling)) &&
    finish.ceiling === finishCeiling;
  const capKnown = finishCeiling === null || finite(finishCeiling);
  const expected = capKnown ? finishCeiling === null ?
    before : Math.min(before, finishCeiling) : null;
  const valid = ceilingKnown && capKnown && after === expected;
  entry.browserFinishStatus = !ceilingKnown || !capKnown ? "NOT_CAPTURED" :
    valid ? "COMPLETED" : "UNATTRIBUTED_SCORE_CHANGE";
  entry.afterFinishCeilingScore = after;
  entry.finalScore = valid ? after : null;
  entry.browserFinishCapCandidate = ceilingKnown && finite(finishCeiling) ? finishCeiling : null;
  const applied = valid && finite(finishCeiling) && before > finishCeiling;
  entry.browserFinishCapApplied = valid ? applied : null;
  entry.browserFinishCapReason = !ceilingKnown || !capKnown ? "NOT_CAPTURED" :
    !valid ? "UNATTRIBUTED_SCORE_CHANGE" :
    applied ? "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING" : "NONE";
}

/** Mirror the server Mix Balance scorer, including Mud exclusion and N/A gates. */
export function captureA2ServerMixInputs(critique: any): void {
  const entry = freshEntry(critique, "midrangeSpacing");
  if (!entry) return;
  const mix = exactMixContribution(critique);
  entry.serverMixDenominator = mix.denominator;
  entry.serverMixContribution = mix.contribution;
  entry.serverMixEffectiveWeight = mix.effectiveWeight;
}

/** Exact fraction used by computeMixBalanceScore (before rounded parent/caps). */
export function exactMixContribution(critique: any): {
  denominator: number | null;
  contribution: number | null;
  effectiveWeight: number | null;
} {
  const call1 = critique?.subMetricsCall1;
  if (!call1) return { denominator: null, contribution: null, effectiveWeight: null };
  const included = MIX.filter(([key]) =>
    (key !== "mudPrevention" || !isMudDiagnosticCritique(critique)) &&
    call1[key]?.applicable !== false && finite(call1[key]?.score));
  const denominator = included.reduce((total, [, w]) => total + w, 0);
  const includedMidrange = included.some(([key]) => key === "midrangeSpacing");
  if (!denominator || !includedMidrange) return {
    denominator: denominator || null, contribution: null, effectiveWeight: null,
  };
  return {
    denominator,
    contribution: call1.midrangeSpacing.score * 25 / denominator,
    effectiveWeight: 100 * 25 / denominator,
  };
}


// Stage 3D-2L-2. Snapshot ONLY existing numeric decisions, never model text.
// Capture functions are diagnostic observers; neither computes nor writes a score.
export const AURALIS_PENALTY_INVENTORY_VERSION = "auralis-stage3d2l2-penalty-inventory-v1";
const auditNumber=(v:any):number|null=>finite(v)&&v>=0&&v<=100?v:null;
const auditCeiling=(v:any):number|null|"NOT_CAPTURED"=>
  v===null?null:auditNumber(v)??"NOT_CAPTURED";
const auditPenalty=(v:any):number|"NOT_CAPTURED"=>
  finite(v)&&v>=0&&v<=100?v:"NOT_CAPTURED";
const auditFreeze=(v:any):any=>{
  if(v&&typeof v==="object"&&!Object.isFrozen(v)){
    Object.values(v).forEach(auditFreeze);Object.freeze(v);
  }
  return v;
};
const auditStage=(before:any,candidate:any,after:any,applicable:any)=>{
  if(applicable===false)return auditFreeze({status:"NOT_APPLICABLE",before:null,candidate:null,after:null,applied:false});
  const a=auditNumber(before),b=auditNumber(after),cap=auditCeiling(candidate);
  if(a===null||b===null||cap==="NOT_CAPTURED")
    return auditFreeze({status:"NOT_CAPTURED",before:a,candidate:cap,after:b,applied:null});
  const expected=cap===null?a:Math.min(a,cap);
  if(expected!==b)return auditFreeze({status:"CONTRADICTORY",before:a,candidate:cap,after:b,applied:null});
  return auditFreeze({status:"VERIFIED",before:a,candidate:cap,after:b,applied:b<a});
};

/** Captures server-returned state BEFORE existing browser corrections. */
export function captureAuralisPenaltyInventoryBeforeClient(c:any):void {
  if(c?.productionScoringVersion!=="scoring-tier-v8-mud-diagnostic"||c?.auralisPenaltyInventory)return;
  const call=c?.subMetricsCall1,trace=call?.a2ScoringProvenance;
  const before=auditFreeze({
    scoringVersion:c.productionScoringVersion,
    serverFinishSource:c?.productionFinishEvidence?.source==="server"?"server":"NOT_CAPTURED",
    serverFinishCeiling:auditCeiling(c?.productionFinishEvidence?.ceiling),
    spectralCanonical:auditNumber(trace?.spectralMatch?.canonicalMappedScore),
    spectralAfterServer:auditNumber(call?.spectralMatch?.score),
    spectralServerStatus:trace?.spectralMatch?.serverSpectralStatus==="CAPTURED"?"CAPTURED":"NOT_CAPTURED",
    midrangeAfterServer:auditNumber(call?.midrangeSpacing?.score),
    productionAfterServer:auditNumber(c?.scores?.overallProduction),
    mixAfterServer:auditNumber(c?.mixQuality?.score),
    commercialAfterServer:auditNumber(c?.scores?.commercialReadiness),
    transientBeforeBrowser:auditNumber(c?.subMetricsCall3?.instrumentalStagingSubs?.transientPunch?.score),
    transientApplicable:c?.subMetricsCall3?.instrumentalStagingSubs?.transientPunch?.applicable!==false,
  });
  c.auralisPenaltyInventory=auditFreeze({
    schemaVersion:AURALIS_PENALTY_INVENTORY_VERSION,
    scoringImpact:"NONE",adjustments:[] as [],
    status:"PRE_CLIENT_ONLY",capture:"ACTUAL_SERVER_RETURNED_SNAPSHOT",
    before,after:null,stages:null,overlapFamilies:[] as string[],
  });
}

/** Called after existing browser penalties/ceilings; never mutates scoring. */
export function captureAuralisPenaltyInventoryAfterClient(c:any):void {
  const old=c?.auralisPenaltyInventory;
  if(old?.schemaVersion!==AURALIS_PENALTY_INVENTORY_VERSION||
     old.status!=="PRE_CLIENT_ONLY")return;
  const pre=old.before,call=c?.subMetricsCall1,trace=call?.a2ScoringProvenance;
  const finish=c?.productionFinishEvidence,caps=c?.mixBalanceEvidence;
  const after=auditFreeze({
    finishSource:finish?.source==="reconciled"?"reconciled":"NOT_CAPTURED",
    effectiveFinishCeiling:auditCeiling(finish?.ceiling),
    browserSpectralCandidate:auditCeiling(caps?.spectralCap),
    browserMidrangeCandidate:auditCeiling(caps?.midrangeCap),
    dynamicPenalty:auditPenalty(finish?.dynamicFinishPenalty),
    brickwallPenalty:auditPenalty(finish?.brickwallFinishPenalty),
    effectiveTechnicalPenalty:auditPenalty(finish?.technicalFinishPenalty),
    transientPunchCandidate:auditCeiling(finish?.transientPunchCap===undefined?"NOT_CAPTURED":finish.transientPunchCap),
    spectralAfterBrowser:auditNumber(trace?.spectralMatch?.afterSpectralCapScore),
    spectralFinal:auditNumber(call?.spectralMatch?.score),
    midrangeFinal:auditNumber(call?.midrangeSpacing?.score),
    transientFinal:auditNumber(c?.subMetricsCall3?.instrumentalStagingSubs?.transientPunch?.score),
    productionFinal:auditNumber(c?.scores?.overallProduction),
    mixFinal:auditNumber(c?.mixQuality?.score),
    commercialFinal:auditNumber(c?.scores?.commercialReadiness),
  });
  const spectralServer=auditStage(pre.spectralCanonical,pre.serverFinishCeiling,
    pre.spectralAfterServer,call?.spectralMatch?.applicable);
  const spectralBrowser=auditStage(pre.spectralAfterServer,after.browserSpectralCandidate,
    after.spectralAfterBrowser,call?.spectralMatch?.applicable);
  const spectralFinish=auditStage(after.spectralAfterBrowser,after.effectiveFinishCeiling,
    after.spectralFinal,call?.spectralMatch?.applicable);
  const midrange=auditStage(pre.midrangeAfterServer,after.browserMidrangeCandidate,
    after.midrangeFinal,call?.midrangeSpacing?.applicable);
  const transient=auditStage(pre.transientBeforeBrowser,after.transientPunchCandidate,
    after.transientFinal,pre.transientApplicable);
  const d=after.dynamicPenalty,b=after.brickwallPenalty,t=after.effectiveTechnicalPenalty;
  const technicalStatus=[d,b,t].some(x=>x==="NOT_CAPTURED")?"NOT_CAPTURED":
    t===Math.max(d as number,b as number)?"VERIFIED":"CONTRADICTORY";
  const prodBefore=pre.productionAfterServer,prodAfter=after.productionFinal;
  const ceiling=after.effectiveFinishCeiling;
  const expectedProduction=prodBefore===null||t==="NOT_CAPTURED"||ceiling==="NOT_CAPTURED"
    ?null:ceiling===null?Math.max(0,prodBefore-(t as number)):
      Math.min(Math.max(0,prodBefore-(t as number)),ceiling);
  const productionStatus=expectedProduction===null?"NOT_CAPTURED":
    prodAfter===expectedProduction?"VERIFIED":"CONTRADICTORY";
  const mixParts:[string,number][]=[
    ["midrangeSpacing",25],["lowEndDivision",20],
    ["sibilanceShaving",15],["stereoWidth",15]];
  const validParts=mixParts.filter(([key])=>call?.[key]?.applicable!==false&&
    auditNumber(call?.[key]?.score)!==null);
  const denom=validParts.reduce((sum,[,w])=>sum+w,0);
  const expectedMix=!denom||ceiling==="NOT_CAPTURED"?null:
    Math.round(validParts.reduce((sum,[key,w])=>sum+call[key].score*w,0)/denom);
  const finalMix=expectedMix===null?null:ceiling===null?expectedMix:Math.min(expectedMix,ceiling);
  const mixStatus=finalMix===null?"NOT_CAPTURED":
    after.mixFinal===finalMix?"VERIFIED":"CONTRADICTORY";
  const commercialParts:[any,number][]=[
    [c?.subMetricsCall3?.compositionFlowSubs?.hookPlacement?.score,60],
    [call?.dynamicVariety?.score,20],
    [call?.spectralMatch?.score,10],
    [c?.subMetricsCall3?.compositionFlowSubs?.sectionalContrast?.score,10]];
  const available=commercialParts.filter(([score])=>finite(score));
  const commercialDenom=available.reduce((sum,[,w])=>sum+w,0);
  const expectedCommercial=commercialDenom?
    Math.round(available.reduce((sum,[score,w])=>sum+score*w,0)/commercialDenom):null;
  const commercialStatus=expectedCommercial===null?"NOT_CAPTURED":
    after.commercialFinal===expectedCommercial?"VERIFIED":"CONTRADICTORY";
  const overlaps:string[]=[];
  if(after.browserSpectralCandidate!=="NOT_CAPTURED"&&
     after.browserSpectralCandidate!==null&&after.browserMidrangeCandidate!=="NOT_CAPTURED"&&
     after.browserMidrangeCandidate!==null)overlaps.push("MIDRANGE_SPECTRAL_SHARED");
  if(after.effectiveFinishCeiling!=="NOT_CAPTURED"&&after.effectiveFinishCeiling!==null&&
     after.browserSpectralCandidate!=="NOT_CAPTURED"&&
     after.browserSpectralCandidate!==null)overlaps.push("SPECTRAL_FINISH_SHARED");
  if(b!=="NOT_CAPTURED"&&b>0&&after.transientPunchCandidate!=="NOT_CAPTURED"&&
     after.transientPunchCandidate!==null)overlaps.push("PEAK_DENSITY_SHARED");
  if(d!=="NOT_CAPTURED"&&b!=="NOT_CAPTURED"&&d>0&&b>0)
    overlaps.push("DYNAMIC_LRA_SHARED");
  const stages=auditFreeze({
    spectralServer,spectralBrowser,spectralFinish,midrange,transient,
    technical:{status:technicalStatus,dynamic:d,brickwall:b,effective:t},
    production:{status:productionStatus,before:prodBefore,after:prodAfter,expected:expectedProduction},
    mix:{status:mixStatus,after:after.mixFinal,expected:finalMix},
    commercial:{status:commercialStatus,after:after.commercialFinal,expected:expectedCommercial}
  });
  const statuses=[spectralServer.status,spectralBrowser.status,spectralFinish.status,
    midrange.status,transient.status,technicalStatus,productionStatus,mixStatus,commercialStatus];
  // Fail closed: completeness requires every replay verified or inapplicable.
  // A known overlap is descriptive evidence, NOT a new scoring adjustment.
  const status=statuses.includes("CONTRADICTORY")?"CONTRADICTORY":
    statuses.some(x=>x!=="VERIFIED"&&x!=="NOT_APPLICABLE")||
      pre.serverFinishSource!=="server"||after.finishSource!=="reconciled"||
      pre.spectralServerStatus!=="CAPTURED"?"INCOMPLETE":"VERIFIED";
  c.auralisPenaltyInventory=auditFreeze({
    schemaVersion:AURALIS_PENALTY_INVENTORY_VERSION,
    scoringImpact:"NONE",adjustments:[] as [],
    status,capture:"ACTUAL_PRE_POST_BROWSER_SNAPSHOTS",
    before:pre,after,stages,overlapFamilies:overlaps,
  });
}

/** Public diagnostic rows are limited to numeric scores and fixed vocabulary. */
export function getAuralisPenaltyInventoryRows(c:any):A2DiagnosticRow[] {
  const i=c?.auralisPenaltyInventory;
  const rows:A2DiagnosticRow[]=[];
  const add=(field:string,value:any)=>rows.push({
    section:"Auralis Penalty Inventory (NOT SCORED)",field,
    value:typeof value==="number"?value:
      typeof value==="string"&&/^(VERIFIED|INCOMPLETE|PRE_CLIENT_ONLY|CONTRADICTORY|NOT_CAPTURED|NOT_APPLICABLE|CAPTURED|APPLIED|NOT_APPLIED|server|reconciled|ACTUAL_[A-Z_]+|NONE|MIDRANGE_SPECTRAL_SHARED|SPECTRAL_FINISH_SHARED|PEAK_DENSITY_SHARED|DYNAMIC_LRA_SHARED)$/.test(value)
        ?value:"NOT_CAPTURED"
  });
  if(i?.schemaVersion!==AURALIS_PENALTY_INVENTORY_VERSION){
    add("Capture status","NOT_CAPTURED");return rows;
  }
  add("Capture status",i.status);
  add("Server finish provenance",i.before?.serverFinishSource);
  add("Browser finish provenance",i.after?.finishSource);
  add("Original server finish ceiling",i.before?.serverFinishCeiling===null?"NONE":i.before?.serverFinishCeiling);
  add("Effective browser finish ceiling",i.after?.effectiveFinishCeiling===null?"NONE":i.after?.effectiveFinishCeiling);
  for(const [key,label] of [
    ["spectralServer","Server Spectral Match cap"],
    ["spectralBrowser","Browser Spectral Match cap"],
    ["spectralFinish","Reconciled finish Spectral Match cap"],
    ["midrange","Browser Midrange Spacing cap"],
    ["transient","Transient Punch cap"]] as const){
    const stage=i.stages?.[key];
    add(label+" status",stage?.status);
    add(label+" before",stage?.before);
    add(label+" candidate",stage?.candidate===null?"NONE":stage?.candidate);
    add(label+" application",stage?.status==="NOT_APPLICABLE"?"NOT_APPLICABLE":
      stage?.status==="VERIFIED"?(stage.applied?"APPLIED":"NOT_APPLIED"):"NOT_CAPTURED");
    add(label+" after",stage?.after);
  }
  for(const key of ["dynamic","brickwall","effective"]){
    add("Technical finish "+key,i.stages?.technical?.[key]);
  }
  add("Technical max-not-sum status",i.stages?.technical?.status);
  for(const key of ["production","mix","commercial"]){
    add(key+" replay status",i.stages?.[key]?.status);
    add(key+" server-returned score",i.before?.[key==="production"?
      "productionAfterServer":key==="mix"?"mixAfterServer":"commercialAfterServer"]);
    add(key+" final score",i.stages?.[key]?.after);
  }
  if(Array.isArray(i.overlapFamilies)){
    for(const family of i.overlapFamilies)add("Shared evidence family",family);
  } else add("Shared evidence family","NOT_CAPTURED");
  return rows;
}

export function captureA2BeforeClient(critique: any): void {
  // Optional diagnostic observer must never block the original score ledger.
  try { captureAuralisPenaltyInventoryBeforeClient(critique); } catch { /* fail closed */ }
  const trace = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!trace) return;
  for (const key of ["spaceAndDensity", "midrangeSpacing", "spectralMatch"]) {
    const entry = trace[key];
    if (!entry || Object.hasOwn(entry, "preClientScore")) continue;
    const score = critique.subMetricsCall1?.[key]?.score;
    entry.preClientScore = finite(score) ? score : null;
  }
}

export function captureA2BrowserUnavailable(critique: any): void {
  captureA2BeforeClient(critique);
  const spectral = freshEntry(critique, "spectralMatch");
  if (spectral) {
    spectral.browserSpectralStatus = "BROWSER_DSP_UNAVAILABLE";
    spectral.browserFinishStatus = "BROWSER_DSP_UNAVAILABLE";
    spectral.afterSpectralCapScore = null;
    spectral.afterFinishCeilingScore = null;
    spectral.finalScore = null;
    spectral.browserSpectralCapCandidate = null;
    spectral.browserSpectralCapApplied = null;
    spectral.browserSpectralCapReason = "BROWSER_DSP_UNAVAILABLE";
    spectral.browserFinishCapCandidate = null;
    spectral.browserFinishCapApplied = null;
    spectral.browserFinishCapReason = "BROWSER_DSP_UNAVAILABLE";
  }
  const trace = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!trace) return;
  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const entry = trace[key];
    if (!entry) continue;
    entry.postClientScore = null;
    entry.browserScoringStage = "BROWSER_DSP_UNAVAILABLE";
    entry.clientCapReason = "BROWSER_DSP_UNAVAILABLE";
    entry.clientCapLimit = null;
    entry.clientCapCandidate = null;
  }
}

/** Records only the result of pre-existing client corrections. */
export function captureA2AfterClient(
  critique: any,
  caps: { midrangeCap: number | null; spaceDensityCeiling: number | null },
): void {
  const trace = critique?.subMetricsCall1?.a2ScoringProvenance;
  if (!trace) return;
  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const entry = trace[key];
    if (!entry) continue;
    const current = critique?.subMetricsCall1?.[key]?.score;
    const after = finite(current) ? current : null;
    const before = entry.preClientScore;
    const cap = key === "midrangeSpacing" ? caps.midrangeCap : caps.spaceDensityCeiling;
    const changed = finite(before) && finite(after) && after !== before;
    entry.postClientScore = after;
    entry.browserScoringStage = "COMPLETED";
    entry.clientCapCandidate = finite(cap) ? cap : null;
    const attributed = changed && finite(cap) && before > cap && after === cap;
    entry.clientCapReason = !changed
      ? "NONE"
      : attributed
        ? key === "midrangeSpacing"
          ? "MIDRANGE_FLATNESS_CAP"
          : "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING"
        : "OTHER_CLIENT_CHANGE_NOT_ATTRIBUTED_TO_A2_CAP";
    entry.clientCapLimit = attributed ? cap : null;
    // Freeze exact Mix Balance inputs at browser scoring time. Export must not
    // reconstruct a claimed captured contribution from subsequently edited data.
    if (key === "midrangeSpacing") {
      const mix = exactMixContribution(critique);
      entry.postClientMixDenominator = mix.denominator;
      entry.postClientMixEffectiveWeight = mix.effectiveWeight;
      entry.postClientMixContribution = mix.contribution;
    }
  }
  // Optional diagnostic observer must never block existing client score stages.
  try { captureAuralisPenaltyInventoryAfterClient(critique); } catch { /* fail closed */ }
}

/** The worksheet may be downloaded publicly: NEVER render raw model commentary. */
export function getA2ScoringProvenanceRows(critique: any): A2DiagnosticRow[] {
  const call1 = critique?.subMetricsCall1;
  const raw = call1?.a2ScoringProvenance;
  const live = critique?.liveMetrics;
  const finish = critique?.productionFinishEvidence;
  const mixEvidence = critique?.mixBalanceEvidence;
  const rows: A2DiagnosticRow[] = [];
  const add = (section: string, field: string, value: number | string) =>
    rows.push({ section, field, value });

  for (const key of ["spaceAndDensity", "midrangeSpacing"]) {
    const label = key === "spaceAndDensity" ? "A2 Space & Density" : "A2 Midrange Spacing";
    const entry = raw?.[key];
    const item = call1?.[key];
    const isSpace = key === "spaceAndDensity";
    const pre = entry?.preClientScore;
    const post = entry?.postClientScore;
    // A completed stage requires a positive marker emitted by captureA2AfterClient.
    // An undefined field never proves that the browser ran.
    const browserStage = entry?.browserScoringStage === "COMPLETED" ? "COMPLETED"
      : entry?.browserScoringStage === "BROWSER_DSP_UNAVAILABLE" ? "BROWSER_DSP_UNAVAILABLE"
      : "NOT_CAPTURED";
    // In the absence of a live browser stage, the only valid historical value is
    // the immutable server snapshot. Never invent a legacy A2 scoring event.
    const mixInputs = entry
      ? browserStage === "COMPLETED"
        ? { denominator: entry.postClientMixDenominator ?? null,
            effectiveWeight: entry.postClientMixEffectiveWeight ?? null,
            contribution: entry.postClientMixContribution ?? null }
        : { denominator: entry.serverMixDenominator ?? null,
            effectiveWeight: entry.serverMixEffectiveWeight ?? null,
            contribution: entry.serverMixContribution ?? null }
      : { denominator: null, effectiveWeight: null, contribution: null };
    const denominator = isSpace ? entry?.productionDenominator : mixInputs.denominator;
    const effectiveWeight = isSpace ? entry?.productionEffectiveWeight : mixInputs.effectiveWeight;
    const trueContribution = isSpace ? entry?.productionContribution : mixInputs.contribution;
    const serverMix = entry?.serverMixContribution;
    const knownInapplicable = !isSpace && item?.applicable === false;

    add(label, "A2 capture", entry ? "PRESENT" : "NOT_CAPTURED (legacy report or Call 1 unavailable)");
    add(label, "Raw Gemini qualityTier/commentary access", entry?.rawEvidenceAccess || (entry ? "NOT_CAPTURED" : "NOT_CAPTURED"));
    add(label, "Internal evidence reference (requires server token)", textOrMissing(raw?.internalEvidenceId));
    add(label, "Original raw Gemini commentary in ordinary export",
      entry?.rawEvidenceAccess === "RESTRICTED_INTERNAL_ONLY"
        ? "REDACTED — available only from token-protected server evidence vault"
        : "NOT_CAPTURED");
    add(label, "Model-selected qualityTier (existing public metric)", textOrMissing(item?.qualityTier));
    add(label, "Canonical mapped score before server caps", numberOrMissing(entry?.canonicalMappedScore));
    add(label, "Server-side cap", isSpace
      ? finite(entry?.serverCap) ? entry.serverCap : entry && entry.serverCap === null ? "NONE" : "NOT_CAPTURED"
      : entry ? "NOT_APPLICABLE" : "NOT_CAPTURED");
    add(label, "Server-side cap reason", isSpace ? textOrMissing(entry?.serverCapReason) : entry ? "NOT_APPLICABLE" : "NOT_CAPTURED");
    add(label, "Pre-client score after server reconciliation", numberOrMissing(pre));
    add(label, "Post-client child score", numberOrMissing(post));
    add(label, "Browser scoring stage", browserStage);
    add(label, "Client cap reason", textOrMissing(entry?.clientCapReason));
    add(label, "Selected client cap (even when unapplied)",
      finite(entry?.clientCapCandidate) ? entry.clientCapCandidate
        : entry?.clientCapReason === "NONE" ? "NONE" : "NOT_CAPTURED");
    add(label, "Applied client cap", finite(entry?.clientCapLimit)
      ? entry.clientCapLimit : entry?.clientCapReason === "NONE" ? "NONE"
      : entry?.clientCapReason === "BROWSER_DSP_UNAVAILABLE" ? "NOT_CAPTURED" : "NOT_CAPTURED");
    add(label, "Current score shown in report", numberOrMissing(item?.score));
    add(label, "Metric applicability", !item ? "NOT_CAPTURED" : item.applicable === false ? "false" : "true");

    add(label, "Actual aggregation denominator (weight units)", numberOrMissing(denominator));
    add(label, "Effective aggregate weight (%; computed from exact ratio)",
      knownInapplicable ? "NOT_APPLICABLE"
        : finite(effectiveWeight) ? roundTo(effectiveWeight) : "NOT_CAPTURED");
    add(label, "Exact pre-round weighted contribution (points)",
      knownInapplicable ? "NOT_APPLICABLE"
        : finite(trueContribution) ? roundTo(trueContribution) : "NOT_CAPTURED");
    add(label, "Contribution provenance", !entry
      ? "NOT_CAPTURED (legacy report; A2 ledger absent)"
      : isSpace ? "CAPTURED_SERVER_ORIGINAL"
      : browserStage === "COMPLETED"
        ? finite(entry.postClientMixDenominator)
          ? "CAPTURED_POST_CLIENT"
          : "NOT_CAPTURED (post-client aggregation snapshot absent)"
      : browserStage === "BROWSER_DSP_UNAVAILABLE" ? "CAPTURED_SERVER_ONLY_BROWSER_UNAVAILABLE"
      : finite(entry.serverMixDenominator) ? "CAPTURED_SERVER_ONLY_BROWSER_NOT_CAPTURED"
      : "NOT_CAPTURED (no server or browser aggregation snapshot)");
    if (isSpace) {
      add(label, "Contribution basis", "SERVER ORIGINAL AGGREGATION (not recomputed from post-client score)");
      add(label, "Server weighted mean before rounding", numberOrMissing(entry?.productionWeightedMean));
      add(label, "Server original parent score after ceiling", numberOrMissing(entry?.serverProductionParentScore));
      add(label, "Final Production Index after browser penalties", numberOrMissing(critique?.scores?.overallProduction));
      add(label, "Post-client child change not necessarily reflected in Production Index",
        finite(pre) && finite(post) && pre !== post ? "YES — inspect original parent and final parent separately" : "NO_OR_UNAVAILABLE");
      add(label, "DSP relative finish mid/sub/air (%)",
        [live?.calculatedFinishMidPct, live?.calculatedFinishSubPct, live?.calculatedFinishAirPct]
          .map(v => numberOrMissing(v)).join(" / "));
      add(label, "DSP crest factor (dB)", numberOrMissing(live?.calculatedCrestFactorDb));
      add(label, "Finish evidence summary", textOrMissing(finish?.summary));
      add(label, "Finish ceiling", finite(finish?.ceiling) ? finish.ceiling : finish?.ceiling === null ? "NONE" : "NOT_CAPTURED");
    } else {
      add(label, "Contribution basis", browserStage === "COMPLETED"
        ? finite(entry?.postClientMixDenominator)
          ? "FROZEN POST-CLIENT MIX AGGREGATION BEFORE PARENT CEILING"
          : "POST-CLIENT MIX NOT_CAPTURED (no frozen snapshot)"
        : browserStage === "BROWSER_DSP_UNAVAILABLE"
          ? "SERVER MIX INPUTS ONLY (BROWSER UNAVAILABLE)"
          : "SERVER MIX INPUTS ONLY (BROWSER STAGE NOT CAPTURED)");
      add(label, "Server Mix Balance contribution before browser correction", numberOrMissing(serverMix));
      add(label, "Final Mix Balance score after browser corrections", numberOrMissing(critique?.mixQuality?.score));
      add(label, "DSP midrange flatness", numberOrMissing(live?.calculatedMidrangeFlatness));
      add(label, "DSP midrange flux", numberOrMissing(live?.calculatedMidrangeFlux));
      add(label, "DSP low-mid/core-mid energy", [live?.calculatedLowMidsBandEnergy, live?.calculatedCoreMidsBandEnergy]
        .map(v => numberOrMissing(v)).join(" / "));
      add(label, "Browser Mix Balance evidence summary", textOrMissing(mixEvidence?.summary));
    }
    add(label, "Contribution interpretation",
      "Unrounded score × original integer weight / actual applicable denominator. Parent rounding, finish ceilings and penalties can change the final parent.");
  }


  // Numeric-only existing decision snapshots; never export raw Gemini text.
  const spectral = raw?.spectralMatch;
  const spectralLabel = "A2 Spectral Match";
  const spectralMetric = call1?.spectralMatch;
  const spectralInapplicable = spectralMetric?.applicable === false;
  const spectralValue = (value: unknown): number | string =>
    spectralInapplicable ? "NOT_APPLICABLE" : numberOrMissing(value);
  const capCandidate = (value: unknown, status: unknown): number | string =>
    spectralInapplicable ? "NOT_APPLICABLE" :
      finite(value) ? value : status === "CAPTURED" || status === "COMPLETED"
        ? "NONE" : "NOT_CAPTURED";
  const capApplied = (value: unknown): string =>
    spectralInapplicable ? "NOT_APPLICABLE" :
      value === true ? "YES" : value === false ? "NO" : "NOT_CAPTURED";
  add(spectralLabel, "A2 capture", spectral ? "PRESENT" : "NOT_CAPTURED");
  add(spectralLabel, "Metric applicability", !spectralMetric ? "NOT_CAPTURED" :
    spectralInapplicable ? "false" : "true");
  add(spectralLabel, "Canonical mapped score before server caps",
    spectralValue(spectral?.canonicalMappedScore));
  add(spectralLabel, "Server scoring stage", spectral?.serverSpectralStatus ?? "NOT_CAPTURED");
  add(spectralLabel, "Server finish cap candidate",
    capCandidate(spectral?.serverFinishCapCandidate, spectral?.serverSpectralStatus));
  add(spectralLabel, "Server finish cap applied", capApplied(spectral?.serverFinishCapApplied));
  add(spectralLabel, "Server cap reason", textOrMissing(spectral?.serverFinishCapReason));
  add(spectralLabel, "Post-server score", spectralValue(spectral?.serverScoreAfterFinishCap));
  add(spectralLabel, "Pre-client score", spectralValue(spectral?.preClientScore));
  add(spectralLabel, "Browser spectral stage", spectral?.browserSpectralStatus ?? "NOT_CAPTURED");
  add(spectralLabel, "Browser spectral cap candidate",
    capCandidate(spectral?.browserSpectralCapCandidate, spectral?.browserSpectralStatus));
  add(spectralLabel, "Browser spectral cap applied", capApplied(spectral?.browserSpectralCapApplied));
  add(spectralLabel, "Browser spectral cap reason", textOrMissing(spectral?.browserSpectralCapReason));
  add(spectralLabel, "Post-browser spectral cap score",
    spectralValue(spectral?.afterSpectralCapScore));
  add(spectralLabel, "Browser finish stage", spectral?.browserFinishStatus ?? "NOT_CAPTURED");
  add(spectralLabel, "Browser finish cap candidate",
    capCandidate(spectral?.browserFinishCapCandidate, spectral?.browserFinishStatus));
  add(spectralLabel, "Browser finish cap applied", capApplied(spectral?.browserFinishCapApplied));
  add(spectralLabel, "Browser finish cap reason", textOrMissing(spectral?.browserFinishCapReason));
  add(spectralLabel, "Post-browser finish score",
    spectralValue(spectral?.afterFinishCeilingScore));
  add(spectralLabel, "Final captured score", spectralValue(spectral?.finalScore));
  add(spectralLabel, "Current score shown in report", spectralValue(spectralMetric?.score));

  // Diagnostic-only weight-path disclosure. Formula values are not song
  // judgments or an inferred historical browser pass. Only frozen A2 snapshots
  // authorize the actual midrange denominator; never reconstruct a legacy
  // contribution from mutable post-export child scores.
  const midTrace = raw?.midrangeSpacing;
  const spaceTrace = raw?.spaceAndDensity;
  const hasA2Trace = Boolean(midTrace || spaceTrace);
  const midStage = midTrace?.browserScoringStage;
  const midFrozenDenominator = midStage === "COMPLETED"
    ? midTrace?.postClientMixDenominator
    : midTrace?.serverMixDenominator;
  const denominatorValid = finite(midFrozenDenominator) && midFrozenDenominator > 0;
  const midApplicable = call1?.midrangeSpacing?.applicable !== false;
  const midEffective = midApplicable && denominatorValid
    ? 100 * 25 / midFrozenDenominator : null;
  const label = "A2 Parent Weight Paths";
  add(label, "Diagnostic record scope",
    hasA2Trace ? "FORMULA_ONLY_PLUS_CAPTURED_A2_INPUTS" : "NOT_CAPTURED (legacy/non-A2)");
  add(label, "Production Index input weights (%)",
    "AESTHETIC_DESIGN_40; SPACE_AND_DENSITY_35; PALETTE_COHESION_25");
  add(label, "Spectral Match direct weight in Production Index (%)", 0);
  add(label, "Midrange Spacing direct weight in Production Index (%)", 0);
  add(label, "Spectral Match nominal weight in Engagement Power (%)", 10);
  add(label, "Engagement Power direct weight in Streaming Readiness (%)", 30);
  add(label, "Spectral Match direct path to Streaming Readiness (%)", 3);
  add(label, "Streaming Readiness completion proxy caveat",
    "Engagement Power also enters a nonlinear/rounded completion proxy; 3% is direct-path weight only, not total sensitivity");
  add(label, "Mix Balance direct weight in Sonic Soundprint (%)", 50);
  add(label, "Midrange effective Mix Balance weight from frozen A2 denominator (%)",
    !midTrace || !denominatorValid ? "NOT_CAPTURED"
      : !midApplicable ? "NOT_APPLICABLE" : roundTo(midEffective!));
  add(label, "Midrange conditional Sonic Soundprint path via Mix Balance (%)",
    !midTrace || !denominatorValid ? "NOT_CAPTURED"
      : !midApplicable ? "NOT_APPLICABLE" : roundTo(midEffective! * 0.50));
  add(label, "Frozen Mix Balance denominator (weight units)",
    !midTrace || !denominatorValid ? "NOT_CAPTURED" : midFrozenDenominator);
  add(label, "Mix Balance denominator provenance",
    !midTrace ? "NOT_CAPTURED"
      : midStage === "COMPLETED" && denominatorValid ? "CAPTURED_POST_CLIENT"
      : midStage === "COMPLETED" ? "NOT_CAPTURED (missing frozen post-client denominator)"
      : midStage === "BROWSER_DSP_UNAVAILABLE" ? "SERVER_ONLY_BROWSER_UNAVAILABLE"
      : denominatorValid ? "SERVER_ONLY_BROWSER_NOT_CAPTURED" : "NOT_CAPTURED");
  add(label, "Interpretation",
    "Weight paths illustrate dilution under fixed other inputs; score rounding, N/A renormalization, production finish caps, and other child changes prevent direct causal attribution to a single component");
  return rows;
}

/** The normal report and the offline workbook test share this exact append path. */
export function appendA2ProvenanceToSourceDiagnostics(
  worksheet: { addRow: (record: A2DiagnosticRow) => { alignment: any; height: number } },
  critique: any,
): void {
  for (const evidence of getA2ScoringProvenanceRows(critique)) {
    const row = worksheet.addRow(evidence);
    row.alignment = { vertical: "top", wrapText: true };
    if (evidence.field.includes("commentary")) row.height = 65;
  }
}
