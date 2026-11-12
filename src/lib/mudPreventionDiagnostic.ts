// Beta scoring contract. Historical critiques without this version retain their
// original Mud Prevention score and parent totals when opened or exported.
export const MUD_DIAGNOSTIC_SCORING_VERSION = "scoring-tier-v8-mud-diagnostic";
export const MUD_DIAGNOSTIC_STATUS = "DIAGNOSTIC_ONLY";

export function isMudDiagnosticCritique(critique: any): boolean {
  return critique?.productionScoringVersion === MUD_DIAGNOSTIC_SCORING_VERSION ||
    critique?.subMetricsCall1?.mudPrevention?.scoringStatus === MUD_DIAGNOSTIC_STATUS;
}

export function markMudPreventionDiagnosticOnly(critique: any): void {
  const mud = critique?.subMetricsCall1?.mudPrevention;
  if (!mud) return;
  mud.scoringStatus = MUD_DIAGNOSTIC_STATUS;
  mud.score = null; // No numeric Mud Prevention score in newly generated critiques.
}

export function computeMixBalanceScore(call1: any, excludeMud: boolean): number | null {
  if (!call1) return null;
  const parts: Array<[any, number]> = [
    ...(excludeMud ? [] : [[call1.mudPrevention, 25] as [any, number]]),
    [call1.midrangeSpacing, 25],
    [call1.lowEndDivision, 20],
    [call1.sibilanceShaving, 15],
    [call1.stereoWidth, 15],
  ];
  const scored = parts.filter(([metric]) => metric?.applicable !== false &&
    typeof metric?.score === "number" && Number.isFinite(metric.score));
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round(scored.reduce((sum, [metric, weight]) => sum + metric.score * weight, 0) / total);
}

// The visible weights must reflect existing N/A decisions, not just the
// nominal 75-point denominator of an all-applicable beta report.
export function getMixBalanceEffectiveWeight(
  call1: any,
  key: "midrangeSpacing" | "lowEndDivision" | "sibilanceShaving" | "stereoWidth",
): number | null {
  if (!call1) return null;
  const parts: Array<[string, number]> = [
    ["midrangeSpacing", 25],
    ["lowEndDivision", 20],
    ["sibilanceShaving", 15],
    ["stereoWidth", 15],
  ];
  const applicable = parts.filter(([field]) => call1[field]?.applicable !== false &&
    typeof call1[field]?.score === "number" && Number.isFinite(call1[field].score));
  const part = applicable.find(([field]) => field === key);
  if (!part) return null;
  const total = applicable.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round((part[1] / total) * 1000) / 10;
}


// Stage 3A research-only candidate. It is intentionally NOT called by App/server.
// No calibrated thresholds are shipped: omission of an explicit synthetic policy
// always ABSTAINS. This module never mutates a critique or assigns a live score.
export type AuralisSpectralShadowResult =
  | {status:"ABSTAIN"; reason:string; scoringImpact:"NONE"}
  | {status:"PROPOSED_CAP"; scoringImpact:"NONE"; proposedCap:79|71;
      existingScore:number; hypotheticalScore:number; lowMidToMidDb:number;
      projectedCommercialReadiness:number|null; projectedCommercialDelta:number|null;
      calibration:"SYNTHETIC_TEST_ONLY_NOT_VALIDATED"};

