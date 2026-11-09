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
     p?.methods?.join(",")!=="stage2a-hann-fft-power-v1,stage2b1-low-frame-power-v1,stage2b2-band-stereo-v1"||
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
