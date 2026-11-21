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
     p?.window !== "periodic-hann" ||
     profile?.method !== "stage2a-hann-fft-power-v1" ||
     p?.fftSize !== 4096 || p?.hopSize !== 2048 ||
     profile?.fftSize !== p.fftSize || profile?.hopSize !== p.hopSize ||
     profile?.inputSampleCount !== p.inputSampleCount ||
     profile?.representedSampleCount !== p.representedSampleCount ||
     profile?.omittedTrailingSampleCount !== p.omittedTrailingSampleCount ||
     profile?.zeroPaddedSampleCount !== p.zeroPaddedSampleCount ||
     profile?.frames !== (p.inputSampleCount < 4096 ? 1 :
       1 + Math.floor((p.inputSampleCount - 4096) / 2048)))
    return null;
  // Use the actual Stage2j1SpectralProfile Worker contract: channel-major
  // seven-band power, not the legacy summary's band-major bands[] objects.
  const edges = [20,60,250,500,2000,6000,11000,20000];
  const validPower = (value:unknown):value is number =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  if(!Array.isArray(profile.bandEdgesHz) ||
     profile.bandEdgesHz.length !== edges.length ||
     profile.bandEdgesHz.some((edge:unknown,i:number)=>edge !== edges[i]) ||
     !Array.isArray(profile.channelBandPower) ||
     profile.channelBandPower.length !== p.channelCount ||
     !Array.isArray(profile.channelUnassignedPower) ||
     profile.channelUnassignedPower.length !== p.channelCount ||
     !Array.isArray(profile.channelTotalPower) ||
     profile.channelTotalPower.length !== p.channelCount ||
     !Array.isArray(d.evidence?.bands) || d.evidence.bands.length !== 2)
    return null;
  const power = Array<number>(7).fill(0);
  for(let ch=0;ch<p.channelCount;ch++){
    const bands = profile.channelBandPower[ch];
    const unassigned = profile.channelUnassignedPower[ch];
    const total = profile.channelTotalPower[ch];
    if(!Array.isArray(bands) || bands.length !== 7 ||
       !bands.every(validPower) || !validPower(unassigned) ||
       !validPower(total) ||
       !Number.isFinite(bands.reduce((sum:number,v:number)=>sum+v,unassigned)) ||
       Math.abs(bands.reduce((sum:number,v:number)=>sum+v,unassigned)-total) >
         1e-8*Math.max(1,total) ||
       bands[0] !== d.evidence.bands[0]?.spectralChannelPower?.[ch] ||
       bands[1] !== d.evidence.bands[1]?.spectralChannelPower?.[ch])
      return null;
    for(let i=0;i<7;i++){
      if(edges[i]>=profile.sampleRate/2 && bands[i]!==0)return null;
      power[i] += bands[i]/p.channelCount;
    }
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



/**
 * Score-inert, fixed-code explanation of which strict source-lineage predicate
 * rejected the evidence. Never return hashes, raw audio or untrusted values.
 * Shared with the public lineage adapter so observability cannot relax gates.
 */
export type AuralisSourceLineageRejectionCode =
  "INVALID_ENGINEERING_CONTEXT"|"INVALID_ENCODED_IDENTITY"|
  "INVALID_ENCODED_BYTE_LENGTH"|"PCM_CHANNEL_HASH_MISMATCH"|
  "PCM_DIMENSIONS_MISMATCH"|"SOURCE_RATE_CONTRADICTION";

export function getAuralisSourceLineageRejectionCode(
  diagnostic:unknown,
):AuralisSourceLineageRejectionCode|null {
  const d=diagnostic as any,i=d?.identity,p=d?.evidence?.sourceProvenance;
  const hash=(v:unknown)=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
  if(d?.status!=="AVAILABLE"||d?.evidence?.scoringImpact!=="NONE"||
     ![1,2].includes(p?.channelCount))
    return "INVALID_ENGINEERING_CONTEXT";
  if(i?.status!=="VERIFIED"||!hash(i.encodedSha256)||
     !["WAV_PCM","WAV_FLOAT","UNVERIFIED"].includes(i.sourceFormat)||
     !["VERIFIED_WAV_HEADER","UNVERIFIED"].includes(i.sourceRateStatus))
    return "INVALID_ENCODED_IDENTITY";
  // Crypto may finish AFTER decodeAudioData has detached the encoded buffer.
  // A zero recorded byte length rejects otherwise verified PCM lineage.
  if(!Number.isSafeInteger(i.encodedBytes)||i.encodedBytes<1)
    return "INVALID_ENCODED_BYTE_LENGTH";
  if(!Array.isArray(i.decodedChannelSha256)||
     !Array.isArray(i.workerChannelSha256)||
     i.decodedChannelSha256.length!==p.channelCount||
     i.workerChannelSha256.length!==p.channelCount||
     !i.decodedChannelSha256.every((h:unknown,n:number)=>
       hash(h)&&h===i.workerChannelSha256[n]))
    return "PCM_CHANNEL_HASH_MISMATCH";
  if(i.decodedSampleRate!==p.sampleRate||i.workerSampleRate!==p.sampleRate||
     i.decodedChannels!==p.channelCount||i.workerChannels!==p.channelCount||
     i.decodedSamples!==p.inputSampleCount||i.workerSamples!==p.inputSampleCount||
     !Number.isSafeInteger(i.decodedSamples)||i.decodedSamples<1)
    return "PCM_DIMENSIONS_MISMATCH";
  if((i.sourceRateStatus==="UNVERIFIED"&&i.sourceSampleRate!==null)||
     (i.sourceRateStatus==="VERIFIED_WAV_HEADER"&&
       (!Number.isSafeInteger(i.sourceSampleRate)||
        i.sourceSampleRate<8000||i.sourceSampleRate>192000))||
     i.rateRelationship!==(i.sourceSampleRate===null?"SOURCE_RATE_UNVERIFIED":
       i.sourceSampleRate===p.sampleRate?"SAME_RATE":"DECODED_RATE_DIFFERENT"))
    return "SOURCE_RATE_CONTRADICTION";
  return null;
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
  if(getAuralisSourceLineageRejectionCode(diagnostic)!==null)return null;
  const d=diagnostic as any,i=d.identity;
  return {status:"VERIFIED",scoringImpact:"NONE",sourceFormat:i.sourceFormat,
    sourceRateStatus:i.sourceRateStatus,sourceSampleRate:i.sourceSampleRate,
    decodedSampleRate:i.decodedSampleRate,workerSampleRate:i.workerSampleRate,
    decodedChannels:i.decodedChannels,workerChannels:i.workerChannels,
    decodedSamples:i.decodedSamples,workerSamples:i.workerSamples,
    rateRelationship:i.rateRelationship,encodedSha256Status:"CAPTURED_PRIVATE",
    pcmIdentityStatus:"VERIFIED"};
}


// Lean Stage 3D beta integration: evidence classification is descriptive even
// when the optional score cap is disabled. A spectral ratio does NOT prove
// muddiness, masking, quality, source identity or artistic intent.
// The four clean references and two altered controls did NOT validate a
// universal absolute-ratio cap. No threshold is enabled in production.
export const AURALIS_SPECTRAL_TRIAL_CAP = 79 as const;
export type AuralisSpectralTrialAssessment = {
  status: "MEASURED_TECHNICAL_CONCERN" | "INCONCLUSIVE" | "UNAVAILABLE";
  reason: "RATIO_ABOVE_PROVISIONAL_CORRIDOR" | "WITHIN_PROVISIONAL_CORRIDOR" |
    "NO_APPROVED_THRESHOLD" | "INVALID_OR_MISSING_EVIDENCE";
  measuredDb: number | null;
  thresholdDb: number | null;
  candidateCap: 79 | null;
  scoringImpact: "NONE" | "CANDIDATE_ONLY";
};
export function assessAuralisSpectralTrialEvidence(
  engineering: unknown,
  scoringEnabled: boolean,
  approvedThresholdDb: number | null,
): AuralisSpectralTrialAssessment {
  const e = engineering as any;
  const ratio = e?.metrics?.lowToUpperDb;
  if (e?.schemaVersion !== AURALIS_ENGINEERING_ADAPTER_VERSION ||
      e?.scoringImpact !== "NONE" ||
      e?.scoringAdapter?.status !== AURALIS_ENGINEERING_SCORE_POLICY ||
      !Array.isArray(e?.scoringAdapter?.adjustments) ||
      e.scoringAdapter.adjustments.length !== 0 ||
      typeof ratio !== "number" || !Number.isFinite(ratio)) {
    return {status:"UNAVAILABLE",reason:"INVALID_OR_MISSING_EVIDENCE",
      measuredDb:null,thresholdDb:null,candidateCap:null,scoringImpact:"NONE"};
  }
  // A measurement may be available without a justified quality threshold.
  // In that case do not turn it into a defect, score or faux zero.
  if (approvedThresholdDb === null || typeof approvedThresholdDb !== "number" ||
      !Number.isFinite(approvedThresholdDb)) {
    return {status:"INCONCLUSIVE",reason:"NO_APPROVED_THRESHOLD",
      measuredDb:ratio,thresholdDb:null,candidateCap:null,scoringImpact:"NONE"};
  }
  if (ratio <= approvedThresholdDb) {
    return {status:"INCONCLUSIVE",reason:"WITHIN_PROVISIONAL_CORRIDOR",
      measuredDb:ratio,thresholdDb:approvedThresholdDb,
      candidateCap:null,scoringImpact:"NONE"};
  }
  // Stage 3D-3: a single-track absolute ratio is NOT eligible for a
  // 79-point penalty, even if a caller accidentally enables the old switch.
  // The historical provisional corridor remains descriptive, not a cap gate.
  return {status:"MEASURED_TECHNICAL_CONCERN",
    reason:"RATIO_ABOVE_PROVISIONAL_CORRIDOR",
    measuredDb:ratio,thresholdDb:approvedThresholdDb,
    candidateCap:null,scoringImpact:"NONE"};
}

// Stage 3F-12: only fixed, non-sensitive diagnostic codes may leave the
// Worker boundary. Never persist arbitrary exception text, hashes or filenames.
const AURALIS_WORKER_FAILURE_CODES = [
  "UNSUPPORTED_CHANNEL_COUNT","INPUT_BUDGET_EXCEEDED",
  "INVALID_WORKER_RESPONSE","DIAGNOSTIC_COMPUTATION_FAILED",
  "INVALID_WORKER_EVIDENCE","PCM_IDENTITY_MISMATCH",
  "WORKER_ERROR","WORKER_MESSAGE_ERROR","TIMEOUT",
  "ENCODED_IDENTITY_UNAVAILABLE","PCM_IDENTITY_UNAVAILABLE",
  "WORKER_SETUP_FAILED",
] as const;
export type AuralisWorkerFailureCode =
  typeof AURALIS_WORKER_FAILURE_CODES[number] | "UNRECOGNIZED_OR_MISSING";
export function sanitizeAuralisWorkerFailureCode(reason:unknown):AuralisWorkerFailureCode {
  return typeof reason==="string" &&
    (AURALIS_WORKER_FAILURE_CODES as readonly string[]).includes(reason)
      ? reason as AuralisWorkerFailureCode : "UNRECOGNIZED_OR_MISSING";
}

// Historical reports without this optional field are unchanged. The workbook
// uses this validator again so a tampered saved critique cannot inject content.
export function getAuralisWorkerFailureCodeForReport(execution:unknown):string|null {
  const e=execution as any;
  if(e?.status!=="UNAVAILABLE"||e.reason!=="WORKER_UNAVAILABLE"||
     e.scoringImpact!=="NONE"||
     !Object.prototype.hasOwnProperty.call(e,"workerFailureCode"))return null;
  return sanitizeAuralisWorkerFailureCode(e.workerFailureCode);
}

// Beta observability: a compact, fail-closed execution record. This does not
// assert the audio is good or provide any numerical scoring authority.
export type AuralisExecutionRecord = {
  status:"AVAILABLE"|"UNAVAILABLE"|"NOT_RUN";
  reason:"VALIDATED_ENGINEERING_EVIDENCE"|"EVIDENCE_VALIDATION_FAILED"|
    "WORKER_UNAVAILABLE"|"WORKER_FAILED"|"CANCELLED"|"NOT_STARTED";
  workerFailureCode?:AuralisWorkerFailureCode;
  scoringImpact:"NONE";
};
export function classifyAuralisExecution(
  outcome:"AVAILABLE"|"UNAVAILABLE"|"FAILED"|"CANCELLED"|"NOT_RUN",
  engineering:unknown,
  workerFailureReason?:unknown,
):AuralisExecutionRecord {
  const inert=(status:AuralisExecutionRecord["status"],
    reason:AuralisExecutionRecord["reason"]):AuralisExecutionRecord=>({
      status,reason,scoringImpact:"NONE"
    });
  if(outcome==="NOT_RUN")return inert("NOT_RUN","NOT_STARTED");
  if(outcome==="CANCELLED")return inert("UNAVAILABLE","CANCELLED");
  if(outcome==="FAILED")return inert("UNAVAILABLE","WORKER_FAILED");
  if(outcome==="UNAVAILABLE")return workerFailureReason===undefined
    ? inert("UNAVAILABLE","WORKER_UNAVAILABLE") // preserve legacy callers
    : {...inert("UNAVAILABLE","WORKER_UNAVAILABLE"),
       workerFailureCode:sanitizeAuralisWorkerFailureCode(workerFailureReason)};
  const e=engineering as any;
  if(e?.schemaVersion!==AURALIS_ENGINEERING_ADAPTER_VERSION ||
     e?.scoringImpact!=="NONE" ||
     e?.scoringAdapter?.status!==AURALIS_ENGINEERING_SCORE_POLICY ||
     !Array.isArray(e?.scoringAdapter?.adjustments) ||
     e.scoringAdapter.adjustments.length!==0 ||
     typeof e?.metrics?.lowToUpperDb!=="number" ||
     !Number.isFinite(e.metrics.lowToUpperDb))
    return inert("UNAVAILABLE","EVIDENCE_VALIDATION_FAILED");
  return inert("AVAILABLE","VALIDATED_ENGINEERING_EVIDENCE");
}

// Only the current upload generation may publish a diagnostic report.
// Null signals a stale request: its result must not replace a newer critique.
export function resolveAuralisExecutionForReport(
  workerStarted:boolean,
  generationCurrent:boolean,
  execution:AuralisExecutionRecord|null|undefined,
):AuralisExecutionRecord|null {
  if(!generationCurrent)return null;
  if(!workerStarted)return classifyAuralisExecution("NOT_RUN",null);
  return execution ?? classifyAuralisExecution("CANCELLED",null);
}

// Stage 3D-3: isolated paired-comparison eligibility, NOT wired to YSS scoring.
// A +3 dB difference is only a descriptive technical change. No caller in the
// production upload path supplies trusted pair provenance or defect labels.
export type AuralisPairedSpectralResult = {
  status:"UNAVAILABLE"|"INCONCLUSIVE"|"MEASURED_TECHNICAL_CONCERN";
  reason:"INVALID_OR_MISSING_EVIDENCE"|"PAIR_LINEAGE_UNVERIFIED"|
    "NO_MATERIAL_PAIRED_CHANGE"|"PAIRED_CHANGE_DESCRIPTIVE_ONLY"|
    "INDEPENDENT_DEFECT_UNCONFIRMED"|"ARTISTIC_INTENT_UNRESOLVED"|
    "INTENTIONAL_STYLE"|"ELIGIBLE_SHADOW_ONLY";
  deltaDb:number|null;
  candidateCap:79|null;
  scoringImpact:"NONE"|"CANDIDATE_ONLY";
};
export function assessAuralisPairedSpectralEvidence(
  reference:unknown,
  candidate:unknown,
  context?:{
    trustedPairLineage:boolean;
    independentDefect:"CONFIRMED"|"NOT_CONFIRMED"|"UNKNOWN";
    artisticIntent:"REVIEWED_NOT_INTENTIONAL"|"INTENTIONAL"|"UNKNOWN";
    shadowPolicyAuthorized:boolean;
  },
):AuralisPairedSpectralResult {
  const result=(status:AuralisPairedSpectralResult["status"],
    reason:AuralisPairedSpectralResult["reason"],deltaDb:number|null=null,
    eligible=false):AuralisPairedSpectralResult=>({
      status,reason,deltaDb,
      candidateCap:eligible?AURALIS_SPECTRAL_TRIAL_CAP:null,
      scoringImpact:eligible?"CANDIDATE_ONLY":"NONE",
    });
  const valid=(value:unknown):boolean=>{
    const e=value as any,v=e?.metrics?.lowToUpperDb;
    return e?.schemaVersion===AURALIS_ENGINEERING_ADAPTER_VERSION &&
      e?.scoringImpact==="NONE" &&
      e?.scoringAdapter?.status===AURALIS_ENGINEERING_SCORE_POLICY &&
      Array.isArray(e?.scoringAdapter?.adjustments) &&
      e.scoringAdapter.adjustments.length===0 &&
      typeof v==="number" && Number.isFinite(v);
  };
  if(!valid(reference)||!valid(candidate))
    return result("UNAVAILABLE","INVALID_OR_MISSING_EVIDENCE");
  // Caller assertion is NOT a provenance verifier. An approved paired workflow
  // must independently establish source/excerpt identity and alignment first.
  if(context?.trustedPairLineage!==true)
    return result("INCONCLUSIVE","PAIR_LINEAGE_UNVERIFIED");
  const rawDelta=(candidate as any).metrics.lowToUpperDb-
    (reference as any).metrics.lowToUpperDb;
  // Two finite ratios can overflow during subtraction. Fail closed before
  // formatting or considering a paired difference for shadow eligibility.
  if(!Number.isFinite(rawDelta))
    return result("UNAVAILABLE","INVALID_OR_MISSING_EVIDENCE");
  const delta=Number(rawDelta.toFixed(6));
  if(rawDelta<3)
    return result("INCONCLUSIVE","NO_MATERIAL_PAIRED_CHANGE",delta);
  if(context?.artisticIntent==="INTENTIONAL")
    return result("INCONCLUSIVE","INTENTIONAL_STYLE",delta);
  if(context?.artisticIntent!=="REVIEWED_NOT_INTENTIONAL")
    return result("MEASURED_TECHNICAL_CONCERN","ARTISTIC_INTENT_UNRESOLVED",delta);
  if(context?.independentDefect!=="CONFIRMED")
    return result("MEASURED_TECHNICAL_CONCERN","INDEPENDENT_DEFECT_UNCONFIRMED",delta);
  // Future policy authorization would be a separate explicit approval.
  if(context?.shadowPolicyAuthorized!==true)
    return result("MEASURED_TECHNICAL_CONCERN","PAIRED_CHANGE_DESCRIPTIVE_ONLY",delta);
  return result("MEASURED_TECHNICAL_CONCERN","ELIGIBLE_SHADOW_ONLY",delta,true);
}

// Stage 3D-3 lean-beta decision record: synthetic-only shadow replay. It is
// deliberately disconnected from App, server and export. A test-supplied
// lineage assertion is NOT independent provenance verification for real songs.
// Archived Stage 2N comparisons with sourceIdentity UNVERIFIED cannot qualify.
export const AURALIS_PAIRED_SHADOW_RECORD_VERSION =
  "auralis-stage3d3-paired-shadow-record-v1" as const;
export type AuralisPairedShadowDecision = {
  schemaVersion:typeof AURALIS_PAIRED_SHADOW_RECORD_VERSION;
  status:"UNAVAILABLE"|"INCONCLUSIVE"|"INTENTIONAL_STYLE"|"ELIGIBLE_SHADOW_ONLY";
  reason:string;
  deltaDb:number|null;
  candidateCap:79|null;
  existingFinalScore:number|null;
  existingLegacyCap:number|null;
  hypotheticalSpectralScore:number|null;
  appliedCap:null;
  appliedScoreChange:0;
  scoringImpact:"NONE";
  adjustments:[];
  evidenceScope:"SYNTHETIC_ONLY_NOT_REAL_SONG_VALIDATION";
};
export function recordAuralisPairedSpectralShadowDecision(
  reference:unknown,candidate:unknown,
  context?:{
    evidenceScope:"SYNTHETIC_VERIFIED_FIXTURE_ONLY";
    referenceExecution:AuralisExecutionRecord;
    candidateExecution:AuralisExecutionRecord;
    pairLineage:{sourceIdentity:"VERIFIED_SYNTHETIC";sameSource:true;alignedExcerpt:true};
    independentDefect:"CONFIRMED"|"NOT_CONFIRMED"|"UNKNOWN";
    artisticIntent:"REVIEWED_NOT_INTENTIONAL"|"INTENTIONAL"|"UNKNOWN";
    shadowPolicyAuthorized:boolean;
    existingFinalScore:number;
    existingLegacyCap:number|null;
  },
):AuralisPairedShadowDecision {
  const record=(status:AuralisPairedShadowDecision["status"],reason:string,
    deltaDb:number|null=null,cap:79|null=null,
    finalScore:number|null=null,legacyCap:number|null=null):AuralisPairedShadowDecision=>({
      schemaVersion:AURALIS_PAIRED_SHADOW_RECORD_VERSION,status,reason,deltaDb,
      candidateCap:cap,existingFinalScore:finalScore,
      existingLegacyCap:legacyCap,
      hypotheticalSpectralScore:cap===null||finalScore===null?null:
        Math.min(finalScore,cap,legacyCap??100),
      appliedCap:null,appliedScoreChange:0,scoringImpact:"NONE",adjustments:[],
      evidenceScope:"SYNTHETIC_ONLY_NOT_REAL_SONG_VALIDATION",
    });
  // Do not grant evidence authority from a bare trustedPairLineage boolean.
  // No current production workflow supplies independently audited same-source
  // aligned pairing or independent listening/intent labels.
  const validated=(e:AuralisExecutionRecord|undefined)=>
    e?.status==="AVAILABLE"&&e.reason==="VALIDATED_ENGINEERING_EVIDENCE"&&
    e.scoringImpact==="NONE";
  if(!validated(context?.referenceExecution)||
     !validated(context?.candidateExecution))
    return record("UNAVAILABLE","MISSING_VALIDATED_WORKER_EVIDENCE");
  if(context?.evidenceScope!=="SYNTHETIC_VERIFIED_FIXTURE_ONLY"||
     context.pairLineage?.sourceIdentity!=="VERIFIED_SYNTHETIC"||
     context.pairLineage.sameSource!==true||
     context.pairLineage.alignedExcerpt!==true)
    return record("INCONCLUSIVE","PAIR_LINEAGE_UNVERIFIED");
  const finalScore=context.existingFinalScore,legacyCap=context.existingLegacyCap;
  const finiteScore=(v:unknown):v is number=>
    typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
  if(!finiteScore(finalScore)||
     (legacyCap!==null&&!finiteScore(legacyCap))||
     (legacyCap!==null&&finalScore>legacyCap))
    return record("INCONCLUSIVE","UNVERIFIED_EXISTING_SCORE_LINEAGE");
  const paired=assessAuralisPairedSpectralEvidence(reference,candidate,{
    trustedPairLineage:true,
    independentDefect:context.independentDefect,
    artisticIntent:context.artisticIntent,
    shadowPolicyAuthorized:context.shadowPolicyAuthorized,
  });
  if(paired.status==="UNAVAILABLE")
    return record("UNAVAILABLE",paired.reason);
  if(paired.reason==="INTENTIONAL_STYLE")
    return record("INTENTIONAL_STYLE",paired.reason,paired.deltaDb);
  if(paired.candidateCap===79&&paired.reason==="ELIGIBLE_SHADOW_ONLY")
    return record("ELIGIBLE_SHADOW_ONLY",paired.reason,paired.deltaDb,79,finalScore,legacyCap);
  return record("INCONCLUSIVE",paired.reason,paired.deltaDb);
}

// Stage 3E: score-inert, post-scoring observation for the current critique only.
// An available FFT ratio is not a defect judgment, trusted song-pair lineage,
// or authorization to apply a 79-point cap. Archived UNVERIFIED remains UNVERIFIED.
export const AURALIS_BETA_SCORING_AUDIT_VERSION = "auralis-stage3e-score-audit-v1" as const;
export function buildAuralisBetaScoringAudit(critique: unknown, serverReturnedSpectralScore?: unknown) {
  const c = critique as any;
  const finiteScore = (v: unknown): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
  const spectral = c?.subMetricsCall1?.spectralMatch;
  const trace = c?.subMetricsCall1?.a2ScoringProvenance?.spectralMatch;
  const finish = c?.productionFinishEvidence;
  const rawCap = c?.mixBalanceEvidence?.spectralCap;
  const capPresent = c?.mixBalanceEvidence !== null &&
    typeof c?.mixBalanceEvidence === "object" &&
    Object.prototype.hasOwnProperty.call(c.mixBalanceEvidence, "spectralCap");
  const capKnown = capPresent && (rawCap === null || finiteScore(rawCap));
  const finalScore = spectral?.applicable === false || !finiteScore(spectral?.score)
    ? null : spectral.score as number;
  // Captured BEFORE browser corrections by the caller. This server-returned
  // value may already include a server finish ceiling: it is not the raw
  // Gemini-mapped tier unless a complete A2 canonical trace proves that.
  const serverScore = finiteScore(serverReturnedSpectralScore) &&
    spectral?.applicable !== false ? serverReturnedSpectralScore : null;
  const measured = assessAuralisSpectralTrialEvidence(
    c?.auralisEngineering, false, null);
  const available = c?.auralisExecution?.status === "AVAILABLE" &&
    c.auralisExecution.reason === "VALIDATED_ENGINEERING_EVIDENCE" &&
    c.auralisExecution.scoringImpact === "NONE" &&
    measured.status === "INCONCLUSIVE" &&
    measured.reason === "NO_APPROVED_THRESHOLD";
  // The A2 server ledger records the canonical mapped tier BEFORE the
  // server finish ceiling. A recorded null cap is distinct from a missing
  // record; never reconstruct a zero/absent penalty from silence.
  const serverCapPresent = trace !== null && typeof trace === "object" &&
    Object.prototype.hasOwnProperty.call(trace, "serverFinishCapCandidate");
  const serverCap = trace?.serverFinishCapCandidate;
  const serverCapKnown = serverCapPresent &&
    (serverCap === null || finiteScore(serverCap));
  const serverCapApplied = serverCapKnown && serverCap !== null &&
    finiteScore(trace?.canonicalMappedScore) &&
    trace.canonicalMappedScore > serverCap;
  const serverCapReconciled = serverCapKnown &&
    trace?.serverFinishCapApplied === serverCapApplied &&
    trace?.serverFinishCapReason === (serverCapApplied
      ? "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING" : "NONE") &&
    finiteScore(trace?.serverScoreAfterFinishCap) &&
    trace.serverScoreAfterFinishCap === (serverCap === null
      ? trace.canonicalMappedScore
      : Math.min(trace.canonicalMappedScore, serverCap));
  // Full numeric A2 capture, when present, is checked rather than reconstructed.
  // Require the actual pre-browser server snapshot; a matching trace by itself
  // does not prove that the current server-returned score was captured.
  const completeTrace = finalScore !== null && capKnown &&
    finiteScore(trace?.canonicalMappedScore) &&
    trace?.serverSpectralStatus === "CAPTURED" &&
    serverScore !== null && serverCapReconciled &&
    trace?.preClientScore === trace?.serverScoreAfterFinishCap &&
    serverScore === trace.preClientScore &&
    trace?.browserSpectralStatus === "CAPTURED" &&
    trace?.browserFinishStatus === "COMPLETED" &&
    finiteScore(trace?.finalScore) && trace.finalScore === finalScore &&
    trace?.afterFinishCeilingScore === finalScore &&
    (rawCap === null ? trace.browserSpectralCapCandidate === null :
      trace.browserSpectralCapCandidate === rawCap) &&
    (rawCap === null ?
      trace.afterSpectralCapScore === trace.preClientScore &&
      trace.browserSpectralCapApplied === false :
      trace.afterSpectralCapScore === Math.min(trace.preClientScore,rawCap) &&
      trace.browserSpectralCapApplied === (trace.preClientScore > rawCap)) &&
    (finish?.ceiling === null || finiteScore(finish?.ceiling)) &&
    Object.prototype.hasOwnProperty.call(finish ?? {}, "ceiling") &&
    (finish.ceiling === null ? trace.browserFinishCapCandidate === null :
      trace.browserFinishCapCandidate === finish.ceiling) &&
    trace.finalScore === (finish.ceiling === null ?
      trace.afterSpectralCapScore :
      Math.min(trace.afterSpectralCapScore, finish.ceiling));
  const sourceVerified = c?.auralisSourceLineage?.status === "VERIFIED" &&
    c.auralisSourceLineage.pcmIdentityStatus === "VERIFIED" &&
    c.auralisSourceLineage.scoringImpact === "NONE";
  return {
    schemaVersion: AURALIS_BETA_SCORING_AUDIT_VERSION,
    status: available ? "INCONCLUSIVE" as const : "UNAVAILABLE" as const,
    reason: available ? "MEASURED_NO_APPROVED_QUALITY_GATE" as const :
      "NO_VALIDATED_ENGINEERING_OBSERVATION" as const,
    measurementDb: available ? measured.measuredDb : null,
    sourceIdentity: sourceVerified ? "CURRENT_UPLOAD_PCM_VERIFIED" as const :
      "UNVERIFIED" as const,
    pairedSourceAlignment: "UNVERIFIED" as const,
    independentDefect: "UNKNOWN" as const,
    artisticIntent: "UNKNOWN" as const,
    serverReturnedSpectralScore: serverScore,
    serverReturnedScoreStatus: serverScore === null ? "NOT_CAPTURED" as const :
      "CAPTURED_POST_SERVER_CAPS" as const,
    geminiMappedSpectralScore: completeTrace ? trace.canonicalMappedScore as number : null,
    geminiScoreStatus: completeTrace ? "A2_CANONICAL_CAPTURED" as const :
      "NOT_CAPTURED" as const,
    legacyDspCap: capKnown ? rawCap as number | null : null,
    legacyCapStatus: !capKnown ? "NOT_CAPTURED" as const :
      completeTrace ? "A2_RECONCILED" as const :
      "RECORDED_EFFECT_UNVERIFIED" as const,
    legacyCapApplied: completeTrace ? trace.browserSpectralCapApplied as boolean : null,
    observedFinalSpectralScore: finalScore,
    observedCommercialReadiness: finiteScore(c?.scores?.commercialReadiness) ?
      c.scores.commercialReadiness as number : null,
    scoreLineage: completeTrace ? "A2_RECONCILED" as const : "UNVERIFIED" as const,
    candidateCap: null, appliedCap: null, appliedScoreChange: 0,
    scoringImpact: "NONE" as const, adjustments: [] as [],
  };
}

// Stage 3F-5: a lean-beta operator-controlled reviewed-recording policy.
// A review is trusted ONLY when loaded by the server from private configuration,
// never from upload fields, model commentary, an Excel report or browser input.
// This is not a generic review workflow or a scoring activation token.
export const AURALIS_REVIEW_POLICY_VERSION = "auralis-reviewed-sha256-v1" as const;
export type AuralisOperatorReview = {
  version:typeof AURALIS_REVIEW_POLICY_VERSION;
  sourceSha256:string;
  reviewerId:string;
  independentDefect:"CONFIRMED_REVIEWED_REAL";
  artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL";
};
export function validateAuralisOperatorReviewPolicy(
  configured:unknown, uploadedSha256:unknown,
):AuralisOperatorReview|null {
  const v=configured as any;
  const sha=(s:unknown):s is string=>
    typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
  if(!sha(uploadedSha256)||v===null||typeof v!=="object"||
     Array.isArray(v)||v.version!==AURALIS_REVIEW_POLICY_VERSION||
     !sha(v.sourceSha256)||v.sourceSha256!==uploadedSha256||
     typeof v.reviewerId!=="string"||!/^[-a-zA-Z0-9_.]{3,64}$/.test(v.reviewerId)||
     v.independentDefect!=="CONFIRMED_REVIEWED_REAL"||
     v.artisticIntent!=="REVIEWED_NOT_INTENTIONAL_REAL"||
     Object.keys(v).sort().join(",")!==
       "artisticIntent,independentDefect,reviewerId,sourceSha256,version")
    return null;
  return {version:AURALIS_REVIEW_POLICY_VERSION,sourceSha256:v.sourceSha256,
    reviewerId:v.reviewerId,independentDefect:"CONFIRMED_REVIEWED_REAL",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL"};
}
// This checks a trusted server-issued decision against the *current* local
// source digest and Worker PCM chain. It never accepts a browser review flag.
// Current identity collection remains OFF until separately authorized.
export function resolveAuralisReviewedRealShadowContext(
  serverReview:unknown,
  encodedIdentity:unknown,
  audit:unknown,
):{
  evidenceScope:"REVIEWED_REAL_RECORDING_SHADOW_ONLY";
  sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED";
  sameSourceAligned:false;
  independentDefect:"CONFIRMED_REVIEWED_REAL";
  artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL";
  reviewEvidence:"EXTERNAL_REVIEW_RECORD_ASSERTED";
}|null {
  const e=encodedIdentity as any,a=audit as any;
  if(e?.status!=="VERIFIED"||
     typeof e.encodedSha256!=="string"||
     a?.sourceIdentity!=="CURRENT_UPLOAD_PCM_VERIFIED"||
     !validateAuralisOperatorReviewPolicy(serverReview,e.encodedSha256))
    return null;
  return {evidenceScope:"REVIEWED_REAL_RECORDING_SHADOW_ONLY",
    sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED",sameSourceAligned:false,
    independentDefect:"CONFIRMED_REVIEWED_REAL",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL",
    reviewEvidence:"EXTERNAL_REVIEW_RECORD_ASSERTED"};
}
// Stage 3F-9: single-fixture, default-OFF identity trial preparation.
// File name and size only select a candidate for hashing; they never
// establish trust. An exact archived encoded SHA is required separately
// before the Worker can receive the identity-capture option.
export function isAuralisStage3F9IdentityCandidate(
  file:unknown, enabled:boolean, a2Pilot:boolean, evidenceEnabled:boolean,
):boolean {
  const f=file as any;
  return enabled===true && a2Pilot===false && evidenceEnabled===true &&
    f?.name==="carry-on-03-muddy-dark.wav" && f?.size===11520056;
}
export function isAuralisStage3F9ExactEncodedIdentity(identity:unknown):boolean {
  const i=identity as any;
  return i?.status==="VERIFIED" &&
    i.encodedSha256==="19526bc02de79cbc3690357f5e1ae720f11999e95739a7b99358900f39448799" &&
    i.encodedBytes===11520056 &&
    (i.format==="WAV_PCM" || i.format==="WAV_FLOAT") &&
    i.sourceRateStatus==="VERIFIED_WAV_HEADER" &&
    i.sourceSampleRate===48000;
}
// Stage 3F-8: this is the production trust boundary for a reviewed-real 79
// trial. Never infer approval from a shadow result or a browser-supplied flag.
// The server's exact encoded-byte review, the current decoded/Worker PCM
// lineage and a freshly recomputed real-only shadow must all agree.
export function authorizeAuralisReviewed79Execution(
  critique:unknown, audit:unknown, shadow:unknown,
  serverReview:unknown, encodedIdentity:unknown,
):boolean {
  const c=critique as any,a=audit as any,s=shadow as any;
  if(!c||!a||!s||c.auralisBetaScoringAudit!==a||
     c.auralisStage3F1SpectralShadow!==s||
     a.sourceIdentity!=="CURRENT_UPLOAD_PCM_VERIFIED"||
     c.auralisSourceLineage?.status!=="VERIFIED"||
     c.auralisSourceLineage?.pcmIdentityStatus!=="VERIFIED"||
     c.auralisSourceLineage?.scoringImpact!=="NONE")return false;
  const context=resolveAuralisReviewedRealShadowContext(
    serverReview,encodedIdentity,a);
  if(!context)return false;
  const independentlyComputed=evaluateAuralisStage3F1SpectralShadow(c,a,context);
  return independentlyComputed.status==="REAL_REVIEW_HYPOTHETICAL_ONLY"&&
     independentlyComputed.reason==="REVIEWED_REAL_SHADOW_NOT_ACTIVATION"&&
     independentlyComputed.candidateCap===79&&
     independentlyComputed.scoringImpact==="NONE"&&
     independentlyComputed.appliedCap===null&&
     independentlyComputed.appliedScoreChange===0&&
     JSON.stringify(independentlyComputed)===JSON.stringify(s);
}
// A scoring-order-safe, read-only projection. Stage 3F-5 does not install an
// executor: actual scoring activation must separately reconcile the existing
// A2 final snapshot, parent score, reports and downstream scores.
export function planAuralisReviewed79ScoreIntegration(
  critique:unknown, audit:unknown, shadow:unknown, scoringEnabled:boolean,
){
  const c=critique as any,a=audit as any,s=shadow as any;
  const inert=(status:string,reason:string)=>({
    status,reason,scoringImpact:"NONE" as const,adjustments:[] as [],
    appliedCap:null,appliedScoreChange:0,
    hypotheticalSpectralScore:null as number|null,
    hypotheticalCommercialReadiness:null as number|null,
  });
  if(scoringEnabled!==false)
    return inert("BLOCKED","ACTIVATION_NOT_IMPLEMENTED");
  if(s?.status!=="REAL_REVIEW_HYPOTHETICAL_ONLY"||
     s.reason!=="REVIEWED_REAL_SHADOW_NOT_ACTIVATION"||
     s.scoringImpact!=="NONE"||s.appliedCap!==null||
     s.appliedScoreChange!==0||!Array.isArray(s.adjustments)||
     s.adjustments.length!==0||s.candidateCap!==79||
     a?.scoreLineage!=="A2_RECONCILED"||
     c?.subMetricsCall1?.spectralMatch?.score!==s.existingFinalScore||
     c?.scores?.commercialReadiness!==a.observedCommercialReadiness)
    return inert("NOT_ELIGIBLE","NO_TRUSTED_RECONCILED_SHADOW_DECISION");
  const score=s.hypotheticalSpectralScore,parent=s.hypotheticalCommercialReadiness;
  if(typeof score!=="number"||!Number.isFinite(score)||score!==79||
     typeof parent!=="number"||!Number.isInteger(parent)||
     parent<0||parent>c.scores.commercialReadiness||
     typeof s.hypotheticalReadinessDelta!=="number"||
     s.hypotheticalReadinessDelta!==parent-c.scores.commercialReadiness)
    return inert("BLOCKED","INVALID_READINESS_PROJECTION");
  return {...inert("PROJECTION_ONLY","ACTIVATION_DISABLED"),
    hypotheticalSpectralScore:score,hypotheticalCommercialReadiness:parent};
}

// Stage 3F-6: narrowly scoped final-score executor. The App integration
// permanently supplies false until separate activation approval. Historical
// Gemini/server/browser provenance is immutable; this records a NEW post-Auralis
// overlay rather than rewriting the pre-Auralis A2 snapshots.
export const AURALIS_REVIEWED_79_EXECUTION_VERSION =
  "auralis-stage3f6-reviewed79-execution-v1" as const;
export type AuralisReviewed79Execution = {
  version:typeof AURALIS_REVIEWED_79_EXECUTION_VERSION;
  status:"DISABLED"|"ABSTAIN"|"APPLIED";
  reason:string;
  scoringImpact:"NONE"|"DOWNWARD_ONLY";
  appliedCap:79|null;
  appliedScoreChange:number;
  beforeSpectralScore:number|null;
  afterSpectralScore:number|null;
  beforeCommercialReadiness:number|null;
  afterCommercialReadiness:number|null;
  preAuralisScoreLineage:"A2_RECONCILED"|null;
};
export function executeAuralisReviewed79Score(
  critique:unknown,audit:unknown,shadow:unknown,plan:unknown,
  scoringEnabled:boolean,
):AuralisReviewed79Execution {
  const c=critique as any,a=audit as any,s=shadow as any,p=plan as any;
  const finiteScore=(v:unknown):v is number=>
    typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
  const result=(status:AuralisReviewed79Execution["status"],reason:string,
    before:number|null=null,after:number|null=null,
    parentBefore:number|null=null,parentAfter:number|null=null):
    AuralisReviewed79Execution=>({
      version:AURALIS_REVIEWED_79_EXECUTION_VERSION,status,reason,
      scoringImpact:status==="APPLIED"?"DOWNWARD_ONLY":"NONE",
      appliedCap:status==="APPLIED"?79:null,
      appliedScoreChange:status==="APPLIED"&&before!==null&&after!==null?
        after-before:0,
      beforeSpectralScore:before,afterSpectralScore:after,
      beforeCommercialReadiness:parentBefore,
      afterCommercialReadiness:parentAfter,
      preAuralisScoreLineage:status==="APPLIED"?"A2_RECONCILED":null,
    });
  // Disabled means absolutely no score, commentary or provenance mutation.
  if(scoringEnabled!==true)return result("DISABLED","ACTIVATION_OFF");
  const metric=c?.subMetricsCall1?.spectralMatch;
  const dyn=c?.subMetricsCall1?.dynamicVariety;
  const hook=c?.subMetricsCall3?.compositionFlowSubs?.hookPlacement;
  const contrast=c?.subMetricsCall3?.compositionFlowSubs?.sectionalContrast;
  const old=metric?.score,readiness=c?.scores?.commercialReadiness;
  const legacy=c?.mixBalanceEvidence?.spectralCap;
  // The Stage 3F-5 planner cannot be made to apply a score. Recompute its
  // read-only proposal using the disabled policy; accept no supplied shortcut.
  const fresh=planAuralisReviewed79ScoreIntegration(c,a,s,false);
  if(c?.auralisStage3F6Execution!==undefined||
     a!==c?.auralisBetaScoringAudit||
     c?.auralisStage3F1SpectralShadow!==s||
     !p||p.status!=="PROJECTION_ONLY"||
     fresh.status!=="PROJECTION_ONLY"||
     p.reason!==fresh.reason||
     p.scoringImpact!=="NONE"||
     p.appliedCap!==null||p.appliedScoreChange!==0||
     !Array.isArray(p.adjustments)||p.adjustments.length!==0||
     p.hypotheticalSpectralScore!==fresh.hypotheticalSpectralScore||
     p.hypotheticalCommercialReadiness!==fresh.hypotheticalCommercialReadiness||
     a?.scoreLineage!=="A2_RECONCILED"||
     a?.scoringImpact!=="NONE"||
     !Array.isArray(a.adjustments)||a.adjustments.length!==0||
     a.appliedCap!==null||a.appliedScoreChange!==0||
     !finiteScore(a.geminiMappedSpectralScore)||
     !finiteScore(a.serverReturnedSpectralScore)||
     a.observedFinalSpectralScore!==old||
     a.observedCommercialReadiness!==readiness||
     a.legacyDspCap!==legacy||
     !(legacy===null||finiteScore(legacy))||
     legacy!==null&&legacy<=79||
     !finiteScore(old)||old<=79||
     !finiteScore(readiness)||
     [dyn,hook,contrast].some(x=>x?.applicable===false||
       !finiteScore(x?.score))||
     metric?.applicable===false||
     s?.candidateCap!==79||
     s?.existingFinalScore!==old||
     s?.existingLegacyCap!==legacy||
     s?.hypotheticalSpectralScore!==79||
     s?.hypotheticalCommercialReadiness!==fresh.hypotheticalCommercialReadiness)
    return result("ABSTAIN","INCOMPLETE_OR_STALE_RECONCILED_AUTHORIZATION");
  const compute=(spectral:number)=>Math.round(
    (hook.score*60+dyn.score*20+spectral*10+contrast.score*10)/100);
  const nextScore=Math.min(old,79),nextParent=compute(nextScore);
  if(compute(old)!==readiness||
     nextScore!==fresh.hypotheticalSpectralScore||
     nextParent!==fresh.hypotheticalCommercialReadiness||
     nextParent>readiness)
    return result("ABSTAIN","INCONSISTENT_DOWNSTREAM_SCORE");
  // All checks complete; one narrow commit point. Preserve legacy DSP and
  // canonical A2 traces so the separate post-Auralis record is auditable.
  const execution=result("APPLIED","REVIEWED_TECHNICAL_CAP",
    old,nextScore,readiness,nextParent);
  metric.score=nextScore;
  c.scores.commercialReadiness=nextParent;
  metric.commentary=typeof metric.commentary==="string"?
    metric.commentary+" Auralis: a separately operator-reviewed, independently corroborated technical issue constrained this Spectral Match result to 79.":
    "Auralis: an operator-reviewed, independently corroborated technical issue constrained Spectral Match to 79.";
  c.auralisStage3F6Execution=execution;
  return execution;
}

// Stage 3F-7: shared report/Excel consistency check. It never supplies
// scoring authorization, recalculates scores or rewrites the historical A2
// record. Only an actual applied overlay produces a review row.
export type AuralisReviewed79ReportRow = {section:string;field:string;value:string|number};
export function getAuralisReviewed79ReportRows(critique:unknown):AuralisReviewed79ReportRow[] {
  const c=critique as any,e=c?.auralisStage3F6Execution,a=c?.auralisBetaScoringAudit;
  if(e?.status!=="APPLIED")return [];
  const title="Auralis Reviewed 79";
  const invalid=():AuralisReviewed79ReportRow[]=>[
    {section:title,field:"Consistency",value:"INVALID_POST_AURALIS_SCORE_LINEAGE"},
  ];
  const score=(n:unknown):n is number=>
    typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=100;
  const spectral=c?.subMetricsCall1?.spectralMatch?.score;
  const commercial=c?.scores?.commercialReadiness;
  const hook=c?.subMetricsCall3?.compositionFlowSubs?.hookPlacement;
  const dyn=c?.subMetricsCall1?.dynamicVariety;
  const contrast=c?.subMetricsCall3?.compositionFlowSubs?.sectionalContrast;
  const legacy=c?.mixBalanceEvidence?.spectralCap;
  if(e.version!==AURALIS_REVIEWED_79_EXECUTION_VERSION||
     e.scoringImpact!=="DOWNWARD_ONLY"||e.appliedCap!==79||
     e.preAuralisScoreLineage!=="A2_RECONCILED"||
     a?.scoreLineage!=="A2_RECONCILED"||
     !score(a?.geminiMappedSpectralScore)||
     !score(e.beforeSpectralScore)||e.beforeSpectralScore<=79||
     e.afterSpectralScore!==79||
     e.appliedScoreChange!==79-e.beforeSpectralScore||
     e.beforeSpectralScore!==a.observedFinalSpectralScore||
     e.beforeCommercialReadiness!==a.observedCommercialReadiness||
     !score(e.beforeCommercialReadiness)||
     !score(e.afterCommercialReadiness)||
     spectral!==e.afterSpectralScore||commercial!==e.afterCommercialReadiness||
     !(legacy===null||score(legacy))||legacy!==a.legacyDspCap||
     legacy!==null&&legacy<=79||
     ![hook?.score,dyn?.score,contrast?.score].every(score))
    return invalid();
  const weighted=(spec:number)=>Math.round((
    hook.score*60+dyn.score*20+spec*10+contrast.score*10)/100);
  if(weighted(e.beforeSpectralScore)!==e.beforeCommercialReadiness||
     weighted(e.afterSpectralScore)!==e.afterCommercialReadiness||
     e.afterCommercialReadiness>e.beforeCommercialReadiness)
    return invalid();
  return [
    {section:title,field:"Consistency",value:"VERIFIED_POST_AURALIS_SCORE_LINEAGE"},
    {section:title,field:"Original Gemini tier-mapped Spectral Match",value:a.geminiMappedSpectralScore},
    {section:title,field:"Pre-Auralis Spectral Match",value:e.beforeSpectralScore},
    {section:title,field:"Final reported Spectral Match",value:spectral},
    {section:title,field:"Applied Spectral Match change",value:e.appliedScoreChange},
    {section:title,field:"Pre-Auralis Commercial Readiness",value:e.beforeCommercialReadiness},
    {section:title,field:"Final reported Commercial Readiness",value:commercial},
    {section:title,field:"Independent legacy DSP cap",value:legacy??"NONE"},
    {section:title,field:"Policy",value:AURALIS_REVIEWED_79_EXECUTION_VERSION},
  ];
}

// Stage 3F-1/3F-3: current-upload evidence audit and score-inert hypothetical
// Spectral Match decision. Never treats a tonal ratio as proof of a defect,
// or a reviewer flag as verified real-song lineage. No production score authority.
export const AURALIS_STAGE3F1_SHADOW_VERSION = "auralis-stage3f1-spectral-shadow-v1" as const;
export type AuralisStage3F1ShadowDecision = {
  schemaVersion:typeof AURALIS_STAGE3F1_SHADOW_VERSION;
  status:"ABSTAIN"|"EVIDENCE_ONLY"|"SYNTHETIC_HYPOTHETICAL_ONLY"|"REAL_REVIEW_HYPOTHETICAL_ONLY";
  reason:string;
  measurementDb:number|null;
  existingFinalScore:number|null;
  existingLegacyCap:number|null;
  candidateCap:79|null;
  hypotheticalSpectralScore:number|null;
  hypotheticalCommercialReadiness:number|null;
  hypotheticalReadinessDelta:number|null;
  evidenceScope:"CURRENT_UPLOAD_OBSERVATION_OR_SYNTHETIC_ONLY";
  scoringImpact:"NONE";
  adjustments:[];
  appliedCap:null;
  appliedScoreChange:0;
};
export function evaluateAuralisStage3F1SpectralShadow(
  critique:unknown, audit:unknown,
  context?:{
    evidenceScope:"SYNTHETIC_VERIFIED_FIXTURE_ONLY"|"REVIEWED_REAL_RECORDING_SHADOW_ONLY";
    sourceIdentity:"VERIFIED_SYNTHETIC"|"CURRENT_UPLOAD_PCM_VERIFIED";
    sameSourceAligned:boolean;
    independentDefect:"CONFIRMED_SYNTHETIC"|"CONFIRMED_REVIEWED_REAL"|"UNKNOWN"|"NOT_CONFIRMED";
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_SYNTHETIC"|"REVIEWED_NOT_INTENTIONAL_REAL"|"INTENTIONAL"|"UNKNOWN";
    // This is an input assertion, NOT a verified authorization credential.
    // No live App caller supplies reviewEvidence; scoring remains disabled.
    reviewEvidence?:"EXTERNAL_REVIEW_RECORD_ASSERTED";

  },
):AuralisStage3F1ShadowDecision {
  const c=critique as any,a=audit as any;
  const score=(v:unknown):v is number=>
    typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100;
  const auditVersion=a?.schemaVersion===AURALIS_BETA_SCORING_AUDIT_VERSION;
  const final=score(a?.observedFinalSpectralScore)?a.observedFinalSpectralScore:null;
  const legacy=score(a?.legacyDspCap)?a.legacyDspCap:null;
  const measurement=typeof a?.measurementDb==="number"&&
    Number.isFinite(a.measurementDb)?a.measurementDb:null;
  const result=(status:AuralisStage3F1ShadowDecision["status"],reason:string,
    cap:79|null=null,hypothetical:number|null=null,
    projected:number|null=null,delta:number|null=null):AuralisStage3F1ShadowDecision=>({
    schemaVersion:AURALIS_STAGE3F1_SHADOW_VERSION,status,reason,
    measurementDb:auditVersion?measurement:null,
    existingFinalScore:auditVersion?final:null,
    existingLegacyCap:auditVersion?legacy:null,
    candidateCap:cap,hypotheticalSpectralScore:hypothetical,
    hypotheticalCommercialReadiness:projected,
    hypotheticalReadinessDelta:delta,
    evidenceScope:"CURRENT_UPLOAD_OBSERVATION_OR_SYNTHETIC_ONLY",
    scoringImpact:"NONE",adjustments:[],appliedCap:null,appliedScoreChange:0,
  });
  if(!auditVersion||a.scoringImpact!=="NONE"||
    !Array.isArray(a.adjustments)||a.adjustments.length!==0||
    a.appliedCap!==null||a.appliedScoreChange!==0||
    a.candidateCap!==null)
    return result("ABSTAIN","INVALID_OR_SCORE_ACTIVE_AUDIT");
  // Distinguish valid engineering evidence from independent proof of a defect.
  const m=assessAuralisSpectralTrialEvidence(c?.auralisEngineering,false,null);
  if(c?.auralisExecution?.status!=="AVAILABLE"||
     c.auralisExecution.reason!=="VALIDATED_ENGINEERING_EVIDENCE"||
     c.auralisExecution.scoringImpact!=="NONE"||
     a.status!=="INCONCLUSIVE"||
     a.reason!=="MEASURED_NO_APPROVED_QUALITY_GATE"||
     m.status!=="INCONCLUSIVE"||m.reason!=="NO_APPROVED_THRESHOLD"||
     measurement===null||measurement!==m.measuredDb)
    return result("ABSTAIN","UNAVAILABLE_OR_INCONSISTENT_MEASUREMENT");
  // Full Stage 3E A2 reconciliation is necessary but not evidence of musical
  // quality. Check current scored fields against the frozen audit rather than
  // using untrusted historical summaries as if they were a current capture.
  const metric=c?.subMetricsCall1?.spectralMatch;
  const rawCap=c?.mixBalanceEvidence?.spectralCap;
  if(a.scoreLineage!=="A2_RECONCILED"||
     a.geminiScoreStatus!=="A2_CANONICAL_CAPTURED"||
     a.legacyCapStatus!=="A2_RECONCILED"||
     a.serverReturnedScoreStatus!=="CAPTURED_POST_SERVER_CAPS"||
     !score(a.geminiMappedSpectralScore)||
     !score(a.serverReturnedSpectralScore)||
     final===null||!score(metric?.score)||metric?.applicable===false||
     final!==metric.score||
     !c?.mixBalanceEvidence||
     !Object.prototype.hasOwnProperty.call(c.mixBalanceEvidence,"spectralCap")||
     !(rawCap===null||score(rawCap))||
     a.legacyDspCap!==rawCap||
     typeof a.legacyCapApplied!=="boolean"||
     !score(c?.scores?.commercialReadiness)||
     a.observedCommercialReadiness!==c.scores.commercialReadiness)
    return result("ABSTAIN","UNVERIFIED_SCORE_OR_EXISTING_CAP_LINEAGE");
  // Existing browser DSP signals corroborate *technical anomalies*, not
  // aesthetic intent. The count must explain the observed old cap; never
  // treat overlapping signals as proof of independent perceptual defects.
  const signals=c.mixBalanceEvidence?.signals;
  const caps=[null,86,82,76,72,68];
  const expected=Array.isArray(signals)&&signals.every((s:unknown)=>
    typeof s==="string"&&s.length>0) ?
      caps[Math.min(signals.length,5)] : undefined;
  if(expected===undefined||expected!==rawCap)
    return result("ABSTAIN","UNVERIFIED_LEGACY_DSP_CORROBORATION");
  // No independent browser signal means no independent DSP corroboration.
  if(signals.length===0)
    return result("EVIDENCE_ONLY","NO_INDEPENDENT_DSP_CORROBORATION");
  // Stage 3F-3: a reviewed *current* recording may be replayed in shadow,
  // but a review assertion is not a trusted activation credential. No live
  // caller supplies review context, and this function never mutates scores.
  const reviewedReal=context?.evidenceScope==="REVIEWED_REAL_RECORDING_SHADOW_ONLY";
  if(reviewedReal){
    const lineage=c?.auralisSourceLineage;
    if(a.sourceIdentity!=="CURRENT_UPLOAD_PCM_VERIFIED"||
       lineage?.status!=="VERIFIED"||lineage.pcmIdentityStatus!=="VERIFIED"||
       lineage.scoringImpact!=="NONE"||
       context.sourceIdentity!=="CURRENT_UPLOAD_PCM_VERIFIED")
      return result("EVIDENCE_ONLY","REAL_UPLOAD_IDENTITY_UNVERIFIED");
    // These six pre-existing signals cluster into three measurement families.
    // Correlated warnings from one family do not count as separate corroboration.
    const families=new Set<string>();
    for(const signal of signals){
      if(signal.startsWith("collapsed midrange spectral structure (")||
         signal.startsWith("midrange clarity collapse ("))families.add("MIDRANGE");
      else if(signal.startsWith("extreme bass/low-mid magnitude pair (")||
              signal.startsWith("extreme low-mid magnitude ("))families.add("LOW_MID");
      else if(signal.startsWith("very low relative air energy (")||
              signal.startsWith("dark-spectrum collapse ("))families.add("AIR");
      else return result("EVIDENCE_ONLY","UNKNOWN_DSP_SIGNAL_FAMILY");
    }
    if(families.size<2)
      return result("EVIDENCE_ONLY","INSUFFICIENT_DISTINCT_DSP_FAMILIES");
    if(context.artisticIntent==="INTENTIONAL")
      return result("EVIDENCE_ONLY","INTENTIONAL_STYLE");
    if(context.artisticIntent!=="REVIEWED_NOT_INTENTIONAL_REAL")
      return result("EVIDENCE_ONLY","ARTISTIC_INTENT_UNKNOWN");
    if(context.independentDefect!=="CONFIRMED_REVIEWED_REAL")
      return result("EVIDENCE_ONLY","INDEPENDENT_DEFECT_NOT_CONFIRMED");
    if(context.reviewEvidence!=="EXTERNAL_REVIEW_RECORD_ASSERTED")
      return result("EVIDENCE_ONLY","REVIEW_RECORD_NOT_SUPPLIED");
  }else{
    // Historical UNVERIFIED and unreviewed current uploads never qualify.
    if(context?.evidenceScope!=="SYNTHETIC_VERIFIED_FIXTURE_ONLY"||
       context.sourceIdentity!=="VERIFIED_SYNTHETIC"||
       context.sameSourceAligned!==true)
      return result("EVIDENCE_ONLY","NO_INDEPENDENT_VERIFIED_PAIR_POLICY");
    if(context.artisticIntent==="INTENTIONAL")
      return result("EVIDENCE_ONLY","INTENTIONAL_STYLE");
    if(context.artisticIntent!=="REVIEWED_NOT_INTENTIONAL_SYNTHETIC")
      return result("EVIDENCE_ONLY","ARTISTIC_INTENT_UNKNOWN");
    if(context.independentDefect!=="CONFIRMED_SYNTHETIC")
      return result("EVIDENCE_ONLY","INDEPENDENT_DEFECT_NOT_CONFIRMED");
  }
  // The 79 ceiling must never stack on top of a stricter existing DSP cap.
  // No other score fields or parent weights are changed, even in shadow mode.
  if(final<=79||rawCap!==null&&rawCap<=79)
    return result("EVIDENCE_ONLY","NO_ADDITIONAL_DOWNWARD_EFFECT");
  const children=c?.subMetricsCall3?.compositionFlowSubs;
  const hook=children?.hookPlacement,contrast=children?.sectionalContrast;
  const dyn=c?.subMetricsCall1?.dynamicVariety;
  if([hook,dyn,contrast].some(x=>x?.applicable===false||!score(x?.score)))
    return result("EVIDENCE_ONLY","INCOMPLETE_READINESS_LINEAGE");
  const readiness=(spectral:number)=>Math.round((
    hook.score*60+dyn.score*20+spectral*10+contrast.score*10)/100);
  if(readiness(final)!==c.scores.commercialReadiness)
    return result("EVIDENCE_ONLY","INCONSISTENT_READINESS_PARENT");
  const hypot=Math.min(final,79);
  const projected=readiness(hypot);
  if(projected>c.scores.commercialReadiness)
    return result("ABSTAIN","INVALID_HYPOTHETICAL_PROPAGATION");
  return result(reviewedReal?"REAL_REVIEW_HYPOTHETICAL_ONLY":"SYNTHETIC_HYPOTHETICAL_ONLY",
    reviewedReal?"REVIEWED_REAL_SHADOW_NOT_ACTIVATION":"SYNTHETIC_REPLAY_NOT_REAL_SONG_ACTIVATION",
    79,hypot,projected,projected-c.scores.commercialReadiness);
}

// Compatibility wrapper for the existing gated prototype; this never mutates
// the model tier or score. App.tsx applies min-caps only on explicit activation.
export function selectAuralisSpectralTrialCap(
  engineering: unknown, enabled: boolean, frozenThresholdDb: number | null,
): 79 | null {
  return assessAuralisSpectralTrialEvidence(
    engineering,enabled,frozenThresholdDb).candidateCap;
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


// Stage 3F-11: safe summary only, never raw encoded or PCM hashes.
// Converter provenance never proves identity of its original WAV.
export function summarizeAuralisQueuedMp3Shadow(
  exactConvertedMp3Submitted: boolean, lineage: unknown, audit: unknown, shadow: unknown,
) {
  const l = lineage as any,a = audit as any,s = shadow as any;
  const currentMp3PcmVerified = exactConvertedMp3Submitted === true &&
    l?.status === "VERIFIED" && l.pcmIdentityStatus === "VERIFIED" &&
    l.sourceFormat === "UNVERIFIED" &&
    l.sourceRateStatus === "UNVERIFIED" &&
    l.rateRelationship === "SOURCE_RATE_UNVERIFIED" &&
    l.encodedSha256Status === "CAPTURED_PRIVATE" &&
    l.scoringImpact === "NONE" &&
    a?.sourceIdentity === "CURRENT_UPLOAD_PCM_VERIFIED";
  const safeShadow = s?.scoringImpact === "NONE" &&
    Array.isArray(s.adjustments) && s.adjustments.length === 0 &&
    s.appliedCap === null && s.appliedScoreChange === 0 &&
    ["ABSTAIN","EVIDENCE_ONLY"].includes(s.status);
  return {
    schemaVersion: "auralis-stage3f11-queued-mp3-shadow-v1",
    // A filename and track.format are not proof of converter origin.
    analyzedSource: currentMp3PcmVerified ?
      "CURRENT_MP3_BYTES_PCM_VERIFIED" : "SOURCE_UNVERIFIED",
    converterOrigin: "UNVERIFIED",
    currentMp3PcmIdentity: currentMp3PcmVerified ? "VERIFIED" : "UNVERIFIED",
    originalWavLineage: "UNVERIFIED",
    encodedSourceRate: "UNVERIFIED",
    scoreLineage: a?.scoreLineage === "A2_RECONCILED" ?
      "A2_RECONCILED" : "UNVERIFIED",
    shadowStatus: safeShadow ? s.status : "ABSTAIN",
    shadowReason: safeShadow && typeof s.reason === "string" ?
      s.reason : "UNAVAILABLE_OR_UNTRUSTED_SHADOW",
    scoringImpact: "NONE",
    adjustments: [] as [],
    appliedCap: null,
    appliedScoreChange: 0,
  };
}