export function evaluateAuralisSpectralShadowCandidate(
  summary:unknown,
  existingScore:number,
  policy?:{calibration:"SYNTHETIC_TEST_ONLY_NOT_VALIDATED";
    limitedLowMidToMidDb:number; materialLowMidToMidDb:number},
  commercial?:{hook:number; dynamicVariety:number; sectionalContrast:number},
):AuralisSpectralShadowResult {
  const abstain=(reason:string):AuralisSpectralShadowResult=>({status:"ABSTAIN",reason,scoringImpact:"NONE"});
  // No calibrated production policy exists. This is not a production toggle.
  if(!policy || policy.calibration!=="SYNTHETIC_TEST_ONLY_NOT_VALIDATED")
    return abstain("NO_CALIBRATED_POLICY");
  const finite=(x:unknown):x is number=>typeof x==="number"&&Number.isFinite(x);
  if(!finite(policy.limitedLowMidToMidDb)||!finite(policy.materialLowMidToMidDb)||
      policy.materialLowMidToMidDb<=policy.limitedLowMidToMidDb)
    return abstain("INVALID_SYNTHETIC_THRESHOLDS");
  if(!finite(existingScore)||existingScore<0||existingScore>100)
    return abstain("INVALID_EXISTING_SCORE");

  const s=summary as any;
  const p=s?.sourceProvenance,profile=s?.spectralProfile;
  const edges=[20,60,250,500,2000,6000,11000,20000];
  if(s?.schemaVersion!=="stage2i2-local-song-summary-v1"||s?.scoringImpact!=="NONE"||
     (!Array.isArray(p?.methods)||p.methods.join(",")!=="stage2a-hann-fft-power-v1,stage2b1-low-frame-power-v1,stage2b2-band-stereo-v1")||
     p?.window!=="periodic-hann"||
     p?.spectralNormalization!=="one-sided-parseval-sum-window-squared"||
     p?.fftSize!==4096||p?.hopSize!==2048||
     p?.numericBandPowerFloor!==1e-12||
     !Number.isSafeInteger(p?.sampleRate)||p.sampleRate<8000||p.sampleRate>192000||
     ![1,2].includes(p?.channelCount)||
     !Number.isSafeInteger(p?.inputSampleCount)||p.inputSampleCount<4096||
     !Number.isSafeInteger(p?.representedSampleCount)||p.representedSampleCount<4096||
     !Number.isSafeInteger(p?.omittedTrailingSampleCount)||p.omittedTrailingSampleCount<0||
     !Number.isSafeInteger(p?.zeroPaddedSampleCount)||p.zeroPaddedSampleCount<0||
     p.representedSampleCount+p.omittedTrailingSampleCount!==p.inputSampleCount||
     p.inputSampleCount*p.channelCount*4>128*1024*1024||
     profile?.schemaVersion!=="stage2j1-spectral-profile-v1"||
     profile?.method!=="stage2a-hann-fft-power-v1"||
     profile?.units!=="mean-square-full-scale-pcm"||
     profile?.sampleRate!==p.sampleRate||profile?.channelCount!==p.channelCount||
     profile?.fftSize!==4096||profile?.hopSize!==2048||
     profile?.representedSampleCount!==p.representedSampleCount||
     profile?.omittedTrailingSampleCount!==p.omittedTrailingSampleCount||
     profile?.zeroPaddedSampleCount!==p.zeroPaddedSampleCount||
     !Number.isSafeInteger(profile?.frames)||profile.frames<1||
     !Array.isArray(profile?.bands)||profile.bands.length!==7)
    return abstain("INVALID_OR_INCOMPATIBLE_SPECTRAL_PROVENANCE");
  const powers:number[]=[];
  for(let i=0;i<7;i++){
    const b=profile.bands[i];
    if(!b||!Array.isArray(b.bandHz)||b.bandHz.length!==2||
       b.bandHz[0]!==edges[i]||b.bandHz[1]!==edges[i+1]||
       b.status!=="AVAILABLE"||!Array.isArray(b.channelPower)||
       b.channelPower.length!==p.channelCount||
       b.channelPower.some((x:unknown)=>!finite(x)||x<0))
      return abstain("INCOMPLETE_OR_UNAVAILABLE_SPECTRAL_BAND");
    powers.push(b.channelPower.reduce((v:number,x:number)=>v+x,0)/p.channelCount);
  }
  // 60–250 Hz relative to 250–500 Hz; not a quality verdict.
  if(powers[1]<=1e-12||powers[2]<=1e-12)
    return abstain("LOW_ENERGY_OR_UNSTABLE_RATIO");
  const ratio=10*Math.log10(powers[1]/powers[2]);
  const cap=ratio>=policy.materialLowMidToMidDb?71:
    ratio>=policy.limitedLowMidToMidDb?79:null;
  if(cap===null||existingScore<=cap)return abstain("NO_ELIGIBLE_DOWNWARD_CAP");
  let projectedCommercialReadiness:number|null=null;
  let projectedCommercialDelta:number|null=null;
  if(commercial && [commercial.hook,commercial.dynamicVariety,commercial.sectionalContrast]
      .every(x=>finite(x)&&x>=0&&x<=100)){
    const weighted=(score:number)=>Math.round(
      (commercial.hook*60+commercial.dynamicVariety*20+score*10+
       commercial.sectionalContrast*10)/100);
    projectedCommercialReadiness=weighted(cap);
    projectedCommercialDelta=weighted(cap)-weighted(existingScore);
  }
  return {status:"PROPOSED_CAP",scoringImpact:"NONE",proposedCap:cap,
    existingScore,hypotheticalScore:Math.min(existingScore,cap),
    lowMidToMidDb:ratio,projectedCommercialReadiness,projectedCommercialDelta,
    calibration:"SYNTHETIC_TEST_ONLY_NOT_VALIDATED"};
}

 
// Stage 3D-1: compact diagnostic evidence adapter. It never mutates a score,
// assigns a cap, or overrides a tier. A separate approved Stage 3D-2 policy
// would be required to authorize numerical influence.
export const AURALIS_ENGINEERING_ADAPTER_VERSION = "auralis-stage3d1-evidence-v1";
export const AURALIS_ENGINEERING_SCORE_POLICY = "DISABLED_PENDING_STAGE_3D_2";

export function prepareAuralisEngineeringEvidence(diagnostic: unknown): {
  schemaVersion: string;
  scoringImpact: "NONE";
  scoringAdapter: {version: string; status: typeof AURALIS_ENGINEERING_SCORE_POLICY; adjustments: []};
  observations: string[];
  metrics: {lowToUpperDb: number; stereoEvidenceStatus: "MEASURED_NOT_GRADED"};
} | null {
  const d = diagnostic as any;
  const p = d?.evidence?.sourceProvenance;
  const profile = d?.spectralProfile;
  if(d?.status !== "AVAILABLE" || d?.evidence?.scoringImpact !== "NONE" ||
     profile?.scoringImpact !== "NONE" ||
     profile?.schemaVersion !== "stage2j1-spectral-profile-v1" ||
     profile?.units !== "mean-square-full-scale-pcm" ||
     p?.sampleRate !== profile.sampleRate ||
     p?.channelCount !== profile.channelCount ||
     ![1,2].includes(p?.channelCount) ||
     !Array.isArray(profile?.bands) || profile.bands.length !== 7 ||
     profile?.window !== undefined && profile.window !== "periodic-hann")
    return null;
  const edges = [20,60,250,500,2000,6000,11000,20000];
  const power: number[] = [];
  for(let i=0;i<7;i++){
    const band = profile.bands[i];
    if(band?.status !== "AVAILABLE" || band?.bandHz?.[0] !== edges[i] ||
       band?.bandHz?.[1] !== edges[i+1] ||
       !Array.isArray(band.channelPower) || band.channelPower.length !== p.channelCount ||
       band.channelPower.some((v: unknown) => typeof v !== "number" || !Number.isFinite(v) || v < 0))
      return null;
    power.push(band.channelPower.reduce((a: number,b: number)=>a+b,0)/p.channelCount);
  }
  const upper = power[3]+power[4]+power[5]+power[6];
  if(power[1] <= 1e-12 || upper <= 1e-12)return null;
  const ratio = 10*Math.log10(power[1]/upper);
  if(!Number.isFinite(ratio))return null;
  const meters = d?.referenceMeters;
  const integratedLufs = meters?.schemaVersion === "stage2k-meter-summary-v1" &&
    meters?.scoringImpact === "NONE" ? meters?.measurements?.integratedLufs : null;
  const samplePeakDbfs = meters?.schemaVersion === "stage2k-meter-summary-v1" &&
    meters?.scoringImpact === "NONE" ? meters?.measurements?.samplePeakDbfs : null;
  const masteringNote = typeof integratedLufs === "number" && Number.isFinite(integratedLufs) &&
    typeof samplePeakDbfs === "number" && Number.isFinite(samplePeakDbfs)
      ? `Measured integrated loudness ${integratedLufs.toFixed(1)} LUFS and sample peak ${samplePeakDbfs.toFixed(1)} dBFS. These readings are not a mastering-quality verdict. If the delivered loudness is an intentional production choice, it may not require correction.`
      : null;
  return {
    schemaVersion: AURALIS_ENGINEERING_ADAPTER_VERSION,
    scoringImpact: "NONE",
    scoringAdapter: {version: AURALIS_ENGINEERING_ADAPTER_VERSION,
      status: AURALIS_ENGINEERING_SCORE_POLICY, adjustments: []},
    metrics: {lowToUpperDb: Math.round(ratio*100)/100, stereoEvidenceStatus: "MEASURED_NOT_GRADED"},
    observations: [
      `Measured 60–250 Hz energy relative to 500–20,000 Hz: ${ratio.toFixed(2)} dB. This is descriptive spectral balance, not proof of masking, muddiness or a mix defect. If this is an intentional production choice, no correction may be necessary.`,
      "Auralis measured stereo engineering evidence, but this release does not infer a Stereo Width defect or change its score from those measurements. If the stereo presentation is intentional, review mono compatibility by listening before making changes.",
      ...(masteringNote ? [masteringNote] : []),
    ]
  };
}



/** Independent, score-inert identity status adapter. It does not depend on
 * spectral interpretation or expose any cryptographic digest to public reports.
 */
export function prepareAuralisSourceLineage(diagnostic:unknown): {
  status:"VERIFIED";scoringImpact:"NONE";sourceFormat:string;sourceRateStatus:string;
  sourceSampleRate:number|null;decodedSampleRate:number;workerSampleRate:number;
  decodedChannels:number;workerChannels:number;decodedSamples:number;workerSamples:number;
  rateRelationship:string;encodedSha256Status:"CAPTURED_PRIVATE";pcmIdentityStatus:"VERIFIED";
} | null {
  const d=diagnostic as any,i=d?.identity,p=d?.evidence?.sourceProvenance;
  const hash=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
  if(d?.status!=="AVAILABLE"||d?.evidence?.scoringImpact!=="NONE"||
     i?.status!=="VERIFIED"||!hash(i.encodedSha256)||
     !Array.isArray(i.decodedChannelSha256)||
     !Array.isArray(i.workerChannelSha256)||
     ![1,2].includes(p?.channelCount)||
     i.decodedChannelSha256.length!==p.channelCount||
     i.workerChannelSha256.length!==p.channelCount||
     !i.decodedChannelSha256.every((h:unknown,n:number)=>hash(h)&&h===i.workerChannelSha256[n])||
     i.decodedSampleRate!==p.sampleRate||i.workerSampleRate!==p.sampleRate||
     i.decodedChannels!==p.channelCount||i.workerChannels!==p.channelCount||
     i.decodedSamples!==p.inputSampleCount||i.workerSamples!==p.inputSampleCount||
     !Number.isSafeInteger(i.decodedSamples)||i.decodedSamples<1||
     !Number.isSafeInteger(i.encodedBytes)||i.encodedBytes<1||
     !["WAV_PCM","WAV_FLOAT","UNVERIFIED"].includes(i.sourceFormat)||
     !["VERIFIED_WAV_HEADER","UNVERIFIED"].includes(i.sourceRateStatus)||
     (i.sourceRateStatus==="UNVERIFIED"&&i.sourceSampleRate!==null)||
     (i.sourceRateStatus==="VERIFIED_WAV_HEADER"&&
      (!Number.isSafeInteger(i.sourceSampleRate)||
       i.sourceSampleRate<8000||i.sourceSampleRate>192000))||
     i.rateRelationship!==(i.sourceSampleRate===null?"SOURCE_RATE_UNVERIFIED":
       i.sourceSampleRate===p.sampleRate?"SAME_RATE":"DECODED_RATE_DIFFERENT"))
    return null;
  return {status:"VERIFIED",scoringImpact:"NONE",sourceFormat:i.sourceFormat,
    sourceRateStatus:i.sourceRateStatus,sourceSampleRate:i.sourceSampleRate,
    decodedSampleRate:i.decodedSampleRate,workerSampleRate:i.workerSampleRate,
    decodedChannels:i.decodedChannels,workerChannels:i.workerChannels,
    decodedSamples:i.decodedSamples,workerSamples:i.workerSamples,
    rateRelationship:i.rateRelationship,encodedSha256Status:"CAPTURED_PRIVATE",
    pcmIdentityStatus:"VERIFIED"};
}


// Lean Auralis Spectral Match integration trial: a single bounded, downward-only
// candidate. This does NOT authorize a production threshold or change any score.
// The caller must explicitly enable the trial AND supply a pre-frozen threshold.
export const AURALIS_SPECTRAL_TRIAL_CAP = 79 as const;
export function selectAuralisSpectralTrialCap(
  engineering: unknown,
  enabled: boolean,
  frozenThresholdDb: number | null,
): 79 | null {
  if (!enabled || frozenThresholdDb === null ||
      !Number.isFinite(frozenThresholdDb)) return null;
  const e = engineering as any;
  if (e?.schemaVersion !== AURALIS_ENGINEERING_ADAPTER_VERSION ||
      e?.scoringImpact !== "NONE" ||
      e?.scoringAdapter?.status !== AURALIS_ENGINEERING_SCORE_POLICY ||
      !Array.isArray(e?.scoringAdapter?.adjustments) ||
      e.scoringAdapter.adjustments.length !== 0 ||
      !Number.isFinite(e?.metrics?.lowToUpperDb)) return null;
  return e.metrics.lowToUpperDb > frozenThresholdDb
    ? AURALIS_SPECTRAL_TRIAL_CAP : null;
}

// Stage 3D-2A: isolated, read-only reconciliation of the EXISTING browser caps.
// This function is deliberately not imported by App/server/report export. It
// makes no cap proposals: Auralis spectrum ratios are descriptive and there
// is no validated production threshold or evidence of perceptual masking.
export const AURALIS_RECONCILIATION_VERSION = "auralis-stage3d2a-shadow-v1";
export type AuralisCapReconciliation =
  | {status:"ABSTAIN"; reason:string; scoringImpact:"NONE"; adjustments:[]}
  | {status:"COMPARED"; scoringImpact:"NONE"; adjustments:[];
      schemaVersion:typeof AURALIS_RECONCILIATION_VERSION;
      lowToUpperDb:number;
      metrics:{
        spectralMatch:{status:"CAP_PRESENT_EFFECT_UNVERIFIED"|"NO_EXISTING_CAP"|"NOT_APPLICABLE";
          score:number|null; existingCap:number|null};
        midrangeSpacing:{status:"CAP_PRESENT_EFFECT_UNVERIFIED"|"NO_EXISTING_CAP"|"NOT_APPLICABLE";
          score:number|null; existingCap:number|null};
      };
      interpretation:string};

export function reconcileAuralisExistingMixCapsShadow(
  diagnostic:unknown,
  critique:unknown,
):AuralisCapReconciliation {
  const abstain=(reason:string):AuralisCapReconciliation=>({
    status:"ABSTAIN",reason,scoringImpact:"NONE",adjustments:[]});
  const d=diagnostic as any, c=critique as any;
  // Require the current-version critique; archived scoring and incomplete
  // score paths must never be silently reinterpreted.
  if(c?.productionScoringVersion!==MUD_DIAGNOSTIC_SCORING_VERSION)
    return abstain("HISTORICAL_OR_UNKNOWN_SCORING_VERSION");
  const p=d?.evidence?.sourceProvenance, s=d?.spectralProfile;
  if(d?.status!=="AVAILABLE"||d?.evidence?.scoringImpact!=="NONE"||
     (!Array.isArray(p?.methods)||p.methods.join(",")!=="stage2a-hann-fft-power-v1,stage2b1-low-frame-power-v1,stage2b2-band-stereo-v1")||
     p?.window!=="periodic-hann"||
     p?.spectralNormalization!=="one-sided-parseval-sum-window-squared"||
     p?.fftSize!==4096||p?.hopSize!==2048||
     p?.numericBandPowerFloor!==1e-12||
     !Number.isSafeInteger(p?.sampleRate)||p.sampleRate<8000||p.sampleRate>192000||
     ![1,2].includes(p?.channelCount)||
     !Number.isSafeInteger(p?.inputSampleCount)||p.inputSampleCount<4096||
     !Number.isSafeInteger(p?.representedSampleCount)||p.representedSampleCount<4096||
     !Number.isSafeInteger(p?.omittedTrailingSampleCount)||p.omittedTrailingSampleCount<0||
     !Number.isSafeInteger(p?.zeroPaddedSampleCount)||p.zeroPaddedSampleCount<0||
     p.representedSampleCount+p.omittedTrailingSampleCount!==p.inputSampleCount||
     p.inputSampleCount*p.channelCount*4>128*1024*1024||
     s?.method!=="stage2a-hann-fft-power-v1"||
     s?.fftSize!==p.fftSize||s?.hopSize!==p.hopSize||
     s?.representedSampleCount!==p.representedSampleCount||
     s?.omittedTrailingSampleCount!==p.omittedTrailingSampleCount||
     s?.zeroPaddedSampleCount!==p.zeroPaddedSampleCount||
     !Number.isSafeInteger(s?.frames)||s.frames<1)
    return abstain("UNVERIFIED_WORKER_PROVENANCE");
  // Reuse Stage 3D-1's independent spectral-band and channel validation.
  const evidence=prepareAuralisEngineeringEvidence(diagnostic);
  if(!evidence||!Number.isFinite(evidence.metrics.lowToUpperDb))
    return abstain("INVALID_OR_UNAVAILABLE_AURALIS_EVIDENCE");
  const current=c?.subMetricsCall1, caps=c?.mixBalanceEvidence;
  if(!current||!caps||typeof caps!=="object")
    return abstain("MISSING_EXISTING_SCORING_EVIDENCE");
  const finiteScore=(v:unknown):v is number=>
    typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
  const reconcile=(key:"spectralMatch"|"midrangeSpacing",
      capKey:"spectralCap"|"midrangeCap")=>{
    const metric=current[key], cap=caps[capKey];
    if(cap!==null&&!finiteScore(cap))return null;
    if(metric?.applicable===false)
      return {status:"NOT_APPLICABLE" as const,score:null,existingCap:null};
    if(!finiteScore(metric?.score))return null;
    // A final score at or below the cap does not prove the cap reduced it:
    // we lack the uncapped score. Record cap presence, not application.
    // A final score above the cap is inconsistent and must abstain.
    if(cap!==null&&metric.score>cap)return null;
    return {status:(cap===null?"NO_EXISTING_CAP":"CAP_PRESENT_EFFECT_UNVERIFIED") as
      "NO_EXISTING_CAP"|"CAP_PRESENT_EFFECT_UNVERIFIED",
      score:metric.score as number,existingCap:cap as number|null};
  };
  const spectralMatch=reconcile("spectralMatch","spectralCap");
  const midrangeSpacing=reconcile("midrangeSpacing","midrangeCap");
  if(!spectralMatch||!midrangeSpacing)return abstain("INCONSISTENT_EXISTING_CAPS_OR_APPLICABILITY");
  return {
    status:"COMPARED",scoringImpact:"NONE",adjustments:[],
    schemaVersion:AURALIS_RECONCILIATION_VERSION,
    lowToUpperDb:evidence.metrics.lowToUpperDb,
    metrics:{spectralMatch,midrangeSpacing},
    interpretation:"Shadow-only comparison of existing browser caps and Auralis spectral evidence. No additional cap, penalty, score change, or masking verdict is warranted by this ratio alone. If the tonal balance is an intentional production choice, no correction may be necessary."
  };
}


// Stage 3D-2C: synthetic-replay calibration evidence gate, NOT a scoring policy.
// No production caller or song calibration; output is descriptive only.
// Real source identity, artistic intent, and pre-cap score lineage cannot be
// inferred from Auralis frequency ratios. Missing proof always ABSTAINS.
export const AURALIS_CALIBRATION_GATE_VERSION="auralis-stage3d2c-synthetic-evidence-v1";
export type AuralisCalibrationGateResult=
  | {status:"ABSTAIN";reason:string;scoringImpact:"NONE";adjustments:[]}
  | {status:"EVIDENCE_ONLY";schemaVersion:typeof AURALIS_CALIBRATION_GATE_VERSION;
      scoringImpact:"NONE";adjustments:[];calibration:"SYNTHETIC_REPLAY_NOT_REAL_SONG_VALIDATION";
      existingChanges:{spectralMatch:number;midrangeSpacing:number;
        mixBalance:number;commercialReadiness:number};
      note:string};

export function evaluateAuralisCalibrationEvidenceGateShadow(
  diagnostic:unknown,critique:unknown,audit:unknown,
):AuralisCalibrationGateResult {
  const abstain=(reason:string):AuralisCalibrationGateResult=>({
    status:"ABSTAIN",reason,scoringImpact:"NONE",adjustments:[]});
  const previous=reconcileAuralisExistingMixCapsShadow(diagnostic,critique);
  if(previous.status!=="COMPARED")return abstain("UNVERIFIED_RECONCILIATION");
  const c=critique as any,a=audit as any,d=diagnostic as any;
  // Synthetic-only contract: never accept missing/unverified resampling lineage
  // or inferred source identity as a basis for numerical calibration.
  const lineage=a?.lineage;
  const rate=d?.evidence?.sourceProvenance?.sampleRate;
  if(a?.captureStatus!=="SYNTHETIC_PRE_POST_REPLAY_ONLY"||
     lineage?.sourceIdentity!=="VERIFIED_SYNTHETIC"||
     lineage?.resampled!==false||
     !Number.isSafeInteger(rate)||
     ![lineage?.sourceSampleRate,lineage?.decodedSampleRate,
       lineage?.workerSampleRate,lineage?.browserSampleRate].every(v=>v===rate))
    return abstain("UNVERIFIED_OR_INCOMPATIBLE_SAMPLE_RATE_LINEAGE");
  // A spectral characteristic is not proof of a defect. An explicitly
  // intentional mix, or unknown listening/intent evidence, stays ungraded.
  if(a?.artisticIntent!=="SYNTHETIC_NONINTENTIONAL_CONTROL")
    return abstain("INTENTIONAL_OR_UNVERIFIED_ARTISTIC_CHOICE");
  // Synthetic penalty inventory must explicitly cover the production-finish
  // ceiling AND both technical-penalty components. An absent field, missing
  // inventory, or disagreement is unknown evidence, never evidence of zero.
  const penalty=a?.penaltyEvidence, finish=c?.productionFinishEvidence;
  const has=(obj:any,key:string):boolean=>
    obj!==null&&typeof obj==="object"&&
    Object.prototype.hasOwnProperty.call(obj,key);
  const penaltyFields=["ceiling","technicalFinishPenalty",
    "dynamicFinishPenalty","brickwallFinishPenalty"] as const;
  if(a?.penaltyCoverage!=="COMPLETE_SYNTHETIC_PENALTY_INVENTORY"||
     !Array.isArray(a?.overlapFamilies)||a.overlapFamilies.length!==0||
     !penalty||typeof penalty!=="object"||
     !finish||typeof finish!=="object"||
     !penaltyFields.every(key=>has(penalty,key)&&has(finish,key))||
     penaltyFields.some(key=>penalty[key]!==finish[key])||
     penalty.ceiling!==null||
     !["technicalFinishPenalty","dynamicFinishPenalty","brickwallFinishPenalty"]
       .every(key=>penalty[key]===0))
    return abstain("OVERLAPPING_OR_UNVERIFIED_PENALTY");
  const finiteScore=(v:unknown):v is number=>
    typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
  const original=a?.preCapScores;
  if(!original||typeof original!=="object")return abstain("MISSING_PRE_CAP_SCORES");
  const final=c?.subMetricsCall1, caps=c?.mixBalanceEvidence;
  if(!final||!caps)return abstain("MISSING_FINAL_SCORING_EVIDENCE");
  // Applicable scores must follow ONLY the already-existing browser cap.
  // This replays old decisions; there are no novel cap limits or quality tiers.
  const replay=(key:"spectralMatch"|"midrangeSpacing",
      capKey:"spectralCap"|"midrangeCap"):number|null=>{
    const current=final[key],before=original[key],cap=caps[capKey];
    if(current?.applicable===false)
      return before===null?0:null;
    if(!finiteScore(before)||!finiteScore(current?.score)||
       (cap!==null&&!finiteScore(cap)))return null;
    const expected=cap===null?before:Math.min(before,cap);
    return expected===current.score?current.score-before:null;
  };
  const spectral=replay("spectralMatch","spectralCap");
  const midrange=replay("midrangeSpacing","midrangeCap");
  if(spectral===null||midrange===null)return abstain("UNCORROBORATED_CAP_APPLICATION");
  const beforeMixChildren={
    ...final,midrangeSpacing:{...final.midrangeSpacing,
      score:final.midrangeSpacing?.applicable===false
        ? final.midrangeSpacing?.score:original.midrangeSpacing},
  };
  const beforeMix=computeMixBalanceScore(beforeMixChildren,true);
  const afterMix=computeMixBalanceScore(final,true);
  if(beforeMix===null||afterMix===null||
     !finiteScore(c?.mixQuality?.score)||c.mixQuality.score!==afterMix)
    return abstain("UNVERIFIED_MIX_PARENT_PROPAGATION");
  // Audit snapshots are not authoritative unless they match the actual
  // child score paths consumed by the browser's Commercial Readiness formula.
  const commercial=a?.commercialChildren;
  if(final.spectralMatch?.applicable===false||!finiteScore(original.spectralMatch))
    return abstain("INAPPLICABLE_COMMERCIAL_SPECTRAL_CHILD");
  const childMetrics=[
    c?.subMetricsCall3?.compositionFlowSubs?.hookPlacement,
    final?.dynamicVariety,
    c?.subMetricsCall3?.compositionFlowSubs?.sectionalContrast
  ];
  if(childMetrics.some(metric=>metric?.applicable===false||
       !finiteScore(metric?.score))||
     ![commercial?.hook,commercial?.dynamicVariety,
       commercial?.sectionalContrast].every(finiteScore)||
     !finiteScore(c?.scores?.commercialReadiness))
    return abstain("MISSING_COMMERCIAL_CHILDREN");
  if(commercial.hook!==childMetrics[0].score||
     commercial.dynamicVariety!==childMetrics[1].score||
     commercial.sectionalContrast!==childMetrics[2].score)
    return abstain("INCONSISTENT_COMMERCIAL_CHILD_LINEAGE");
  const readiness=(spectralScore:number)=>Math.round(
    (commercial.hook*60+commercial.dynamicVariety*20+
      spectralScore*10+commercial.sectionalContrast*10)/100);
  const beforeReadiness=readiness(original.spectralMatch);
  const afterReadiness=readiness(final.spectralMatch.score);
  if(c.scores.commercialReadiness!==afterReadiness)
    return abstain("UNVERIFIED_COMMERCIAL_PARENT_PROPAGATION");
  return {
    status:"EVIDENCE_ONLY",schemaVersion:AURALIS_CALIBRATION_GATE_VERSION,
    scoringImpact:"NONE",adjustments:[],
    calibration:"SYNTHETIC_REPLAY_NOT_REAL_SONG_VALIDATION",
    existingChanges:{spectralMatch:spectral,midrangeSpacing:midrange,
      mixBalance:afterMix-beforeMix,
      commercialReadiness:afterReadiness-beforeReadiness},
    note:"Synthetic replay of already-existing browser caps only. Auralis band power cannot prove masking, a production defect, or a new scoring threshold. Intentional style choices remain ungraded."
  };
}
