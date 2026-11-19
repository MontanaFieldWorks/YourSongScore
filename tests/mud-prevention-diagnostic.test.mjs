import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  computeMixBalanceScore,
  markMudPreventionDiagnosticOnly,
  isMudDiagnosticCritique,
  MUD_DIAGNOSTIC_SCORING_VERSION,
  MUD_DIAGNOSTIC_STATUS,
  getMixBalanceEffectiveWeight,
  evaluateAuralisSpectralShadowCandidate,
  prepareAuralisEngineeringEvidence,
  AURALIS_ENGINEERING_ADAPTER_VERSION,
  AURALIS_ENGINEERING_SCORE_POLICY,
  AURALIS_RECONCILIATION_VERSION,
  reconcileAuralisExistingMixCapsShadow,
  evaluateAuralisCalibrationEvidenceGateShadow,
  AURALIS_CALIBRATION_GATE_VERSION,
} from "../src/lib/mudPreventionDiagnostic.ts";

const fullMix = () => ({
  mudPrevention: { score: 68, qualityTier: "NEEDS_WORK", commentary: "raw low-mid observation" },
  midrangeSpacing: { score: 88 },
  lowEndDivision: { score: 88, applicable: true },
  sibilanceShaving: { score: 88, applicable: true },
  stereoWidth: { score: 88 },
});

test("only Mud Prevention becomes unscored while its source evidence survives", () => {
  const critique = { productionScoringVersion: MUD_DIAGNOSTIC_SCORING_VERSION, subMetricsCall1: fullMix() };
  const previous = structuredClone(critique.subMetricsCall1);
  assert.equal(computeMixBalanceScore(critique.subMetricsCall1, false), 83);
  markMudPreventionDiagnosticOnly(critique);
  assert.equal(isMudDiagnosticCritique(critique), true);
  assert.equal(critique.subMetricsCall1.mudPrevention.scoringStatus, MUD_DIAGNOSTIC_STATUS);
  assert.equal(critique.subMetricsCall1.mudPrevention.score, null);
  assert.equal(critique.subMetricsCall1.mudPrevention.qualityTier, previous.mudPrevention.qualityTier);
  assert.equal(critique.subMetricsCall1.mudPrevention.commentary, previous.mudPrevention.commentary);
  for (const metric of ["midrangeSpacing", "lowEndDivision", "sibilanceShaving", "stereoWidth"]) {
    assert.deepEqual(critique.subMetricsCall1[metric], previous[metric]);
  }
  assert.equal(computeMixBalanceScore(critique.subMetricsCall1, true), 88);
});

test("Low-End Division and Sibilance N/A exclusions are independently renormalized", () => {
  const call1 = fullMix();
  call1.midrangeSpacing.score = 76;
  call1.lowEndDivision.score = 0;
  call1.lowEndDivision.applicable = false;
  call1.sibilanceShaving.score = 92;
  call1.stereoWidth.score = 80;
  assert.equal(computeMixBalanceScore(call1, true), Math.round((76 * 25 + 92 * 15 + 80 * 15) / 55));
  assert.equal(getMixBalanceEffectiveWeight(call1, "midrangeSpacing"), 45.5);
  assert.equal(getMixBalanceEffectiveWeight(call1, "lowEndDivision"), null);
  call1.sibilanceShaving.applicable = false;
  assert.equal(computeMixBalanceScore(call1, true), Math.round((76 * 25 + 80 * 15) / 40));
  assert.equal(getMixBalanceEffectiveWeight(call1, "midrangeSpacing"), 62.5);
  assert.equal(call1.lowEndDivision.applicable, false);
  assert.equal(call1.sibilanceShaving.applicable, false);
});

test("diagnostic-only is distinct from N/A and cannot create a fake zero", () => {
  assert.equal(computeMixBalanceScore({ mudPrevention: { score: null } }, true), null);
  assert.equal(computeMixBalanceScore(null, true), null);
  assert.equal(computeMixBalanceScore({ ...fullMix(), midrangeSpacing: { score: 0 } }, true), 59);
});

test("historical scoring versions remain legacy and can move in either direction in counterfactuals", () => {
  const archive = { productionScoringVersion: "scoring-tier-v7", subMetricsCall1: fullMix(), mixQuality: { score: 83 } };
  assert.equal(isMudDiagnosticCritique(archive), false);
  assert.equal(computeMixBalanceScore(archive.subMetricsCall1, false), 83);
  assert.equal(archive.mixQuality.score, 83);
  archive.subMetricsCall1.mudPrevention.score = 98;
  assert.equal(computeMixBalanceScore(archive.subMetricsCall1, false), 91);
  assert.equal(computeMixBalanceScore(archive.subMetricsCall1, true), 88);
  assert.equal(archive.mixQuality.score, 83); // No stored report rewrite.
});

test("server and client share the same mix formula and v8 marker", async () => {
  const server = await readFile(new URL("../server.ts", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  assert.match(server, /computeMixBalanceScore\(c1Ready, true\)/);
  assert.match(server, /markMudPreventionDiagnosticOnly\(parsedCritique\)/);
  assert.match(server, /productionScoringVersion = MUD_DIAGNOSTIC_SCORING_VERSION/g);
  assert.match(app, /computeMixBalanceScore\(call1, isMudDiagnosticCritique\(critique\)\)/);
  assert.match(app, /markMudPreventionDiagnosticOnly\(critique\)/);
});

test("unvalidated mud-flux scoring gates are removed without disabling independent caps", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  const scoringRegion = app.slice(app.indexOf("let midrangeCap"), app.indexOf("const mixEvidenceSummary"));
  assert.doesNotMatch(scoringRegion, /mudFlux\s*[><=]/);
  assert.doesNotMatch(scoringRegion, /mudPrevention\.score\s*=/);
  assert.match(scoringRegion, /midrangeFlatness\s*<=\s*0\.40/);
  assert.match(scoringRegion, /midrangeFlatness\s*<\s*0\.45/);
  assert.match(scoringRegion, /bassBandEnergy\s*>\s*87/);
  assert.match(scoringRegion, /lowMidBandEnergy\s*>\s*72/);
  assert.match(scoringRegion, /if \(spectralCap !== null/);
});

test("Excel and UI mark only new Mud Prevention rows diagnostic-only", async () => {
  const display = await readFile(new URL("../src/components/CritiqueDisplay.tsx", import.meta.url), "utf8");
  assert.match(display, /m\.id === "mix" && idx === 0 && isMudDiagnosticCritique\(critique\)/);
  assert.match(display, /diagnosticMud \? "DIAGNOSTIC ONLY"/);
  assert.match(display, /diagnosticMud \? "—"/);
  assert.match(display, /applicable: !diagnosticMud && realSub\?\.applicable !== false/);
  assert.match(display, /wsSourceDiagnostics\.addRow\(\{ section: "Mud Prevention"/);
  assert.match(display, /betaMixWeightLabel\("lowEndDivision"\)/);
});


test("Stage 3A synthetic-only Auralis shadow candidate is gain invariant, fail-closed and inert",async()=>{
  // These fabricated summaries do not represent calibrated professional masters.
  const policy={calibration:"SYNTHETIC_TEST_ONLY_NOT_VALIDATED",
    limitedLowMidToMidDb:3,materialLowMidToMidDb:7};
  const make=(low=0.04,mid=0.01)=>({
    schemaVersion:"stage2i2-local-song-summary-v1",scoringImpact:"NONE",
    sourceProvenance:{methods:["stage2a-hann-fft-power-v1","stage2b1-low-frame-power-v1",
      "stage2b2-band-stereo-v1"],window:"periodic-hann",
      spectralNormalization:"one-sided-parseval-sum-window-squared",
      fftSize:4096,hopSize:2048,numericBandPowerFloor:1e-12,
      sampleRate:48000,channelCount:2,inputSampleCount:8192,
      representedSampleCount:8192,omittedTrailingSampleCount:0,zeroPaddedSampleCount:0},
    spectralProfile:{schemaVersion:"stage2j1-spectral-profile-v1",
      method:"stage2a-hann-fft-power-v1",units:"mean-square-full-scale-pcm",
      sampleRate:48000,channelCount:2,fftSize:4096,hopSize:2048,frames:3,
      representedSampleCount:8192,omittedTrailingSampleCount:0,zeroPaddedSampleCount:0,
      bands:[20,60,250,500,2000,6000,11000].map((edge,i)=>({
        bandHz:[edge,[60,250,500,2000,6000,11000,20000][i]],
        status:"AVAILABLE",channelPower:[i===1?low:i===2?mid:0.01,
          i===1?low:i===2?mid:0.01]}))}});
  const summary=make();
  const original=JSON.stringify(summary);
  const projection={hook:88,dynamicVariety:85,sectionalContrast:90};
  const missing=evaluateAuralisSpectralShadowCandidate(summary,93,undefined,projection);
  assert.deepEqual(missing,{status:"ABSTAIN",reason:"NO_CALIBRATED_POLICY",scoringImpact:"NONE"});
  const result=evaluateAuralisSpectralShadowCandidate(summary,93,policy,projection);
  assert.equal(result.status,"PROPOSED_CAP");
  assert.equal(result.proposedCap,79);
  assert.equal(result.hypotheticalScore,79);
  assert.equal(result.scoringImpact,"NONE");
  assert.equal(result.projectedCommercialReadiness,Math.round((88*60+85*20+79*10+90*10)/100));
  assert.equal(result.projectedCommercialDelta,Math.round((88*60+85*20+79*10+90*10)/100)-
    Math.round((88*60+85*20+93*10+90*10)/100));
  assert.ok(result.projectedCommercialDelta<=0);
  assert.equal(evaluateAuralisSpectralShadowCandidate(summary,79,policy).status,"ABSTAIN");
  assert.equal(evaluateAuralisSpectralShadowCandidate(make(0.01,0.01),93,policy).status,"ABSTAIN");
  assert.equal(evaluateAuralisSpectralShadowCandidate(make(0.1,0.01),93,policy).proposedCap,71);
  const gain=make();
  for(const b of gain.spectralProfile.bands)
    b.channelPower=b.channelPower.map(x=>x*Math.pow(10,-6/10));
  const attenuated=evaluateAuralisSpectralShadowCandidate(gain,93,policy,projection);
  assert.equal(attenuated.status,"PROPOSED_CAP");
  assert.equal(attenuated.proposedCap,result.proposedCap);
  assert.ok(Math.abs(attenuated.lowMidToMidDb-result.lowMidToMidDb)<1e-10);
  assert.equal(JSON.stringify(summary),original,"no input mutation");
  const invalid=[
    null,{...summary,scoringImpact:"SCORE"},
    {...summary,spectralProfile:{...summary.spectralProfile,units:"UNSUPPORTED"}},
    {...summary,spectralProfile:{...summary.spectralProfile,sampleRate:44100}},
    {...summary,spectralProfile:{...summary.spectralProfile,bands:summary.spectralProfile.bands.slice(0,6)}},
    {...summary,spectralProfile:{...summary.spectralProfile,bands:summary.spectralProfile.bands.map((b,i)=>
      i===1?{...b,status:"UNAVAILABLE"}:b)}},
    {...summary,spectralProfile:{...summary.spectralProfile,bands:summary.spectralProfile.bands.map((b,i)=>
      i===1?{...b,channelPower:[NaN,0.04]}:b)}},
    make(1e-13,0.01),
    {...summary,sourceProvenance:{...summary.sourceProvenance,fftSize:2048}},
  ];
  for(const malformed of invalid){
    const x=evaluateAuralisSpectralShadowCandidate(malformed,93,policy);
    assert.equal(x.status,"ABSTAIN","malformed or unavailable evidence must abstain");
    assert.equal(x.scoringImpact,"NONE");
  }
  assert.equal(evaluateAuralisSpectralShadowCandidate(summary,93,{
    ...policy,materialLowMidToMidDb:2}).status,"ABSTAIN");
  // Mix Balance never includes Spectral Match; the only projected aggregate
  // here is Commercial Readiness. The original scoring path stays untouched.
  const call1=fullMix(),beforeMix=computeMixBalanceScore(call1,true);
  assert.equal(computeMixBalanceScore(call1,true),beforeMix);
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(app,/const STAGE2C2A_DIAGNOSTICS_ENABLED = false/);
  assert.doesNotMatch(app,/evaluateAuralisSpectralShadowCandidate/);
  assert.doesNotMatch(server,/evaluateAuralisSpectralShadowCandidate/);
  assert.match(app,/\[spectral, 10\]/);
  assert.match(app,/computeMixBalanceScore\(call1, isMudDiagnosticCritique\(critique\)\)/);
  console.log("AURALIS_STAGE3A_SHADOW "+JSON.stringify({status:"PASS",
    noLiveWiring:true,default:missing.reason,hypotheticalCap:result.proposedCap,
    gainInvariant:true,projectedCommercialDelta:result.projectedCommercialDelta,
    unchangedMixBalance:true}));
});

 
test("Stage 3D-1 accepts real Worker-shaped synthetic stereo/mono, gain invariance, and fails closed",async()=>{
  const {runStage2c2aBrowserDiagnostics}=await import("../src/lib/liveAudioAnalyzer.ts");
  const input=(rate,channels,gain=1)=>{
    const length=8192;
    const data=Array.from({length:channels},(_,ch)=>{
      const samples=new Float32Array(length);
      for(let i=0;i<length;i++)samples[i]=gain*(
        .12*Math.sin(2*Math.PI*105*i/rate)+
        .09*Math.sin(2*Math.PI*850*i/rate)+
        .06*Math.sin(2*Math.PI*5500*i/rate+(ch*.1)));
      return samples;
    });
    return {sampleRate:rate,numberOfChannels:channels,
      getChannelData:(i)=>data[i]};
  };
  for(const rate of [44100,48000]){
    for(const channels of [1,2]){
      const diagnostic=runStage2c2aBrowserDiagnostics(input(rate,channels),true,true);
      assert.equal(diagnostic.status,"AVAILABLE");
      assert.equal(diagnostic.spectralProfile?.schemaVersion,"stage2j1-spectral-profile-v1");
      assert.deepEqual(diagnostic.spectralProfile?.bandEdgesHz,
        [20,60,250,500,2000,6000,11000,20000]);
      assert.equal(diagnostic.spectralProfile?.channelBandPower.length,channels);
      assert.equal(diagnostic.spectralProfile?.bands,undefined,
        "Do not use legacy band-major summary fixtures for Worker output");
      const original=JSON.stringify(diagnostic);
      const engineering=prepareAuralisEngineeringEvidence(diagnostic);
      assert.ok(engineering,"Validated Worker output must not be rejected by adapter");
      assert.equal(engineering.schemaVersion,AURALIS_ENGINEERING_ADAPTER_VERSION);
      assert.equal(engineering.scoringImpact,"NONE");
      assert.equal(engineering.scoringAdapter.status,AURALIS_ENGINEERING_SCORE_POLICY);
      assert.deepEqual(engineering.scoringAdapter.adjustments,[]);
      assert.ok(engineering.observations.every(x=>x.includes("intentional")));
      assert.equal(JSON.stringify(diagnostic),original,"No measurement mutation");
      const attenuated=runStage2c2aBrowserDiagnostics(input(rate,channels,.5),true,true);
      assert.equal(attenuated.status,"AVAILABLE");
      assert.equal(prepareAuralisEngineeringEvidence(attenuated)?.metrics.lowToUpperDb,
        engineering.metrics.lowToUpperDb,"Uniform gain must not change spectral ratio");
      assert.equal(engineering.observations.length,2,
        "Short synthetic signals may have no valid integrated loudness; do not invent a mastering observation");
      const measured=structuredClone(diagnostic);
      measured.referenceMeters.measurements.integratedLufs=-11.5;
      measured.referenceMeters.measurements.samplePeakDbfs=-0.6;
      const withMeters=prepareAuralisEngineeringEvidence(measured);
      assert.equal(withMeters?.observations.length,3,"Finite optional meters are reported");
      assert.match(withMeters.observations[2],/mastering-quality verdict/);
      // All corrupted cases must abstain, including malformed provenance and power.
      const bad=mutate=>{const clone=structuredClone(diagnostic);mutate(clone);
        assert.equal(prepareAuralisEngineeringEvidence(clone),null);};
      bad(d=>{d.status="UNAVAILABLE"});
      bad(d=>{d.evidence.scoringImpact="APPLIED"});
      bad(d=>{d.spectralProfile.bandEdgesHz[2]=251});
      bad(d=>{d.spectralProfile.bandEdgesHz.pop()});
      bad(d=>{d.spectralProfile.channelBandPower.pop()});
      bad(d=>{d.spectralProfile.channelBandPower[0].pop()});
      bad(d=>{d.spectralProfile.channelBandPower[0][1]=NaN});
      bad(d=>{d.spectralProfile.channelBandPower[0][1]=-1});
      bad(d=>{d.spectralProfile.channelBandPower[0][1]=Infinity});
      bad(d=>{d.spectralProfile.channelTotalPower[0]=NaN});
      bad(d=>{d.spectralProfile.channelUnassignedPower[0]=-1});
      bad(d=>{d.spectralProfile.channelTotalPower[0]+=0.1});
      bad(d=>{d.evidence.sourceProvenance.sampleRate=96000});
      bad(d=>{d.spectralProfile.channelCount=3});
      bad(d=>{d.spectralProfile.inputSampleCount+=1});
      bad(d=>{d.spectralProfile.frames+=1});
      bad(d=>{d.spectralProfile.method="incorrect"});
      bad(d=>{d.evidence.bands[1].spectralChannelPower[0]+=0.1});
    }
  }
  assert.equal(prepareAuralisEngineeringEvidence(null),null);
  assert.equal(prepareAuralisEngineeringEvidence({status:"UNAVAILABLE"}),null);
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const display=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(app,/STAGE3D1_AURALIS_EVIDENCE_ENABLED = true/);
  assert.match(app,/!a2PilotEnabled/);
  assert.match(app,/prepareAuralisEngineeringEvidence\(result\)/);
  assert.match(display,/Conditional engineering observation \(NOT SCORED\)/);
  assert.doesNotMatch(server,/prepareAuralisEngineeringEvidence/);
});


// Adapt legacy *synthetic test envelopes* to the actual Worker spectral layout.
// This helper is tests-only; production does not accept legacy bands[] shapes.
function asSyntheticWorkerProfile(diagnostic){
  const profile=diagnostic.spectralProfile;
  const oldBands=profile.bands;
  const channelCount=diagnostic.evidence.sourceProvenance.channelCount;
  profile.inputSampleCount=diagnostic.evidence.sourceProvenance.inputSampleCount;
  profile.bandEdgesHz=[20,60,250,500,2000,6000,11000,20000];
  profile.channelBandPower=Array.from({length:channelCount},(_,ch)=>
    oldBands.map(b=>b.channelPower[ch]));
  profile.channelUnassignedPower=Array(channelCount).fill(0);
  profile.channelTotalPower=profile.channelBandPower.map(bands=>
    bands.reduce((sum,value)=>sum+value,0));
  diagnostic.evidence.bands=oldBands.slice(0,2).map(b=>({
    spectralChannelPower:[...b.channelPower]
  }));
  delete profile.bands;
}

test("Stage 3D-3 synthetic-only paired shadow decision distinguishes candidate from applied",async()=>{
  const m=await import("../src/lib/mudPreventionDiagnostic.ts");
  const e=ratio=>({
    schemaVersion:m.AURALIS_ENGINEERING_ADAPTER_VERSION,scoringImpact:"NONE",
    scoringAdapter:{status:m.AURALIS_ENGINEERING_SCORE_POLICY,adjustments:[]},
    metrics:{lowToUpperDb:ratio}
  });
  const trusted=e=>m.classifyAuralisExecution("AVAILABLE",e);
  const reference=e(-2.2945),candidate=e(1.3561);
  const ctx={
    evidenceScope:"SYNTHETIC_VERIFIED_FIXTURE_ONLY",
    referenceExecution:trusted(reference),candidateExecution:trusted(candidate),
    pairLineage:{sourceIdentity:"VERIFIED_SYNTHETIC",sameSource:true,alignedExcerpt:true},
    independentDefect:"CONFIRMED",artisticIntent:"REVIEWED_NOT_INTENTIONAL",
    shadowPolicyAuthorized:true,existingFinalScore:88,existingLegacyCap:null
  };
  const frozen=JSON.stringify({reference,candidate,ctx});
  const eligible=m.recordAuralisPairedSpectralShadowDecision(reference,candidate,ctx);
  assert.deepEqual([eligible.status,eligible.reason,eligible.deltaDb,
    eligible.candidateCap,eligible.hypotheticalSpectralScore,
    eligible.appliedCap,eligible.appliedScoreChange,eligible.scoringImpact],
    ["ELIGIBLE_SHADOW_ONLY","ELIGIBLE_SHADOW_ONLY",3.6506,79,79,null,0,"NONE"]);
  assert.deepEqual(eligible.adjustments,[]);
  assert.equal(eligible.existingFinalScore,88);
  assert.equal(ctx.existingFinalScore,88,"No score was mutated");
  assert.equal(JSON.stringify({reference,candidate,ctx}),frozen,"No input mutation");
  const just=m.recordAuralisPairedSpectralShadowDecision(e(-1.2607),e(2.7527),{
    ...ctx,referenceExecution:trusted(e(-1.2607)),candidateExecution:trusted(e(2.7527)),
    existingFinalScore:76,existingLegacyCap:76
  });
  assert.deepEqual([just.status,just.candidateCap,just.hypotheticalSpectralScore,
    just.appliedCap,just.appliedScoreChange],
    ["ELIGIBLE_SHADOW_ONLY",79,76,null,0],
    "Existing legacy caps cannot be overridden or counted twice");
  const clipped=m.recordAuralisPairedSpectralShadowDecision(
    reference,e(-2.1592),{...ctx,candidateExecution:trusted(e(-2.1592))});
  assert.equal(clipped.status,"INCONCLUSIVE");
  assert.equal(clipped.reason,"NO_MATERIAL_PAIRED_CHANGE");
  for(const ratio of [-.876361107963617,-.7319587694145789,
    .7236573102012565,-1.9777095948352446]){
    const master=e(ratio);
    const x=m.recordAuralisPairedSpectralShadowDecision(master,master,{
      ...ctx,referenceExecution:trusted(master),candidateExecution:trusted(master)});
    assert.equal(x.candidateCap,null,"Frozen professional controls cannot be penalized");
  }
  const absent=m.recordAuralisPairedSpectralShadowDecision(reference,candidate);
  assert.deepEqual([absent.status,absent.candidateCap],["UNAVAILABLE",null]);
  const rejected=[
    [{...ctx,evidenceScope:"ARCHIVED_UNVERIFIED"}, "PAIR_LINEAGE_UNVERIFIED"],
    [{...ctx,pairLineage:{...ctx.pairLineage,sourceIdentity:"UNVERIFIED"}},
      "PAIR_LINEAGE_UNVERIFIED"],
    [{...ctx,pairLineage:{...ctx.pairLineage,alignedExcerpt:false}},
      "PAIR_LINEAGE_UNVERIFIED"],
    [{...ctx,pairLineage:{...ctx.pairLineage,sameSource:false}},
      "PAIR_LINEAGE_UNVERIFIED"],
    [{...ctx,independentDefect:"UNKNOWN"},"INDEPENDENT_DEFECT_UNCONFIRMED"],
    [{...ctx,independentDefect:"NOT_CONFIRMED"},"INDEPENDENT_DEFECT_UNCONFIRMED"],
    [{...ctx,artisticIntent:"UNKNOWN"},"ARTISTIC_INTENT_UNRESOLVED"],
    [{...ctx,shadowPolicyAuthorized:false},"PAIRED_CHANGE_DESCRIPTIVE_ONLY"],
    [{...ctx,existingFinalScore:101},"UNVERIFIED_EXISTING_SCORE_LINEAGE"],
    [{...ctx,existingFinalScore:88,existingLegacyCap:76},
      "UNVERIFIED_EXISTING_SCORE_LINEAGE"],
    [{...ctx,referenceExecution:{...ctx.referenceExecution,status:"UNAVAILABLE"}},
      "MISSING_VALIDATED_WORKER_EVIDENCE"],
  ];
  for(const [context,reason] of rejected){
    const x=m.recordAuralisPairedSpectralShadowDecision(reference,candidate,context);
    assert.equal(x.reason,reason);
    assert.equal(x.candidateCap,null);
    assert.equal(x.appliedCap,null);
    assert.equal(x.appliedScoreChange,0);
    assert.deepEqual(x.adjustments,[]);
  }
  const intentional=m.recordAuralisPairedSpectralShadowDecision(reference,candidate,
    {...ctx,artisticIntent:"INTENTIONAL"});
  assert.deepEqual([intentional.status,intentional.reason,intentional.candidateCap],
    ["INTENTIONAL_STYLE","INTENTIONAL_STYLE",null]);
  for(const corrupt of [null,e(Infinity),{...reference,scoringImpact:"SCORED"},
    {...reference,scoringAdapter:{status:"ENABLED",adjustments:[]}}]){
    const x=m.recordAuralisPairedSpectralShadowDecision(corrupt,candidate,ctx);
    assert.equal(x.status,"UNAVAILABLE");
    assert.equal(x.candidateCap,null);
  }
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  const display=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  for(const code of [app,server,display])
    assert.doesNotMatch(code,/recordAuralisPairedSpectralShadowDecision/,
      "Shadow record must remain disconnected from production and export");
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_ENABLED = false/);
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_THRESHOLD_DB: number \| null = null/);
});

test("Stage 3D-2A reconciles existing caps without new numeric policies or writes",async()=>{
  // Synthetic data only: no song fixture or genre-specific spectral threshold.
  const edges=[20,60,250,500,2000,6000,11000,20000];
  const provenance={
    methods:["stage2a-hann-fft-power-v1","stage2b1-low-frame-power-v1",
      "stage2b2-band-stereo-v1"],
    window:"periodic-hann",spectralNormalization:"one-sided-parseval-sum-window-squared",
    fftSize:4096,hopSize:2048,numericBandPowerFloor:1e-12,
    sampleRate:48000,channelCount:2,inputSampleCount:8192,
    representedSampleCount:8192,omittedTrailingSampleCount:0,zeroPaddedSampleCount:0};
  const diagnostic={status:"AVAILABLE",evidence:{scoringImpact:"NONE",sourceProvenance:provenance},
    spectralProfile:{schemaVersion:"stage2j1-spectral-profile-v1",
      scoringImpact:"NONE",method:"stage2a-hann-fft-power-v1",
      units:"mean-square-full-scale-pcm",sampleRate:48000,channelCount:2,
      fftSize:4096,hopSize:2048,frames:3,
      representedSampleCount:8192,omittedTrailingSampleCount:0,zeroPaddedSampleCount:0,
      bands:edges.slice(0,7).map((edge,i)=>({bandHz:[edge,edges[i+1]],
        status:"AVAILABLE",channelPower:[i===1?0.02:0.01,i===1?0.02:0.01]}))}};
  asSyntheticWorkerProfile(diagnostic);
  const critique={productionScoringVersion:MUD_DIAGNOSTIC_SCORING_VERSION,
    subMetricsCall1:{...fullMix(),spectralMatch:{score:76,applicable:true},
      midrangeSpacing:{score:72,applicable:true}},
    mixBalanceEvidence:{spectralCap:76,midrangeCap:72}};
  const original=JSON.stringify({diagnostic,critique});
  const result=reconcileAuralisExistingMixCapsShadow(diagnostic,critique);
  assert.equal(result.status,"COMPARED");
  assert.equal(result.schemaVersion,AURALIS_RECONCILIATION_VERSION);
  assert.equal(result.scoringImpact,"NONE");
  assert.deepEqual(result.adjustments,[]);
  assert.equal(result.metrics.spectralMatch.status,"CAP_PRESENT_EFFECT_UNVERIFIED");
  assert.equal(result.metrics.midrangeSpacing.status,"CAP_PRESENT_EFFECT_UNVERIFIED");
  assert.equal(result.metrics.spectralMatch.existingCap,76);
  assert.equal(result.metrics.midrangeSpacing.existingCap,72);
  assert.match(result.interpretation,/intentional production choice/);
  assert.equal(JSON.stringify({diagnostic,critique}),original,"read-only, no mutation");
  // Existing weighted mix score and both existing caps are unchanged.
  const before=computeMixBalanceScore(critique.subMetricsCall1,true);
  assert.equal(computeMixBalanceScore(critique.subMetricsCall1,true),before);
  assert.equal(critique.subMetricsCall1.spectralMatch.score,76);
  assert.equal(critique.subMetricsCall1.midrangeSpacing.score,72);

  // Equal-to-cap and below-cap scores prove only the presence of a ceiling,
  // not whether it actually reduced the score.
  const belowCaps=structuredClone(critique);
  belowCaps.subMetricsCall1.spectralMatch.score=74; // below 76
  belowCaps.subMetricsCall1.midrangeSpacing.score=69; // below 72
  const belowResult=reconcileAuralisExistingMixCapsShadow(diagnostic,belowCaps);
  assert.equal(belowResult.status,"COMPARED");
  assert.equal(belowResult.metrics.spectralMatch.status,"CAP_PRESENT_EFFECT_UNVERIFIED");
  assert.equal(belowResult.metrics.midrangeSpacing.status,"CAP_PRESENT_EFFECT_UNVERIFIED");
  assert.equal(belowResult.metrics.spectralMatch.score,74);
  assert.equal(belowResult.metrics.midrangeSpacing.score,69);
  assert.deepEqual(belowResult.adjustments,[]);
  assert.equal(belowCaps.subMetricsCall1.spectralMatch.score,74);
  assert.equal(belowCaps.subMetricsCall1.midrangeSpacing.score,69);
  assert.doesNotMatch(JSON.stringify(belowResult),/ALREADY_CAPPED|CAP_APPLIED/);

  const noCaps=structuredClone(critique);
  noCaps.mixBalanceEvidence={spectralCap:null,midrangeCap:null};
  const missingCapResult=reconcileAuralisExistingMixCapsShadow(diagnostic,noCaps);
  assert.equal(missingCapResult.status,"COMPARED");
  assert.equal(missingCapResult.metrics.spectralMatch.status,"NO_EXISTING_CAP");
  assert.equal(missingCapResult.metrics.midrangeSpacing.status,"NO_EXISTING_CAP");
  assert.equal(missingCapResult.metrics.spectralMatch.existingCap,null);
  assert.equal(missingCapResult.metrics.midrangeSpacing.existingCap,null);
  assert.deepEqual(missingCapResult.adjustments,[]);
  const notApplicable=structuredClone(noCaps);
  notApplicable.subMetricsCall1.midrangeSpacing.applicable=false;
  assert.deepEqual(reconcileAuralisExistingMixCapsShadow(diagnostic,notApplicable)
    .metrics.midrangeSpacing,{status:"NOT_APPLICABLE",score:null,existingCap:null});
  const gain=structuredClone(diagnostic);
  gain.spectralProfile.channelBandPower=gain.spectralProfile.channelBandPower
    .map(bands=>bands.map(value=>value/4));
  gain.spectralProfile.channelTotalPower=gain.spectralProfile.channelTotalPower.map(v=>v/4);
  gain.evidence.bands=gain.evidence.bands.map(b=>({
    ...b,spectralChannelPower:b.spectralChannelPower.map(v=>v/4)
  }));
  assert.equal(reconcileAuralisExistingMixCapsShadow(gain,critique).lowToUpperDb,
    result.lowToUpperDb,"power-ratio is gain invariant");

  const abstentions=[
    [diagnostic,{...critique,productionScoringVersion:"scoring-tier-v7"}],
    [{...diagnostic,status:"UNAVAILABLE"},critique],
    [{...diagnostic,evidence:{...diagnostic.evidence,scoringImpact:"SCORE"}},critique],
    [{...diagnostic,evidence:{...diagnostic.evidence,
      sourceProvenance:{...provenance,methods:"not-an-array"}}},critique],
    [{...diagnostic,evidence:{...diagnostic.evidence,
      sourceProvenance:{...provenance,fftSize:2048}}},critique],
    [{...diagnostic,spectralProfile:{...diagnostic.spectralProfile,
      channelBandPower:diagnostic.spectralProfile.channelBandPower.slice(0,1)}},critique],
    [{...diagnostic,spectralProfile:{...diagnostic.spectralProfile,
      channelBandPower:diagnostic.spectralProfile.channelBandPower.map((b,i)=>
        i===1?b.map((v,j)=>j===1?NaN:v):b)}},critique],
    [diagnostic,{...critique,mixBalanceEvidence:null}],
    [diagnostic,{...critique,mixBalanceEvidence:{midrangeCap:72}}],
    [diagnostic,{...critique,mixBalanceEvidence:{midrangeCap:70,spectralCap:76}}],
    [diagnostic,{...critique,mixBalanceEvidence:{midrangeCap:72,spectralCap:75}}],
    [diagnostic,{...critique,subMetricsCall1:{...critique.subMetricsCall1,
      spectralMatch:{score:96}}}],
  ];
  for(const [d,c] of abstentions){
    const x=reconcileAuralisExistingMixCapsShadow(d,c);
    assert.equal(x.status,"ABSTAIN");
    assert.equal(x.scoringImpact,"NONE");
    assert.deepEqual(x.adjustments,[]);
  }
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  const display=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  for(const source of [app,server,display])
    assert.doesNotMatch(source,/reconcileAuralisExistingMixCapsShadow|AURALIS_RECONCILIATION_VERSION/,
      "shadow policy is not wired to production or historical reporting");
  assert.match(app,/const STAGE3D1_AURALIS_EVIDENCE_ENABLED = true/);
  assert.match(app,/const STAGE2C2A_DIAGNOSTICS_ENABLED = false/);
  assert.match(app,/computeMixBalanceScore\(call1, isMudDiagnosticCritique\(critique\)\)/);
  assert.match(server,/computeMixBalanceScore\(c1Ready, true\)/);
  assert.match(display,/Auralis observations \(not scored\)/);
  assert.equal(AURALIS_ENGINEERING_SCORE_POLICY,"DISABLED_PENDING_STAGE_3D_2");
});


test("Stage 3D-2C synthetic calibration gate proves lineage, cap replay, parent propagation and abstention",async()=>{
  // Fabricated PCM-derived envelope only; no audio, Gemini or real-song test.
  const edges=[20,60,250,500,2000,6000,11000,20000];
  const provenance={methods:["stage2a-hann-fft-power-v1","stage2b1-low-frame-power-v1",
    "stage2b2-band-stereo-v1"],window:"periodic-hann",
    spectralNormalization:"one-sided-parseval-sum-window-squared",
    fftSize:4096,hopSize:2048,numericBandPowerFloor:1e-12,
    sampleRate:48000,channelCount:2,inputSampleCount:8192,
    representedSampleCount:8192,omittedTrailingSampleCount:0,zeroPaddedSampleCount:0};
  const diagnostic={status:"AVAILABLE",evidence:{scoringImpact:"NONE",sourceProvenance:provenance},
    spectralProfile:{schemaVersion:"stage2j1-spectral-profile-v1",scoringImpact:"NONE",
      method:"stage2a-hann-fft-power-v1",units:"mean-square-full-scale-pcm",
      sampleRate:48000,channelCount:2,fftSize:4096,hopSize:2048,frames:3,
      representedSampleCount:8192,omittedTrailingSampleCount:0,zeroPaddedSampleCount:0,
      bands:edges.slice(0,7).map((edge,i)=>({bandHz:[edge,edges[i+1]],
        status:"AVAILABLE",channelPower:[i===1?0.02:0.01,i===1?0.02:0.01]}))}};
  asSyntheticWorkerProfile(diagnostic);
  const commercialChildren={hook:88,dynamicVariety:85,sectionalContrast:90};
  const ready=(spectral)=>Math.round((88*60+85*20+spectral*10+90*10)/100);
  const critique={productionScoringVersion:MUD_DIAGNOSTIC_SCORING_VERSION,
    subMetricsCall1:{...fullMix(),spectralMatch:{score:76,applicable:true},
      midrangeSpacing:{score:72,applicable:true},
      dynamicVariety:{score:85,applicable:true}},
    mixBalanceEvidence:{spectralCap:76,midrangeCap:72},
    subMetricsCall3:{compositionFlowSubs:{
      hookPlacement:{score:88,applicable:true},
      sectionalContrast:{score:90,applicable:true}}},
    productionFinishEvidence:{ceiling:null,technicalFinishPenalty:0,
      dynamicFinishPenalty:0,brickwallFinishPenalty:0},
    mixQuality:{score:null},scores:{commercialReadiness:ready(76)}};
  critique.mixQuality.score=computeMixBalanceScore(critique.subMetricsCall1,true);
  const lineage={sourceIdentity:"VERIFIED_SYNTHETIC",resampled:false,
    sourceSampleRate:48000,decodedSampleRate:48000,
    workerSampleRate:48000,browserSampleRate:48000};
  const audit={captureStatus:"SYNTHETIC_PRE_POST_REPLAY_ONLY",lineage,
    artisticIntent:"SYNTHETIC_NONINTENTIONAL_CONTROL",overlapFamilies:[],
    penaltyCoverage:"COMPLETE_SYNTHETIC_PENALTY_INVENTORY",
    penaltyEvidence:structuredClone(critique.productionFinishEvidence),
    preCapScores:{spectralMatch:93,midrangeSpacing:88},commercialChildren};
  const unchanged=JSON.stringify({diagnostic,critique,audit});
  const result=evaluateAuralisCalibrationEvidenceGateShadow(diagnostic,critique,audit);
  assert.equal(result.status,"EVIDENCE_ONLY");
  assert.equal(result.schemaVersion,AURALIS_CALIBRATION_GATE_VERSION);
  assert.equal(result.scoringImpact,"NONE");
  assert.deepEqual(result.adjustments,[]);
  assert.equal(result.calibration,"SYNTHETIC_REPLAY_NOT_REAL_SONG_VALIDATION");
  assert.equal(result.existingChanges.spectralMatch,-17);
  assert.equal(result.existingChanges.midrangeSpacing,-16);
  assert.equal(result.existingChanges.commercialReadiness,ready(76)-ready(93));
  const beforeMix=structuredClone(critique.subMetricsCall1);
  beforeMix.midrangeSpacing.score=88;
  assert.equal(result.existingChanges.mixBalance,
    critique.mixQuality.score-computeMixBalanceScore(beforeMix,true));
  assert.equal(JSON.stringify({diagnostic,critique,audit}),unchanged,"no mutation");
  // A cap being present is not evidence it reduced the original value.
  const below=structuredClone(critique);
  below.subMetricsCall1.spectralMatch.score=74;
  below.subMetricsCall1.midrangeSpacing.score=69;
  below.mixQuality.score=computeMixBalanceScore(below.subMetricsCall1,true);
  below.scores.commercialReadiness=ready(74);
  const belowAudit={...audit,preCapScores:{spectralMatch:74,midrangeSpacing:69}};
  const belowResult=evaluateAuralisCalibrationEvidenceGateShadow(diagnostic,below,belowAudit);
  assert.equal(belowResult.status,"EVIDENCE_ONLY");
  assert.deepEqual(belowResult.existingChanges,{spectralMatch:0,midrangeSpacing:0,
    mixBalance:0,commercialReadiness:0});

  const blocked=[
    [diagnostic,critique,{},"UNVERIFIED_OR_INCOMPATIBLE_SAMPLE_RATE_LINEAGE"],
    [diagnostic,critique,{...audit,lineage:{...lineage,sourceIdentity:"UNVERIFIED"}},
      "UNVERIFIED_OR_INCOMPATIBLE_SAMPLE_RATE_LINEAGE"],
    [diagnostic,critique,{...audit,lineage:{...lineage,resampled:true,
      sourceSampleRate:44100}},"UNVERIFIED_OR_INCOMPATIBLE_SAMPLE_RATE_LINEAGE"],
    [diagnostic,critique,{...audit,lineage:{...lineage,browserSampleRate:44100}},
      "UNVERIFIED_OR_INCOMPATIBLE_SAMPLE_RATE_LINEAGE"],
    [diagnostic,critique,{...audit,artisticIntent:"INTENTIONAL_WARMTH"},
      "INTENTIONAL_OR_UNVERIFIED_ARTISTIC_CHOICE"],
    [diagnostic,critique,{...audit,artisticIntent:"UNKNOWN"},
      "INTENTIONAL_OR_UNVERIFIED_ARTISTIC_CHOICE"],
    [diagnostic,critique,{...audit,overlapFamilies:["PRODUCTION_FINISH"]},
      "OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,{...critique,productionFinishEvidence:{...critique.productionFinishEvidence,
      ceiling:82}},audit,"OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,{...critique,productionFinishEvidence:undefined},audit,
      "OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,critique,{...audit,penaltyCoverage:undefined},
      "OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,critique,{...audit,penaltyEvidence:undefined},
      "OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,critique,{...audit,penaltyEvidence:{...audit.penaltyEvidence,
      technicalFinishPenalty:undefined}},"OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,{...critique,productionFinishEvidence:{...critique.productionFinishEvidence,
      technicalFinishPenalty:7}},audit,"OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,{...critique,productionFinishEvidence:{...critique.productionFinishEvidence,
      technicalFinishPenalty:7,ceiling:null}}, {...audit,
      penaltyEvidence:{...audit.penaltyEvidence,technicalFinishPenalty:7}},
      "OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,{...critique,productionFinishEvidence:{...critique.productionFinishEvidence,
      dynamicFinishPenalty:7}}, {...audit,
      penaltyEvidence:{...audit.penaltyEvidence,dynamicFinishPenalty:7}},
      "OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,{...critique,productionFinishEvidence:{...critique.productionFinishEvidence,
      brickwallFinishPenalty:9}}, {...audit,
      penaltyEvidence:{...audit.penaltyEvidence,brickwallFinishPenalty:9}},
      "OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,critique,{...audit,penaltyEvidence:{...audit.penaltyEvidence,
      brickwallFinishPenalty:undefined}},"OVERLAPPING_OR_UNVERIFIED_PENALTY"],
    [diagnostic,critique,{...audit,commercialChildren:{...commercialChildren,hook:87}},
      "INCONSISTENT_COMMERCIAL_CHILD_LINEAGE"],
    [diagnostic,critique,{...audit,commercialChildren:{...commercialChildren,dynamicVariety:86}},
      "INCONSISTENT_COMMERCIAL_CHILD_LINEAGE"],
    [diagnostic,critique,{...audit,commercialChildren:{...commercialChildren,sectionalContrast:89}},
      "INCONSISTENT_COMMERCIAL_CHILD_LINEAGE"],
    [diagnostic,{...critique,subMetricsCall3:undefined},audit,"MISSING_COMMERCIAL_CHILDREN"],
    [diagnostic,{...critique,subMetricsCall1:{...critique.subMetricsCall1,
      dynamicVariety:{score:84}}},audit,"INCONSISTENT_COMMERCIAL_CHILD_LINEAGE"],
    [diagnostic,{...critique,subMetricsCall3:{compositionFlowSubs:{
      hookPlacement:{score:87},sectionalContrast:{score:90}}}},audit,
      "INCONSISTENT_COMMERCIAL_CHILD_LINEAGE"],
    [diagnostic,critique,{...audit,preCapScores:{spectralMatch:90,midrangeSpacing:68}},
      "UNCORROBORATED_CAP_APPLICATION"],
    [diagnostic,critique,{...audit,preCapScores:{spectralMatch:93}},
      "UNCORROBORATED_CAP_APPLICATION"],
    [diagnostic,{...critique,mixQuality:{score:99}},audit,
      "UNVERIFIED_MIX_PARENT_PROPAGATION"],
    [diagnostic,{...critique,scores:{commercialReadiness:99}},audit,
      "UNVERIFIED_COMMERCIAL_PARENT_PROPAGATION"],
    [{...diagnostic,status:"UNAVAILABLE"},critique,audit,"UNVERIFIED_RECONCILIATION"],
    [diagnostic,{...critique,productionScoringVersion:"scoring-tier-v7"},audit,
      "UNVERIFIED_RECONCILIATION"],
  ];
  for(const [d,c,a,reason] of blocked){
    const x=evaluateAuralisCalibrationEvidenceGateShadow(d,c,a);
    assert.deepEqual(x,{status:"ABSTAIN",reason,scoringImpact:"NONE",adjustments:[]});
  }
  // Not wired to App, server, browser exports or old report readers.
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  const display=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  for(const source of [app,server,display]){
    assert.doesNotMatch(source,/evaluateAuralisCalibrationEvidenceGateShadow|AURALIS_CALIBRATION_GATE_VERSION/);
  }
  assert.equal(AURALIS_ENGINEERING_SCORE_POLICY,"DISABLED_PENDING_STAGE_3D_2");
});


test("Stage 3E audit records current engineering observations after scoring without changing any score", async () => {
  const {buildAuralisBetaScoringAudit, AURALIS_BETA_SCORING_AUDIT_VERSION} =
    await import("../src/lib/mudPreventionDiagnostic.ts");
  const c = {
    auralisExecution:{status:"AVAILABLE",reason:"VALIDATED_ENGINEERING_EVIDENCE",scoringImpact:"NONE"},
    auralisEngineering:{
      schemaVersion:AURALIS_ENGINEERING_ADAPTER_VERSION,scoringImpact:"NONE",
      scoringAdapter:{status:AURALIS_ENGINEERING_SCORE_POLICY,adjustments:[]},
      metrics:{lowToUpperDb:1.25}
    },
    subMetricsCall1:{
      spectralMatch:{score:82,applicable:true},
      a2ScoringProvenance:{spectralMatch:{
        canonicalMappedScore:93,serverSpectralStatus:"CAPTURED",
        serverFinishCapCandidate:null,serverFinishCapApplied:false,
        serverFinishCapReason:"NONE",
        serverScoreAfterFinishCap:93,preClientScore:93,
        browserSpectralStatus:"CAPTURED",browserSpectralCapCandidate:82,
        browserSpectralCapApplied:true,afterSpectralCapScore:82,
        browserFinishStatus:"COMPLETED",browserFinishCapCandidate:null,
        afterFinishCeilingScore:82,finalScore:82,
      }}
    },
    productionFinishEvidence:{ceiling:null},
    mixBalanceEvidence:{spectralCap:82},
    scores:{commercialReadiness:90},
  };
  const frozen=structuredClone(c);
  const audit=buildAuralisBetaScoringAudit(c,93);
  assert.deepEqual(c,frozen,"the audit must not mutate any input or score");
  assert.equal(audit.schemaVersion,AURALIS_BETA_SCORING_AUDIT_VERSION);
  assert.deepEqual([audit.status,audit.reason,audit.measurementDb],
    ["INCONCLUSIVE","MEASURED_NO_APPROVED_QUALITY_GATE",1.25]);
  assert.equal(audit.sourceIdentity,"UNVERIFIED");
  assert.equal(audit.pairedSourceAlignment,"UNVERIFIED");
  assert.equal(audit.independentDefect,"UNKNOWN");
  assert.equal(audit.artisticIntent,"UNKNOWN");
  assert.equal(audit.serverReturnedSpectralScore,93);
  assert.equal(audit.serverReturnedScoreStatus,"CAPTURED_POST_SERVER_CAPS");
  assert.equal(audit.geminiMappedSpectralScore,93);
  assert.equal(audit.geminiScoreStatus,"A2_CANONICAL_CAPTURED");
  assert.equal(audit.legacyDspCap,82);
  assert.equal(audit.legacyCapApplied,true);
  assert.equal(audit.legacyCapStatus,"A2_RECONCILED");
  assert.equal(audit.scoreLineage,"A2_RECONCILED");
  assert.equal(audit.observedFinalSpectralScore,82);
  assert.equal(audit.observedCommercialReadiness,90);
  assert.equal(audit.candidateCap,null);
  assert.equal(audit.appliedCap,null);
  assert.equal(audit.appliedScoreChange,0);
  assert.equal(audit.scoringImpact,"NONE");
  assert.deepEqual(audit.adjustments,[]);
  // A complete current-upload identity may be reported, but never converts
  // unknown paired-source alignment or artistic intent into a verified claim.
  const current=buildAuralisBetaScoringAudit({
    ...c,auralisSourceLineage:{status:"VERIFIED",pcmIdentityStatus:"VERIFIED",scoringImpact:"NONE"}
  });
  assert.equal(current.sourceIdentity,"CURRENT_UPLOAD_PCM_VERIFIED");
  assert.equal(current.pairedSourceAlignment,"UNVERIFIED");
});

test("Stage 3E A2 reconciliation requires exact server cap provenance and a captured pre-browser score", async()=>{
  const {buildAuralisBetaScoringAudit}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const fixture=(serverCap,canonical,serverScore,final,legacyCap)=>({
    subMetricsCall1:{
      spectralMatch:{score:final,applicable:true},
      a2ScoringProvenance:{spectralMatch:{
        canonicalMappedScore:canonical,serverSpectralStatus:"CAPTURED",
        serverFinishCapCandidate:serverCap,
        serverFinishCapApplied:serverCap!==null && canonical>serverCap,
        serverFinishCapReason:serverCap!==null && canonical>serverCap
          ? "PRODUCTION_FINISH_MULTI_SIGNAL_CEILING":"NONE",
        serverScoreAfterFinishCap:serverScore,preClientScore:serverScore,
        browserSpectralStatus:"CAPTURED",
        browserSpectralCapCandidate:legacyCap,
        browserSpectralCapApplied:legacyCap!==null && serverScore>legacyCap,
        afterSpectralCapScore:legacyCap===null?serverScore:Math.min(serverScore,legacyCap),
        browserFinishStatus:"COMPLETED",browserFinishCapCandidate:null,
        afterFinishCeilingScore:final,finalScore:final,
      }},
    },
    productionFinishEvidence:{ceiling:null},
    mixBalanceEvidence:{spectralCap:legacyCap},
    scores:{commercialReadiness:88},
  });
  const assertions=(input,snapshot,expected)=>{
    const before=structuredClone(input);
    const result=buildAuralisBetaScoringAudit(input,snapshot);
    assert.deepEqual(input,before,"Audit must never mutate scoring inputs");
    assert.equal(result.scoreLineage,expected);
    assert.equal(result.geminiMappedSpectralScore,
      expected==="A2_RECONCILED"?input.subMetricsCall1.a2ScoringProvenance.spectralMatch.canonicalMappedScore:null);
    assert.equal(result.legacyCapApplied,expected==="A2_RECONCILED"?
      input.subMetricsCall1.a2ScoringProvenance.spectralMatch.browserSpectralCapApplied:null);
    assert.equal(result.candidateCap,null);
    assert.equal(result.appliedCap,null);
    assert.equal(result.appliedScoreChange,0);
    assert.equal(result.scoringImpact,"NONE");
    assert.deepEqual(result.adjustments,[]);
  };
  const uncapped=fixture(null,93,93,82,82);
  assertions(uncapped,93,"A2_RECONCILED");
  const serverCapped=fixture(88,93,88,82,82);
  assertions(serverCapped,88,"A2_RECONCILED");
  const noBrowserCap=fixture(88,93,88,88,null);
  assertions(noBrowserCap,88,"A2_RECONCILED");
  // No snapshot means an archived A2 ledger cannot independently prove this upload.
  assertions(uncapped,undefined,"UNVERIFIED");
  assertions(uncapped,NaN,"UNVERIFIED");
  assertions(uncapped,92,"UNVERIFIED");
  // Known, captured ceiling but impossible output (93 instead of min(93,79)).
  assertions(fixture(79,93,93,82,82),93,"UNVERIFIED");
  // The server must not be credited with a larger or unrecorded cap.
  assertions(fixture(88,93,89,82,82),89,"UNVERIFIED");
  const fields=["serverFinishCapCandidate","serverFinishCapApplied","serverFinishCapReason",
    "serverScoreAfterFinishCap","canonicalMappedScore","serverSpectralStatus"];
  for(const field of fields){
    const broken=structuredClone(serverCapped);
    delete broken.subMetricsCall1.a2ScoringProvenance.spectralMatch[field];
    assertions(broken,88,"UNVERIFIED");
  }
  const alterations=[
    {serverFinishCapCandidate:NaN},{serverFinishCapCandidate:undefined},
    {serverFinishCapCandidate:-1},{serverFinishCapCandidate:101},
    {serverFinishCapApplied:false},{serverFinishCapApplied:null},
    {serverFinishCapReason:"NONE"},{serverFinishCapReason:"NOT_CAPTURED"},
    {serverFinishCapCandidate:79},{serverScoreAfterFinishCap:87},
    {canonicalMappedScore:87},{preClientScore:93},
  ];
  for(const patch of alterations){
    const broken=structuredClone(serverCapped);
    Object.assign(broken.subMetricsCall1.a2ScoringProvenance.spectralMatch,patch);
    assertions(broken,88,"UNVERIFIED");
  }
  // Cap presence does not imply application: an above-score cap has effect false.
  const benign=fixture(95,93,93,82,82);
  assertions(benign,93,"A2_RECONCILED");
  benign.subMetricsCall1.a2ScoringProvenance.spectralMatch.serverFinishCapApplied=true;
  assertions(benign,93,"UNVERIFIED");
  const missingCap=structuredClone(uncapped);
  delete missingCap.subMetricsCall1.a2ScoringProvenance.spectralMatch.serverFinishCapCandidate;
  assertions(missingCap,93,"UNVERIFIED");
  assert.equal(buildAuralisBetaScoringAudit(missingCap,93).legacyCapStatus,
    "RECORDED_EFFECT_UNVERIFIED");
});

test("Stage 3E audit fails closed on missing/contradictory scoring lineage and unavailable engineering",async()=>{
  const {buildAuralisBetaScoringAudit}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const base={
    auralisExecution:{status:"AVAILABLE",reason:"VALIDATED_ENGINEERING_EVIDENCE",scoringImpact:"NONE"},
    auralisEngineering:{
      schemaVersion:AURALIS_ENGINEERING_ADAPTER_VERSION,scoringImpact:"NONE",
      scoringAdapter:{status:AURALIS_ENGINEERING_SCORE_POLICY,adjustments:[]},
      metrics:{lowToUpperDb:-2}
    },
    subMetricsCall1:{spectralMatch:{score:76}},
    mixBalanceEvidence:{spectralCap:76},
    scores:{commercialReadiness:86},
  };
  const untraced=buildAuralisBetaScoringAudit(base,88);
  assert.equal(untraced.serverReturnedSpectralScore,88);
  assert.equal(untraced.serverReturnedScoreStatus,"CAPTURED_POST_SERVER_CAPS");
  assert.deepEqual([untraced.status,untraced.geminiMappedSpectralScore,
    untraced.legacyDspCap,untraced.legacyCapApplied,untraced.scoreLineage],
    ["INCONCLUSIVE",null,76,null,"UNVERIFIED"]);
  assert.equal(untraced.legacyCapStatus,"RECORDED_EFFECT_UNVERIFIED");
  const missing=buildAuralisBetaScoringAudit({
    ...base,mixBalanceEvidence:{midrangeCap:72},
  });
  assert.equal(missing.serverReturnedSpectralScore,null);
  assert.equal(missing.legacyCapStatus,"NOT_CAPTURED");
  assert.equal(missing.legacyDspCap,null);
  const wrong=buildAuralisBetaScoringAudit({
    ...base,auralisExecution:{status:"UNAVAILABLE",reason:"WORKER_FAILED",scoringImpact:"NONE"},
  });
  assert.deepEqual([wrong.status,wrong.measurementDb,wrong.scoringImpact],
    ["UNAVAILABLE",null,"NONE"]);
  const missingRun=buildAuralisBetaScoringAudit({...base,auralisExecution:undefined});
  assert.equal(missingRun.status,"UNAVAILABLE");
  const poisoned=buildAuralisBetaScoringAudit({
    ...base,auralisEngineering:{...base.auralisEngineering,
      scoringAdapter:{status:AURALIS_ENGINEERING_SCORE_POLICY,adjustments:[{cap:79}]}}
  });
  assert.equal(poisoned.status,"UNAVAILABLE");
  const wrongScore=buildAuralisBetaScoringAudit({
    ...base,subMetricsCall1:{spectralMatch:{score:99}}
  });
  assert.equal(wrongScore.scoreLineage,"UNVERIFIED");
  assert.equal(wrongScore.legacyCapApplied,null);
  assert.equal(wrongScore.observedFinalSpectralScore,99);
  const historical=buildAuralisBetaScoringAudit({
    ...base,auralisSourceLineage:{status:"UNVERIFIED",pcmIdentityStatus:"UNVERIFIED"}
  });
  assert.equal(historical.sourceIdentity,"UNVERIFIED");
  assert.equal(historical.pairedSourceAlignment,"UNVERIFIED");
  assert.deepEqual(historical.adjustments,[]);
});

test("Stage 3E integration is post-scoring and retains disabled independent cap",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_ENABLED = false;/);
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_THRESHOLD_DB: number \\| null = null;/);
  assert.ok(app.indexOf("buildAuralisBetaScoringAudit(overriddenCritique, serverReturnedSpectralScore)") >
    app.indexOf("applyProductionFinishGuardrail(overriddenCritique, liveMetrics)"));
  assert.ok(app.indexOf("buildAuralisBetaScoringAudit(overriddenCritique, serverReturnedSpectralScore)") <
    app.indexOf("setCritiqueResult({"));
  assert.ok(app.indexOf("const serverReturnedSpectralScore =") <
    app.indexOf("applyProductionFinishGuardrail(overriddenCritique, liveMetrics)"));
  assert.doesNotMatch(server,/buildAuralisBetaScoringAudit/);
  assert.doesNotMatch(app,/recordAuralisPairedSpectralShadowDecision/);
});


test("Stage 3F-1 synthetic shadow requires independent evidence and never mutates scores",async()=>{
  const {buildAuralisBetaScoringAudit,evaluateAuralisStage3F1SpectralShadow,
    AURALIS_STAGE3F1_SHADOW_VERSION}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const fixture=()=>{
    const c={
      auralisExecution:{status:"AVAILABLE",reason:"VALIDATED_ENGINEERING_EVIDENCE",scoringImpact:"NONE"},
      auralisEngineering:{
        schemaVersion:AURALIS_ENGINEERING_ADAPTER_VERSION,scoringImpact:"NONE",
        scoringAdapter:{status:AURALIS_ENGINEERING_SCORE_POLICY,adjustments:[]},
        metrics:{lowToUpperDb:1.25}
      },
      subMetricsCall1:{
        spectralMatch:{score:82,applicable:true},
        dynamicVariety:{score:88},
        a2ScoringProvenance:{spectralMatch:{
          canonicalMappedScore:93,serverSpectralStatus:"CAPTURED",
          serverFinishCapCandidate:null,serverFinishCapApplied:false,
          serverFinishCapReason:"NONE",
          serverScoreAfterFinishCap:93,preClientScore:93,
          browserSpectralStatus:"CAPTURED",browserSpectralCapCandidate:82,
          browserSpectralCapApplied:true,afterSpectralCapScore:82,
          browserFinishStatus:"COMPLETED",browserFinishCapCandidate:null,
          afterFinishCeilingScore:82,finalScore:82,
        }},
      },
      mixBalanceEvidence:{spectralCap:82,signals:["low-mid contrast anomaly","air rolloff anomaly"]},
      productionFinishEvidence:{ceiling:null},
      subMetricsCall3:{compositionFlowSubs:{
        hookPlacement:{score:90},sectionalContrast:{score:88}
      }},
      scores:{commercialReadiness:89},
    };
    return {c,audit:buildAuralisBetaScoringAudit(c,93)};
  };
  const synthetic={
    evidenceScope:"SYNTHETIC_VERIFIED_FIXTURE_ONLY",
    sourceIdentity:"VERIFIED_SYNTHETIC",sameSourceAligned:true,
    independentDefect:"CONFIRMED_SYNTHETIC",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_SYNTHETIC"
  };
  const {c,audit}=fixture();
  assert.equal(audit.scoreLineage,"A2_RECONCILED");
  const before=structuredClone({c,audit});
  const shadow=evaluateAuralisStage3F1SpectralShadow(c,audit,synthetic);
  assert.deepEqual({c,audit},before);
  assert.equal(shadow.schemaVersion,AURALIS_STAGE3F1_SHADOW_VERSION);
  assert.equal(shadow.status,"SYNTHETIC_HYPOTHETICAL_ONLY");
  assert.equal(shadow.reason,"SYNTHETIC_REPLAY_NOT_REAL_SONG_ACTIVATION");
  assert.deepEqual([shadow.existingFinalScore,shadow.existingLegacyCap,shadow.candidateCap,
    shadow.hypotheticalSpectralScore,shadow.hypotheticalCommercialReadiness,
    shadow.hypotheticalReadinessDelta],[82,82,79,79,88,-1]);
  assert.deepEqual([shadow.scoringImpact,shadow.appliedCap,shadow.appliedScoreChange],
    ["NONE",null,0]);
  assert.deepEqual(shadow.adjustments,[]);
  const current=evaluateAuralisStage3F1SpectralShadow(c,audit);
  assert.deepEqual([current.status,current.reason,current.candidateCap,current.appliedCap],
    ["EVIDENCE_ONLY","NO_INDEPENDENT_VERIFIED_PAIR_POLICY",null,null]);
  // A current-upload PCM fingerprint cannot substitute for independently
  // verified same-source pairing or an artistic-intent decision.
  const currentAudit={...audit,sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED"};
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,currentAudit).status,"EVIDENCE_ONLY");

  const trials=[
    [{...synthetic,evidenceScope:"REAL_SONG"}, "NO_INDEPENDENT_VERIFIED_PAIR_POLICY"],
    [{...synthetic,sourceIdentity:"UNVERIFIED"},"NO_INDEPENDENT_VERIFIED_PAIR_POLICY"],
    [{...synthetic,sameSourceAligned:false},"NO_INDEPENDENT_VERIFIED_PAIR_POLICY"],
    [{...synthetic,artisticIntent:"UNKNOWN"},"ARTISTIC_INTENT_UNKNOWN"],
    [{...synthetic,artisticIntent:"INTENTIONAL"},"INTENTIONAL_STYLE"],
    [{...synthetic,independentDefect:"UNKNOWN"},"INDEPENDENT_DEFECT_NOT_CONFIRMED"],
    [{...synthetic,independentDefect:"NOT_CONFIRMED"},"INDEPENDENT_DEFECT_NOT_CONFIRMED"],
  ];
  for(const [policy,reason] of trials){
    const d=evaluateAuralisStage3F1SpectralShadow(c,audit,policy);
    assert.equal(d.status,"EVIDENCE_ONLY");
    assert.equal(d.reason,reason);
    assert.equal(d.candidateCap,null);
    assert.deepEqual(d.adjustments,[]);
  }
  const unavailable={...c,auralisExecution:{status:"UNAVAILABLE",reason:"WORKER_FAILED",scoringImpact:"NONE"}};
  assert.equal(evaluateAuralisStage3F1SpectralShadow(unavailable,audit,synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,measurementDb:999},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,scoreLineage:"UNVERIFIED"},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,appliedCap:79},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,adjustments:[{cap:79}]},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,observedFinalSpectralScore:95},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,serverReturnedScoreStatus:"NOT_CAPTURED"},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,geminiMappedSpectralScore:null},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,legacyDspCap:86},synthetic).status,"ABSTAIN");
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,{...audit,observedCommercialReadiness:90},synthetic).status,"ABSTAIN");
  // A proposed quality correction must not be based on one band ratio
  // or a mislabeled/noisy legacy-DSP signal inventory.
  const missingSignals={...c,mixBalanceEvidence:{...c.mixBalanceEvidence,signals:[]}};
  assert.equal(evaluateAuralisStage3F1SpectralShadow(missingSignals,audit,synthetic).status,"ABSTAIN");
  const mismatchedSignals={...c,mixBalanceEvidence:{...c.mixBalanceEvidence,signals:["one"]}};
  assert.equal(evaluateAuralisStage3F1SpectralShadow(mismatchedSignals,audit,synthetic).status,"ABSTAIN");
  const wrongReadiness={...c,scores:{commercialReadiness:90}};
  const wrongReadinessAudit={...audit,observedCommercialReadiness:90};
  assert.deepEqual([evaluateAuralisStage3F1SpectralShadow(wrongReadiness,wrongReadinessAudit,synthetic).status,
    evaluateAuralisStage3F1SpectralShadow(wrongReadiness,wrongReadinessAudit,synthetic).reason],
    ["EVIDENCE_ONLY","INCONSISTENT_READINESS_PARENT"]);

  // Stage 3F-3: the same current upload can only obtain a reviewed-real shadow
  // hypothesis with verified per-upload PCM, independent review assertions,
  // distinct DSP families and full lineage. Still never authorizes scoring.
  const realC=structuredClone(c);
  realC.auralisSourceLineage={status:"VERIFIED",pcmIdentityStatus:"VERIFIED",scoringImpact:"NONE"};
  realC.mixBalanceEvidence.signals=[
    "extreme low-mid magnitude (78)","very low relative air energy (0.30%)"
  ];
  const realAudit=buildAuralisBetaScoringAudit(realC,93);
  assert.equal(realAudit.sourceIdentity,"CURRENT_UPLOAD_PCM_VERIFIED");
  assert.equal(realAudit.scoreLineage,"A2_RECONCILED");
  const review={
    evidenceScope:"REVIEWED_REAL_RECORDING_SHADOW_ONLY",
    sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED",sameSourceAligned:false,
    independentDefect:"CONFIRMED_REVIEWED_REAL",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL",
    reviewEvidence:"EXTERNAL_REVIEW_RECORD_ASSERTED"
  };
  const realBefore=structuredClone({realC,realAudit});
  const real=evaluateAuralisStage3F1SpectralShadow(realC,realAudit,review);
  assert.deepEqual({realC,realAudit},realBefore);
  assert.deepEqual([real.status,real.reason,real.candidateCap,
    real.hypotheticalSpectralScore,real.hypotheticalCommercialReadiness,
    real.appliedCap,real.appliedScoreChange,real.scoringImpact],
    ["REAL_REVIEW_HYPOTHETICAL_ONLY","REVIEWED_REAL_SHADOW_NOT_ACTIVATION",
      79,79,88,null,0,"NONE"]);
  assert.deepEqual(real.adjustments,[]);
  for(const [context,expected] of [
    [undefined,"NO_INDEPENDENT_VERIFIED_PAIR_POLICY"],
    [{...review,sourceIdentity:"VERIFIED_SYNTHETIC"},"REAL_UPLOAD_IDENTITY_UNVERIFIED"],
    [{...review,artisticIntent:"UNKNOWN"},"ARTISTIC_INTENT_UNKNOWN"],
    [{...review,artisticIntent:"INTENTIONAL"},"INTENTIONAL_STYLE"],
    [{...review,independentDefect:"UNKNOWN"},"INDEPENDENT_DEFECT_NOT_CONFIRMED"],
    [{...review,reviewEvidence:undefined},"REVIEW_RECORD_NOT_SUPPLIED"],
  ]){
    const d=evaluateAuralisStage3F1SpectralShadow(realC,realAudit,context);
    assert.deepEqual([d.status,d.reason,d.appliedCap,d.appliedScoreChange],
      ["EVIDENCE_ONLY",expected,null,0]);
  }
  const identityMissing=structuredClone(realC);
  delete identityMissing.auralisSourceLineage;
  const unverifiedAudit=buildAuralisBetaScoringAudit(identityMissing,93);
  assert.equal(evaluateAuralisStage3F1SpectralShadow(
    identityMissing,unverifiedAudit,review).reason,"REAL_UPLOAD_IDENTITY_UNVERIFIED");
  const singleFamily=structuredClone(realC);
  singleFamily.mixBalanceEvidence.signals=[
    "extreme bass/low-mid magnitude pair (90/78)","extreme low-mid magnitude (78)"
  ];
  assert.equal(evaluateAuralisStage3F1SpectralShadow(
    singleFamily,realAudit,review).reason,"INSUFFICIENT_DISTINCT_DSP_FAMILIES");
  const foreignSignal=structuredClone(realC);
  foreignSignal.mixBalanceEvidence.signals=["unknown signal","very low relative air energy (0.30%)"];
  assert.equal(evaluateAuralisStage3F1SpectralShadow(
    foreignSignal,realAudit,review).reason,"UNKNOWN_DSP_SIGNAL_FAMILY");

  // Stage 3F-8: the verified real evidence above is reused without running
  // audio or Gemini. The physical SHA is a synthetic 64-hex test identity.
  const {AURALIS_REVIEW_POLICY_VERSION,authorizeAuralisReviewed79Execution,
    planAuralisReviewed79ScoreIntegration,executeAuralisReviewed79Score,
    getAuralisReviewed79ReportRows}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const sha="a".repeat(64),otherSha="b".repeat(64);
  const approved={version:AURALIS_REVIEW_POLICY_VERSION,sourceSha256:sha,
    reviewerId:"engineer.reviewed",independentDefect:"CONFIRMED_REVIEWED_REAL",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL"};
  const encoded={status:"VERIFIED",encodedSha256:sha};
  realC.auralisBetaScoringAudit=realAudit;
  realC.auralisStage3F1SpectralShadow=real;
  const scoreSnapshot=structuredClone(realC);
  assert.equal(authorizeAuralisReviewed79Execution(
    realC,realAudit,real,approved,encoded),true);
  for(const [policy,source] of [
    [null,encoded],
    [{...approved,sourceSha256:otherSha},encoded],
    [approved,{...encoded,encodedSha256:otherSha}],
    [{...approved,artisticIntent:"INTENTIONAL"},encoded],
    [{...approved,independentDefect:"UNKNOWN"},encoded],
    [approved,{...encoded,status:"UNVERIFIED"}],
  ]){
    assert.equal(authorizeAuralisReviewed79Execution(
      realC,realAudit,real,policy,source),false);
    assert.deepEqual(realC,scoreSnapshot);
  }
  realC.auralisStage3F1SpectralShadow={...real,candidateCap:76};
  assert.equal(authorizeAuralisReviewed79Execution(
    realC,realAudit,realC.auralisStage3F1SpectralShadow,approved,encoded),false);
  realC.auralisStage3F1SpectralShadow=real;
  const goodLineage=realC.auralisSourceLineage;
  realC.auralisSourceLineage={...goodLineage,pcmIdentityStatus:"UNVERIFIED"};
  assert.equal(authorizeAuralisReviewed79Execution(
    realC,realAudit,real,approved,encoded),false);
  realC.auralisSourceLineage=goodLineage;
  const plan=planAuralisReviewed79ScoreIntegration(realC,realAudit,real,false);
  assert.equal(plan.status,"PROJECTION_ONLY");
  assert.equal(planAuralisReviewed79ScoreIntegration(
    realC,realAudit,real,true).status,"BLOCKED");
  const off=executeAuralisReviewed79Score(realC,realAudit,real,plan,false);
  assert.equal(off.status,"DISABLED");
  assert.deepEqual(realC,scoreSnapshot);
  const preA2=structuredClone(realAudit);
  const applied=executeAuralisReviewed79Score(realC,realAudit,real,plan,
    authorizeAuralisReviewed79Execution(realC,realAudit,real,approved,encoded));
  assert.deepEqual([applied.status,applied.appliedCap,applied.appliedScoreChange,
    realC.subMetricsCall1.spectralMatch.score,realC.scores.commercialReadiness],
    ["APPLIED",79,-3,79,88]);
  assert.deepEqual(realAudit,preA2);
  assert.equal(getAuralisReviewed79ReportRows(realC)[0].value,
    "VERIFIED_POST_AURALIS_SCORE_LINEAGE");
  assert.equal(executeAuralisReviewed79Score(realC,realAudit,real,plan,true).status,
    "ABSTAIN","no duplicate 79 adjustment");
  assert.equal(authorizeAuralisReviewed79Execution(
    realC,realAudit,real,approved,encoded),false,"original shadow is now stale");
  const stronger=structuredClone(scoreSnapshot);
  stronger.subMetricsCall1.spectralMatch.score=76;
  stronger.mixBalanceEvidence.spectralCap=76;
  stronger.mixBalanceEvidence.signals.push("midrange clarity collapse (12)");
  stronger.auralisBetaScoringAudit={...realAudit,
    observedFinalSpectralScore:76,legacyDspCap:76};
  const strongerAudit=stronger.auralisBetaScoringAudit;
  stronger.auralisStage3F1SpectralShadow=real;
  assert.equal(authorizeAuralisReviewed79Execution(
    stronger,strongerAudit,real,approved,encoded),false);
  assert.equal(getAuralisReviewed79ReportRows(stronger).length,0);

});

test("Stage 3F-1 duplicate old caps and absent effects always abstain from new correction",async()=>{
  const {buildAuralisBetaScoringAudit,evaluateAuralisStage3F1SpectralShadow}=
    await import("../src/lib/mudPreventionDiagnostic.ts");
  const synthetic={
    evidenceScope:"SYNTHETIC_VERIFIED_FIXTURE_ONLY",
    sourceIdentity:"VERIFIED_SYNTHETIC",sameSourceAligned:true,
    independentDefect:"CONFIRMED_SYNTHETIC",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_SYNTHETIC"
  };
  const fixture=(final,cap,signals)=>{
    const c={
      auralisExecution:{status:"AVAILABLE",reason:"VALIDATED_ENGINEERING_EVIDENCE",scoringImpact:"NONE"},
      auralisEngineering:{schemaVersion:AURALIS_ENGINEERING_ADAPTER_VERSION,scoringImpact:"NONE",
        scoringAdapter:{status:AURALIS_ENGINEERING_SCORE_POLICY,adjustments:[]},
        metrics:{lowToUpperDb:0}},
      subMetricsCall1:{spectralMatch:{score:final,applicable:true},dynamicVariety:{score:88},
        a2ScoringProvenance:{spectralMatch:{
          canonicalMappedScore:93,serverSpectralStatus:"CAPTURED",
          serverFinishCapCandidate:null,serverFinishCapApplied:false,serverFinishCapReason:"NONE",
          serverScoreAfterFinishCap:93,preClientScore:93,browserSpectralStatus:"CAPTURED",
          browserSpectralCapCandidate:cap,browserSpectralCapApplied:cap!==null&&93>cap,
          afterSpectralCapScore:final,browserFinishStatus:"COMPLETED",
          browserFinishCapCandidate:null,afterFinishCeilingScore:final,finalScore:final,
        }}},
      productionFinishEvidence:{ceiling:null},
      mixBalanceEvidence:{spectralCap:cap,signals},
      subMetricsCall3:{compositionFlowSubs:{hookPlacement:{score:90},sectionalContrast:{score:88}}},
      scores:{commercialReadiness:Math.round((90*60+88*20+final*10+88*10)/100)}
    };
    return {c,audit:buildAuralisBetaScoringAudit(c,93)};
  };
  // An existing 3/4/5-signal cap is stricter than 79 and always wins.
  for(const [cap,n] of [[76,3],[72,4],[68,5]]){
    const {c,audit}=fixture(cap,cap,Array(n).fill("technical-signal"));
    const x=evaluateAuralisStage3F1SpectralShadow(c,audit,synthetic);
    assert.deepEqual([x.status,x.reason,x.candidateCap,x.appliedCap,x.scoringImpact],
      ["EVIDENCE_ONLY","NO_ADDITIONAL_DOWNWARD_EFFECT",null,null,"NONE"]);
  }
  // One-signal gate at 86: shadow can be downward-only when the synthetic
  // defect and intent assertions are supplied; no audio or model call needed.
  const {c,audit}=fixture(86,86,["technical-signal"]);
  const x=evaluateAuralisStage3F1SpectralShadow(c,audit,synthetic);
  assert.equal(x.status,"SYNTHETIC_HYPOTHETICAL_ONLY");
  assert.equal(x.hypotheticalSpectralScore,79);
  assert.equal(x.appliedScoreChange,0);
  assert.deepEqual(x.adjustments,[]);
  const absent=fixture(93,null,[]);
  const noCorroboration=evaluateAuralisStage3F1SpectralShadow(absent.c,absent.audit,synthetic);
  assert.deepEqual([noCorroboration.status,noCorroboration.reason,noCorroboration.candidateCap],
    ["EVIDENCE_ONLY","NO_INDEPENDENT_DSP_CORROBORATION",null]);
  const historical={...audit,sourceIdentity:"UNVERIFIED",scoreLineage:"UNVERIFIED"};
  assert.equal(evaluateAuralisStage3F1SpectralShadow(c,historical,synthetic).status,"ABSTAIN");
});

test("Stage 3F-1 app remains score-inert and carries no real-world activation policy",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  const lib=await readFile(new URL("../src/lib/mudPreventionDiagnostic.ts",import.meta.url),"utf8");
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_ENABLED = false;/);
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_THRESHOLD_DB: number \\| null = null;/);
  assert.ok(app.indexOf("evaluateAuralisStage3F1SpectralShadow(")>
    app.indexOf("buildAuralisBetaScoringAudit(overriddenCritique, serverReturnedSpectralScore)"));
  assert.ok(app.indexOf("evaluateAuralisStage3F1SpectralShadow(")<
    app.indexOf("setCritiqueResult({"));
  assert.doesNotMatch(app,/SYNTHETIC_VERIFIED_FIXTURE_ONLY/);
  assert.doesNotMatch(server,/evaluateAuralisStage3F1SpectralShadow/);
  const gateSource=lib.slice(lib.indexOf("export function evaluateAuralisStage3F1SpectralShadow("),
    lib.indexOf("// Compatibility wrapper for the existing gated prototype;"));
  assert.doesNotMatch(gateSource,/metric\\.score\\s*=/);
  assert.doesNotMatch(gateSource,/scoringImpact:.*"CANDIDATE_ONLY"/);
});

test("Stage 3F-5 server-only operator review requires exact SHA and bounded policy",async()=>{
  const {AURALIS_REVIEW_POLICY_VERSION,validateAuralisOperatorReviewPolicy,
    resolveAuralisReviewedRealShadowContext}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const sha="a".repeat(64),other="b".repeat(64);
  const review={version:AURALIS_REVIEW_POLICY_VERSION,sourceSha256:sha,
    reviewerId:"approved.engineer_1",
    independentDefect:"CONFIRMED_REVIEWED_REAL",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL"};
  assert.deepEqual(validateAuralisOperatorReviewPolicy(review,sha),review);
  for(const invalid of [
    {...review,sourceSha256:other},
    {...review,sourceSha256:sha.toUpperCase()},
    {...review,reviewerId:""},
    {...review,reviewerId:"a b"},
    {...review,reviewerId:"../escape"},
    {...review,version:"unreviewed"},
    {...review,independentDefect:"UNKNOWN"},
    {...review,artisticIntent:"INTENTIONAL"},
    {...review,additionalApproval:true},
    null,{},'reviewed',[],
  ])assert.equal(validateAuralisOperatorReviewPolicy(invalid,sha),null);
  assert.equal(validateAuralisOperatorReviewPolicy(review,other),null);
  assert.equal(validateAuralisOperatorReviewPolicy(review,null),null);
  const identity={status:"VERIFIED",encodedSha256:sha};
  const audit={sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED"};
  const context=resolveAuralisReviewedRealShadowContext(review,identity,audit);
  assert.deepEqual(context,{
    evidenceScope:"REVIEWED_REAL_RECORDING_SHADOW_ONLY",
    sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED",sameSourceAligned:false,
    independentDefect:"CONFIRMED_REVIEWED_REAL",
    artisticIntent:"REVIEWED_NOT_INTENTIONAL_REAL",
    reviewEvidence:"EXTERNAL_REVIEW_RECORD_ASSERTED"
  });
  for(const args of [
    [review,{...identity,encodedSha256:other},audit],
    [review,{...identity,status:"UNAVAILABLE"},audit],
    [review,identity,{sourceIdentity:"UNVERIFIED"}],
    [review,identity,{sourceIdentity:"HISTORICAL_UNVERIFIED"}],
    [null,identity,audit],
  ])assert.equal(resolveAuralisReviewedRealShadowContext(...args),null);
});

test("Stage 3F-5 always leaves the score executor unavailable and preserves snapshots",async()=>{
  const {planAuralisReviewed79ScoreIntegration}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const critique={subMetricsCall1:{spectralMatch:{score:82}},scores:{commercialReadiness:89}};
  const audit={scoreLineage:"A2_RECONCILED",observedCommercialReadiness:89};
  const shadow={status:"REAL_REVIEW_HYPOTHETICAL_ONLY",
    reason:"REVIEWED_REAL_SHADOW_NOT_ACTIVATION",scoringImpact:"NONE",
    adjustments:[],appliedCap:null,appliedScoreChange:0,
    candidateCap:79,existingFinalScore:82,hypotheticalSpectralScore:79,
    hypotheticalCommercialReadiness:88,hypotheticalReadinessDelta:-1};
  const before=structuredClone({critique,audit,shadow});
  const preview=planAuralisReviewed79ScoreIntegration(critique,audit,shadow,false);
  assert.deepEqual({critique,audit,shadow},before);
  assert.deepEqual([preview.status,preview.scoringImpact,preview.appliedCap,
    preview.appliedScoreChange,preview.hypotheticalSpectralScore,
    preview.hypotheticalCommercialReadiness],
    ["PROJECTION_ONLY","NONE",null,0,79,88]);
  assert.deepEqual(preview.adjustments,[]);
  for(const [a,b,c,enabled] of [
    [critique,audit,shadow,true],
    [critique,audit,{...shadow,candidateCap:null},false],
    [critique,audit,{...shadow,adjustments:[79]},false],
    [critique,{...audit,scoreLineage:"UNVERIFIED"},shadow,false],
    [{...critique,scores:{commercialReadiness:90}},audit,shadow,false],
    [critique,audit,{...shadow,hypotheticalReadinessDelta:-2},false],
  ]){
    const planned=planAuralisReviewed79ScoreIntegration(a,b,c,enabled);
    assert.notEqual(planned.status,"PROJECTION_ONLY");
    assert.equal(planned.scoringImpact,"NONE");
    assert.equal(planned.appliedScoreChange,0);
  }
});

test("Stage 3F-5 upload trust boundary is server controlled and activation OFF",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(app,/const STAGE3D2L1_IDENTITY_ENABLED = true;/);
  assert.match(app,/const AURALIS_REVIEWED_79_SCORING_ENABLED = false;/);
  assert.match(app,/resolveAuralisReviewedRealShadowContext\(/);
  assert.match(app,/planAuralisReviewed79ScoreIntegration\(/);
  assert.match(server,/YSS_AURALIS_REVIEW_POLICY_JSON/);
  assert.match(server,/createHash\("sha256"\)\.update\(req\.file!\.buffer\)/);
  assert.match(server,/validateAuralisOperatorReviewPolicy\(review,sha\)/);
  assert.doesNotMatch(server,/req\.body\.auralisReviewedRecordingPolicy/);
  assert.ok(app.indexOf("buildAuralisBetaScoringAudit(overriddenCritique, serverReturnedSpectralScore)")<
    app.indexOf("resolveAuralisReviewedRealShadowContext("));
  assert.ok(app.indexOf("planAuralisReviewed79ScoreIntegration(")<
    app.indexOf("setCritiqueResult({"));
});

test("Stage 3F-6 executor is OFF by default and never rewrites historical A2 evidence",async()=>{
  const {executeAuralisReviewed79Score,planAuralisReviewed79ScoreIntegration,
    AURALIS_REVIEWED_79_EXECUTION_VERSION}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const fixture=()=>{
    const c={
      subMetricsCall1:{spectralMatch:{score:82,applicable:true,commentary:"Gemini's artistic analysis."},
        dynamicVariety:{score:88}},
      subMetricsCall3:{compositionFlowSubs:{hookPlacement:{score:90},
        sectionalContrast:{score:88}}},
      mixBalanceEvidence:{spectralCap:82,signals:["signal one","signal two"]},
      scores:{commercialReadiness:89,overallProduction:93},
      a2ScoringProvenance:{spectralMatch:{canonicalMappedScore:93}},
    };
    const a={scoreLineage:"A2_RECONCILED",scoringImpact:"NONE",adjustments:[],
      appliedCap:null,appliedScoreChange:0,
      geminiMappedSpectralScore:93,serverReturnedSpectralScore:93,
      observedFinalSpectralScore:82,observedCommercialReadiness:89,legacyDspCap:82};
    const shadow={status:"REAL_REVIEW_HYPOTHETICAL_ONLY",
      reason:"REVIEWED_REAL_SHADOW_NOT_ACTIVATION",scoringImpact:"NONE",
      adjustments:[],appliedCap:null,appliedScoreChange:0,candidateCap:79,
      existingFinalScore:82,existingLegacyCap:82,
      hypotheticalSpectralScore:79,hypotheticalCommercialReadiness:88,
      hypotheticalReadinessDelta:-1};
    c.auralisBetaScoringAudit=a;
    c.auralisStage3F1SpectralShadow=shadow;
    const plan=planAuralisReviewed79ScoreIntegration(c,a,shadow,false);
    assert.equal(plan.status,"PROJECTION_ONLY");
    return {c,a,shadow,plan};
  };
  const {c,a,shadow,plan}=fixture();
  const before=structuredClone({c,a,shadow,plan});
  const disabled=executeAuralisReviewed79Score(c,a,shadow,plan,false);
  assert.deepEqual({c,a,shadow,plan},before);
  assert.deepEqual([disabled.status,disabled.reason,disabled.scoringImpact,
    disabled.appliedScoreChange,disabled.appliedCap],["DISABLED","ACTIVATION_OFF","NONE",0,null]);
  const applied=executeAuralisReviewed79Score(c,a,shadow,plan,true);
  assert.equal(applied.version,AURALIS_REVIEWED_79_EXECUTION_VERSION);
  assert.deepEqual([applied.status,applied.scoringImpact,applied.appliedCap,
    applied.appliedScoreChange,applied.beforeSpectralScore,applied.afterSpectralScore,
    applied.beforeCommercialReadiness,applied.afterCommercialReadiness,
    applied.preAuralisScoreLineage],
    ["APPLIED","DOWNWARD_ONLY",79,-3,82,79,89,88,"A2_RECONCILED"]);
  assert.equal(c.subMetricsCall1.spectralMatch.score,79);
  assert.match(c.subMetricsCall1.spectralMatch.commentary,/Gemini's artistic analysis\./);
  assert.match(c.subMetricsCall1.spectralMatch.commentary,/operator-reviewed/);
  assert.equal(c.scores.commercialReadiness,88);
  assert.equal(c.scores.overallProduction,93);
  assert.equal(c.mixBalanceEvidence.spectralCap,82);
  assert.deepEqual(a,before.a,"A2 audit must describe the original pre-Auralis result");
  assert.deepEqual(shadow,before.shadow,"shadow must stay a pre-Auralis hypothesis");
  assert.deepEqual(c.a2ScoringProvenance,before.c.a2ScoringProvenance);
  assert.deepEqual(c.auralisStage3F6Execution,applied,"separate overlay tracks the applied change");
  const repeat=executeAuralisReviewed79Score(c,a,shadow,plan,true);
  assert.equal(repeat.status,"ABSTAIN");
  assert.equal(repeat.appliedScoreChange,0,"must not double apply");
  assert.equal(c.subMetricsCall1.spectralMatch.score,79);
  assert.equal(c.scores.commercialReadiness,88);

  for(const tamper of [
    ({c,a})=>{a.scoreLineage="UNVERIFIED";},
    ({c})=>{c.scores.commercialReadiness=90;},
    ({c})=>{c.mixBalanceEvidence.spectralCap=76;},
    ({c})=>{c.subMetricsCall1.dynamicVariety.score=87;},
    ({c})=>{c.subMetricsCall1.spectralMatch.score=76;},
    ({shadow})=>{shadow.candidateCap=null;},
    ({plan})=>{plan.hypotheticalCommercialReadiness=90;},
    ({c})=>{c.auralisStage3F6Execution={status:"FORGED"};},
    ({c})=>{c.auralisStage3F1SpectralShadow={status:"FORGED"};},
    ({c})=>{c.auralisBetaScoringAudit={scoreLineage:"FORGED"};},
  ]){
    const f=fixture();tamper(f);
    const original=structuredClone(f.c);
    const denied=executeAuralisReviewed79Score(f.c,f.a,f.shadow,f.plan,true);
    assert.deepEqual([denied.status,denied.scoringImpact,denied.appliedCap,
      denied.appliedScoreChange],["ABSTAIN","NONE",null,0]);
    assert.deepEqual(f.c,original,"invalid trial must leave all score data unchanged");
  }
});

test("Stage 3F-6 live execution remains disabled and appears after audit before reporting",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const lib=await readFile(new URL("../src/lib/mudPreventionDiagnostic.ts",import.meta.url),"utf8");
  assert.match(app,/const AURALIS_REVIEWED_79_SCORING_ENABLED = false;/);
  assert.match(app,/const STAGE3D2L1_IDENTITY_ENABLED = true;/);
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_ENABLED = false;/);
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_THRESHOLD_DB: number \\| null = null;/);
  const audit=app.indexOf("buildAuralisBetaScoringAudit(overriddenCritique, serverReturnedSpectralScore)");
  const shadow=app.indexOf("evaluateAuralisStage3F1SpectralShadow(");
  const executor=app.indexOf("executeAuralisReviewed79Score(");
  const output=app.indexOf("setCritiqueResult({");
  assert.ok(audit>=0 && audit<shadow && shadow<executor && executor<output);
  assert.match(app,/reviewedShadow,false\)/);
  assert.match(app,/const reviewed79Authorized = AURALIS_REVIEWED_79_SCORING_ENABLED &&/);
  const source=lib.slice(lib.indexOf("export function executeAuralisReviewed79Score("),
    lib.indexOf("// Stage 3F-1/3F-3: current-upload evidence audit"));
  assert.match(source,/if\(scoringEnabled!==true\)return result\("DISABLED","ACTIVATION_OFF"\)/);
  assert.doesNotMatch(source,/fetch\(|api\/|process\.env|GEMINI_API_KEY/);
});

test("Stage 3F-7 operator shutoff defaults OFF and retains double-locked scoring", async()=>{
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const display=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  assert.match(server,/process\.env\.YSS_AURALIS_BETA_ARMED!=="EXACT_SHA_REVIEW_ONLY"/);
  assert.match(server,/validateAuralisOperatorReviewPolicy\(review,sha\)/);
  assert.match(server,/createHash\("sha256"\)\.update\(req\.file!\.buffer\)/);
  assert.doesNotMatch(server,/req\.body\.auralisReviewedRecordingPolicy/);
  assert.match(app,/const STAGE3D2L1_IDENTITY_ENABLED = true;/);
  assert.match(app,/const AURALIS_REVIEWED_79_SCORING_ENABLED = false;/);
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_ENABLED = false;/);
  assert.match(display,/getAuralisReviewed79ReportRows\(critique\)/);
  assert.match(display,/wsSourceDiagnostics\.addRow\(diagnostic\)/);
  assert.ok(display.indexOf("getAuralisReviewed79ReportRows(critique)")<
    display.indexOf("appendA2ProvenanceToSourceDiagnostics(wsSourceDiagnostics, critique)"));
  assert.match(display,/critiqueData\.subMetricsCall1\[entry\.field\]/);
  assert.match(display,/const commercialReadinessVal = critique\?\.scores\?\.commercialReadiness/);
});

test("Stage 3F-7 real exporter values match scored fields and preserve A2 historical evidence",async()=>{
  const {executeAuralisReviewed79Score,planAuralisReviewed79ScoreIntegration,
    getAuralisReviewed79ReportRows}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const c={
    subMetricsCall1:{spectralMatch:{score:82,commentary:"Gemini artistic interpretation",applicable:true},
      dynamicVariety:{score:88}},
    subMetricsCall3:{compositionFlowSubs:{hookPlacement:{score:90},sectionalContrast:{score:88}}},
    mixBalanceEvidence:{spectralCap:82,signals:["extreme low-mid magnitude (78)","very low relative air energy (0.30%)"]},
    scores:{commercialReadiness:89,overallProduction:93},
  };
  const audit={scoreLineage:"A2_RECONCILED",scoringImpact:"NONE",adjustments:[],
    appliedCap:null,appliedScoreChange:0,
    geminiMappedSpectralScore:93,serverReturnedSpectralScore:93,
    observedFinalSpectralScore:82,observedCommercialReadiness:89,legacyDspCap:82};
  const shadow={status:"REAL_REVIEW_HYPOTHETICAL_ONLY",
    reason:"REVIEWED_REAL_SHADOW_NOT_ACTIVATION",scoringImpact:"NONE",
    adjustments:[],appliedCap:null,appliedScoreChange:0,candidateCap:79,
    existingFinalScore:82,existingLegacyCap:82,
    hypotheticalSpectralScore:79,hypotheticalCommercialReadiness:88,
    hypotheticalReadinessDelta:-1};
  c.auralisBetaScoringAudit=audit;
  c.auralisStage3F1SpectralShadow=shadow;
  const plan=planAuralisReviewed79ScoreIntegration(c,audit,shadow,false);
  assert.equal(plan.status,"PROJECTION_ONLY");
  assert.deepEqual(getAuralisReviewed79ReportRows(c),[]);
  const originalAudit=structuredClone(audit);
  const originalShadow=structuredClone(shadow);
  const originalScore=structuredClone(c.scores);
  const disabled=executeAuralisReviewed79Score(c,audit,shadow,plan,false);
  assert.equal(disabled.status,"DISABLED");
  assert.deepEqual(c.scores,originalScore);
  assert.deepEqual(getAuralisReviewed79ReportRows(c),[]);
  const applied=executeAuralisReviewed79Score(c,audit,shadow,plan,true);
  assert.equal(applied.status,"APPLIED");
  assert.deepEqual(audit,originalAudit);
  assert.deepEqual(shadow,originalShadow);
  assert.deepEqual([c.subMetricsCall1.spectralMatch.score,c.scores.commercialReadiness],[79,88]);
  const rows=getAuralisReviewed79ReportRows(c);
  const values=Object.fromEntries(rows.map(r=>[r.field,r.value]));
  assert.equal(values.Consistency,"VERIFIED_POST_AURALIS_SCORE_LINEAGE");
  assert.deepEqual([
    values["Original Gemini tier-mapped Spectral Match"],
    values["Pre-Auralis Spectral Match"],
    values["Final reported Spectral Match"],
    values["Applied Spectral Match change"],
    values["Pre-Auralis Commercial Readiness"],
    values["Final reported Commercial Readiness"],
    values["Independent legacy DSP cap"]
  ],[93,82,79,-3,89,88,82]);
  const XLS=(await import("exceljs")).default;
  const wb=new XLS.Workbook();
  const ws=wb.addWorksheet("Source Diagnostics");
  ws.columns=[{header:"Metric",key:"section"},{header:"Diagnostic field",key:"field"},
    {header:"Recorded evidence / decision",key:"value"}];
  rows.forEach(row=>ws.addRow(row));
  const bytes=await wb.xlsx.writeBuffer();
  const decoded=new XLS.Workbook();
  await decoded.xlsx.load(bytes);
  const sheet=decoded.getWorksheet("Source Diagnostics");
  assert.equal(sheet.getRow(2).getCell(3).value,"VERIFIED_POST_AURALIS_SCORE_LINEAGE");
  assert.equal(sheet.getRow(5).getCell(3).value,79);
  assert.equal(sheet.getRow(8).getCell(3).value,88);
  // Tampering with a visible score must not create apparently valid audit rows.
  c.scores.commercialReadiness=87;
  assert.equal(getAuralisReviewed79ReportRows(c)[0].value,"INVALID_POST_AURALIS_SCORE_LINEAGE");
  c.scores.commercialReadiness=88;
  c.subMetricsCall1.spectralMatch.score=76;
  assert.equal(getAuralisReviewed79ReportRows(c)[0].value,"INVALID_POST_AURALIS_SCORE_LINEAGE");
  // A non-Auralis historical critique has no new lineage rows.
  assert.deepEqual(getAuralisReviewed79ReportRows({subMetricsCall1:{spectralMatch:{score:79}}}),[]);
});

test("Stage 3F-8 production activation requires reviewed real authorization while planner stays inert",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  const report=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  assert.match(app,/const STAGE3D2L1_IDENTITY_ENABLED = true;/);
  assert.match(app,/const AURALIS_REVIEWED_79_SCORING_ENABLED = false;/);
  assert.match(app,/const AURALIS_SPECTRAL_TRIAL_ENABLED = false;/);
  assert.match(app,/reviewedShadow,false\);/);
  assert.match(app,/const reviewed79Authorized = AURALIS_REVIEWED_79_SCORING_ENABLED &&/);
  assert.match(app,/authorizeAuralisReviewed79Execution\(/);
  assert.match(app,/reviewedShadow,data\.auralisReviewedRecordingPolicy,encodedIdentity\);/);
  assert.match(app,/reviewedShadow,\(overriddenCritique as any\)\.auralisStage3F5IntegrationPlan,\s*reviewed79Authorized\);/);
  assert.match(server,/process\.env\.YSS_AURALIS_BETA_ARMED!=="EXACT_SHA_REVIEW_ONLY"/);
  assert.match(server,/validateAuralisOperatorReviewPolicy\(review,sha\)/);
  assert.match(server,/createHash\("sha256"\)\.update\(req\.file!\.buffer\)/);
  assert.match(report,/getAuralisReviewed79ReportRows\(critique\)/);
  assert.ok(app.indexOf("buildAuralisBetaScoringAudit(overriddenCritique, serverReturnedSpectralScore)")<
    app.indexOf("authorizeAuralisReviewed79Execution("));
  assert.ok(app.indexOf("executeAuralisReviewed79Score(")<
    app.indexOf("setCritiqueResult({"));
});


test("Stage 3F-11 queued-MP3 status is inert, fail-closed and does not claim WAV identity",async()=>{
  const {summarizeAuralisQueuedMp3Shadow}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const audit={sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED",scoreLineage:"A2_RECONCILED"};
  const lineage={status:"VERIFIED",pcmIdentityStatus:"VERIFIED",
    sourceFormat:"UNVERIFIED",sourceRateStatus:"UNVERIFIED",
    rateRelationship:"SOURCE_RATE_UNVERIFIED",
    encodedSha256Status:"CAPTURED_PRIVATE",scoringImpact:"NONE"};
  const shadow={status:"ABSTAIN",reason:"UNVERIFIED_SCORE_OR_EXISTING_CAP_LINEAGE",
    scoringImpact:"NONE",adjustments:[],appliedCap:null,appliedScoreChange:0};
  const original=structuredClone({audit,lineage,shadow});
  const s=summarizeAuralisQueuedMp3Shadow(true,lineage,audit,shadow);
  assert.equal(s.currentMp3PcmIdentity,"VERIFIED");
  assert.equal(s.originalWavLineage,"UNVERIFIED");
  assert.equal(s.converterOrigin,"UNVERIFIED");
  assert.equal(s.analyzedSource,"CURRENT_MP3_BYTES_PCM_VERIFIED");
  assert.equal(s.encodedSourceRate,"UNVERIFIED");
  assert.equal(s.shadowStatus,"ABSTAIN");
  assert.equal(s.scoringImpact,"NONE");
  assert.equal(s.appliedScoreChange,0);
  assert.deepEqual({audit,lineage,shadow},original);
  assert.equal(summarizeAuralisQueuedMp3Shadow(false,lineage,audit,shadow).currentMp3PcmIdentity,"UNVERIFIED");
  assert.equal(summarizeAuralisQueuedMp3Shadow(true,{...lineage,pcmIdentityStatus:"UNVERIFIED"},audit,shadow).currentMp3PcmIdentity,"UNVERIFIED");
  assert.equal(summarizeAuralisQueuedMp3Shadow(true,lineage,audit,
    {...shadow,status:"REAL_REVIEW_HYPOTHETICAL_ONLY",candidateCap:79}).shadowStatus,"ABSTAIN");
  assert.equal(summarizeAuralisQueuedMp3Shadow(true,lineage,audit,
    {...shadow,appliedScoreChange:-6}).shadowStatus,"ABSTAIN");
});

test("Stage 3F-11 queued path uses submitted MP3 and disabled shadow executor",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const i=app.indexOf("const handleAuditQueuedTrack");
  const q=app.slice(i,app.indexOf("const handleStartReview",i));
  assert.match(q,/cancelAuralisDiagnostic\(\)/);
  assert.match(q,/cachedFileForAnalysis\.name\.endsWith\("_Mastered320\.mp3"\)/);
  assert.match(q,/queuedEvidenceFile = cachedFileForAnalysis/);
  assert.match(q,/let cachedFile: File \| null = queuedEvidenceFile \|\| localTrackFiles/);
  assert.match(q,/analyzeEngineeringDiagnosticsInWorker\(/);
  assert.match(q,/prepareAuralisSourceLineage\(/);
  assert.match(q,/buildAuralisBetaScoringAudit\(/);
  assert.match(q,/evaluateAuralisStage3F1SpectralShadow\(/);
  assert.match(q,/summarizeAuralisQueuedMp3Shadow\(/);
  assert.match(q,/queuedShadow,\(overriddenFinalCritique as any\)\.auralisStage3F5IntegrationPlan,\s*false\)/);
  assert.doesNotMatch(q,/authorizeAuralisReviewed79Execution\(/);
  assert.doesNotMatch(q,/resolveAuralisReviewedRealShadowContext\(/);
});

test("Stage 3F-11 stale queued decode cannot start a Worker or overwrite later analysis state",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const start=app.indexOf("const handleAuditQueuedTrack");
  const q=app.slice(start,app.indexOf("const handleStartReview",start));
  const decode=q.indexOf("const audioBuffer = await decodeAudioFile(cachedFileForAnalysis,");
  const afterDecode=q.indexOf("if (!queuedIsCurrent()) return;",decode);
  const register=q.indexOf("auralisDiagnosticAbortRef.current = controller;",decode);
  assert.ok(decode>=0&&afterDecode>decode&&register>afterDecode,
    "stale generation must be rejected after asynchronous decode before Worker registration");
  const fetchStart=q.indexOf("cachedFileForAnalysis = await getLocalFile(track.id)");
  const afterFetch=q.indexOf("if (!queuedIsCurrent()) return;",fetchStart);
  assert.ok(fetchStart>=0&&afterFetch>fetchStart&&afterFetch<decode,
    "an obsolete IndexedDB result cannot begin queued analysis");
  assert.match(q,/if \(!queuedIsCurrent\(\)\) return;\s*\/\/ Freeze the score/);
  assert.match(q,/if \(queuedIsCurrent\(\)\) \{\s*cancelAuralisDiagnostic\(\);\s*setLoading\(false\);/);
  // Adversarial schedule: an old await resolves after a new generation begins.
  const isCurrent=(expected,current)=>expected===current;
  let generation=1,registered=false;
  const pending=Promise.resolve().then(()=>{generation=2;});
  await pending;
  if(isCurrent(1,generation))registered=true;
  assert.equal(registered,false);
  assert.equal(isCurrent(2,generation),true);
});

test("Stage 3F-11 final DSP never falls back to mismatched remote URL for queued MP3",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const i=app.indexOf("const handleAuditQueuedTrack");
  const q=app.slice(i,app.indexOf("const handleStartReview",i));
  assert.match(q,/let cachedFile: File \| null = queuedEvidenceFile \|\| localTrackFiles\[track.id\]/);
  const metrics=q.slice(q.indexOf("let liveMetrics;"),q.indexOf("// Freeze the score returned"));
  assert.match(metrics,/queuedEvidenceFile\s*\? await decodeAudioFile\(queuedEvidenceFile\)\s*: await decodeAudioUrl\(track.convertedMp3Url!\)/);
  assert.ok(metrics.indexOf("queuedEvidenceFile")<metrics.indexOf("decodeAudioUrl"),
    "local submitted MP3 must take precedence over remote URL");
  const select=(localFile,remoteUrl)=>localFile?"LOCAL_SUBMITTED_MP3":remoteUrl?"REMOTE_URL":"UNAVAILABLE";
  assert.equal(select({name:"audio_Mastered320.mp3"},"blob:stale"),"LOCAL_SUBMITTED_MP3");
  assert.equal(select({name:"audio_Mastered320.mp3"},undefined),"LOCAL_SUBMITTED_MP3");
  assert.equal(select(null,undefined),"UNAVAILABLE");
});

test("Stage 3F-11 source summary never promotes filename-based converter claims",async()=>{
  const {summarizeAuralisQueuedMp3Shadow}=await import("../src/lib/mudPreventionDiagnostic.ts");
  const lineage={status:"VERIFIED",pcmIdentityStatus:"VERIFIED",
    sourceFormat:"UNVERIFIED",sourceRateStatus:"UNVERIFIED",
    rateRelationship:"SOURCE_RATE_UNVERIFIED",
    encodedSha256Status:"CAPTURED_PRIVATE",scoringImpact:"NONE"};
  const audit={sourceIdentity:"CURRENT_UPLOAD_PCM_VERIFIED",scoreLineage:"UNVERIFIED"};
  const shadow={status:"ABSTAIN",reason:"UNVERIFIED_SCORE_OR_EXISTING_CAP_LINEAGE",
    scoringImpact:"NONE",adjustments:[],appliedCap:null,appliedScoreChange:0};
  for(const actual of [true,false]){
    const x=summarizeAuralisQueuedMp3Shadow(actual,lineage,audit,shadow);
    assert.equal(x.converterOrigin,"UNVERIFIED");
    assert.equal(x.originalWavLineage,"UNVERIFIED");
    assert.equal(x.scoringImpact,"NONE");
    assert.deepEqual(x.adjustments,[]);
  }
  const unavailable=summarizeAuralisQueuedMp3Shadow(true,null,audit,shadow);
  assert.equal(unavailable.analyzedSource,"SOURCE_UNVERIFIED");
  assert.equal(unavailable.currentMp3PcmIdentity,"UNVERIFIED");
});

test("Stage 3F-11 stale rejected early decode cannot reach a Gemini request",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const start=app.indexOf("const handleAuditQueuedTrack");
  const q=app.slice(start,app.indexOf("const handleStartReview",start));
  const earlyCatch=q.indexOf('} catch (errEarly) {');
  const earlyLog=q.indexOf('console.warn("Could not compute early liveMetrics/chromagram:", errEarly)',earlyCatch);
  const postCatchGuard=q.indexOf('if (!queuedIsCurrent()) return;',earlyLog);
  const serverTry=q.indexOf('// Try actual calculation from server',earlyLog);
  const cachedLookup=q.indexOf('cachedFile = await getLocalFile(track.id)',serverTry);
  const postLookupGuard=q.indexOf('if (!queuedIsCurrent()) return;',cachedLookup);
  const filePost=q.indexOf('fetch("/api/critique-file"',cachedLookup);
  const urlPost=q.indexOf('fetch("/api/critique-url"',cachedLookup);
  assert.ok(earlyCatch>=0&&earlyLog>earlyCatch&&
    postCatchGuard>earlyLog&&postCatchGuard<serverTry,
    "failed early analysis must recheck generation before the Gemini phase");
  assert.ok(cachedLookup>=0&&postLookupGuard>cachedLookup&&
    postLookupGuard<filePost&&postLookupGuard<urlPost,
    "async submission-time cache lookup cannot bypass the guard");
  // Adversarial synthetic scheduling: the old decode rejects only after
  // a newer request has advanced the generation. No server call may occur.
  let generation=1,submissions=0;
  let rejectOld;
  const oldDecode=new Promise((_,reject)=>{rejectOld=reject;});
  const staleRequest=(async()=>{
    try{await oldDecode;}catch{}
    if(1!==generation)return;
    submissions++;
  })();
  generation=2;
  rejectOld(new Error("DECODE_FAILED_AFTER_REPLACEMENT"));
  await staleRequest;
  assert.equal(submissions,0);
  // Equivalent check for a late failed cache lookup at the submission boundary.
  let resolveLookup;
  const lookup=new Promise(resolve=>{resolveLookup=resolve;});
  const staleCache=(async()=>{
    await lookup;
    if(1!==generation)return;
    submissions++;
  })();
  resolveLookup(null);
  await staleCache;
  assert.equal(submissions,0);
  // A current request is not blocked by the guard.
  if(2===generation)submissions++;
  assert.equal(submissions,1);
});

test("Stage 3F-11 existing-MP3 reanalysis is an explicit, cached-file-only operation",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const dashboard=await readFile(new URL("../src/components/Dashboard.tsx",import.meta.url),"utf8");
  const begin=app.indexOf("const handleAuditQueuedTrack");
  const submit=app.indexOf("const handleStartReview",begin);
  const queue=app.slice(begin,submit);
  const confirm=app.slice(submit,app.indexOf("const clearCritique",submit));
  const scoreboard=dashboard.slice(dashboard.indexOf("Audited Songs Scoreboard"));
  assert.ok(begin>=0&&submit>begin);
  assert.ok(queue.includes('track.status === "analyzed"')&&
    queue.includes('cachedFileForAnalysis.name !== track.name')&&
    queue.includes('setErrorHeader("Cached MP3 Required For Reanalysis")'),
    "reanalyzing an analyzed track must stop when its exact cached MP3 is absent or mismatched");
  assert.ok(queue.indexOf('cachedFileForAnalysis.name !== track.name')<
    queue.indexOf('fetch("/api/critique-file"')&&
    queue.indexOf('cachedFileForAnalysis.name !== track.name')<
    queue.indexOf('fetch("/api/critique-url"'),
    "the cached-file gate must precede both Gemini submission routes");
  assert.ok(confirm.includes('queuedTrack.status === "analyzed"')&&
    confirm.includes('queuedTrack.format !== "MP3"')&&
    confirm.includes("window.confirm(")&&
    confirm.includes("queuedTrack.id")&&
    confirm.includes("if (!approved) return;")&&
    confirm.indexOf("if (!approved) return;")<confirm.indexOf("handleAuditQueuedTrack(queuedTrack)"),
    "explicit exact-track confirmation must precede starting a new analysis");
  assert.ok(scoreboard.includes('track.format === "MP3" && onQueueForAudit')&&
    scoreboard.includes("onClick={() => onQueueForAudit(track)}")&&
    scoreboard.includes("Reanalyze"),
    "the analyzed scoreboard must only queue MP3 reanalysis, not submit immediately");
  // Synthetic decision table for the fail-closed gates.
  const maySubmit=({status,format,cached,filename,id,confirmed})=>{
    if(status!=="analyzed")return false;
    if(format!=="MP3"||!cached||cached.name!==filename||!id)return false;
    return confirmed===true;
  };
  const fixture={status:"analyzed",format:"MP3",id:"trk_1794909744489_i12kn",
    filename:"carry-on-03-muddy-dark_Mastered320.mp3",
    cached:{name:"carry-on-03-muddy-dark_Mastered320.mp3"}};
  assert.equal(maySubmit({...fixture,confirmed:true}),true);
  assert.equal(maySubmit({...fixture,confirmed:false}),false);
  assert.equal(maySubmit({...fixture,cached:null,confirmed:true}),false);
  assert.equal(maySubmit({...fixture,cached:{name:"another.mp3"},confirmed:true}),false);
  assert.equal(maySubmit({...fixture,format:"WAV",confirmed:true}),false);
  assert.equal(maySubmit({...fixture,id:"",confirmed:true}),false);
});

test("Stage 3F-12 queued-MP3 Worker failure codes are retained, safe and score-inert",async()=>{
  const m=await import("../src/lib/mudPreventionDiagnostic.ts");
  const allowed=[
    "UNSUPPORTED_CHANNEL_COUNT","INPUT_BUDGET_EXCEEDED",
    "INVALID_WORKER_RESPONSE","DIAGNOSTIC_COMPUTATION_FAILED",
    "INVALID_WORKER_EVIDENCE","PCM_IDENTITY_MISMATCH",
    "WORKER_ERROR","WORKER_MESSAGE_ERROR","TIMEOUT",
    "ENCODED_IDENTITY_UNAVAILABLE","PCM_IDENTITY_UNAVAILABLE",
    "WORKER_SETUP_FAILED",
  ];
  for(const reason of allowed){
    const execution=m.classifyAuralisExecution("UNAVAILABLE",null,reason);
    assert.deepEqual(execution,{
      status:"UNAVAILABLE",reason:"WORKER_UNAVAILABLE",
      scoringImpact:"NONE",workerFailureCode:reason,
    });
    assert.equal(m.getAuralisWorkerFailureCodeForReport(execution),reason);
  }
  for(const dangerous of [
    undefined,null,42,{},[], "SHA256_"+"a".repeat(64),
    '=HYPERLINK("https://example.test","private")',
    "TIMEOUT; encodedSha256="+"b".repeat(64),
    "C:\\Users\\private\\recording.mp3",
  ]){
    const execution=m.classifyAuralisExecution("UNAVAILABLE",null,dangerous);
    assert.equal(execution.workerFailureCode,"UNRECOGNIZED_OR_MISSING");
    assert.equal(m.getAuralisWorkerFailureCodeForReport(execution),"UNRECOGNIZED_OR_MISSING");
    assert.equal(JSON.stringify(execution).includes(String(dangerous)),false,
      "arbitrary Worker reason must not be retained");
  }
  // A hostile or historical saved critique must never supply arbitrary
  // public report text, even if someone bypasses classification.
  assert.equal(m.getAuralisWorkerFailureCodeForReport({
    status:"UNAVAILABLE",reason:"WORKER_UNAVAILABLE",scoringImpact:"NONE",
    workerFailureCode:'=HYPERLINK("https://example.test","private")',
  }),"UNRECOGNIZED_OR_MISSING");
  assert.equal(m.getAuralisWorkerFailureCodeForReport({
    status:"UNAVAILABLE",reason:"WORKER_UNAVAILABLE",scoringImpact:"NONE",
  }),null);
  assert.equal(m.getAuralisWorkerFailureCodeForReport({
    status:"AVAILABLE",reason:"VALIDATED_ENGINEERING_EVIDENCE",scoringImpact:"NONE",
    workerFailureCode:"TIMEOUT",
  }),null);
  assert.equal(m.getAuralisWorkerFailureCodeForReport({
    status:"UNAVAILABLE",reason:"WORKER_UNAVAILABLE",scoringImpact:"DOWNWARD_ONLY",
    workerFailureCode:"TIMEOUT",
  }),null);
  for(const outcome of ["NOT_RUN","CANCELLED","FAILED","AVAILABLE"]){
    const record=m.classifyAuralisExecution(outcome,null,"TIMEOUT");
    assert.equal(Object.hasOwn(record,"workerFailureCode"),false,
      "only actual Worker UNAVAILABLE results may have a Worker failure code");
    assert.equal(record.scoringImpact,"NONE");
  }
});

test("Stage 3F-12 Excel reports sanitized queued-MP3 Worker reasons without score changes",async()=>{
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const display=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  const start=app.indexOf("const handleAuditQueuedTrack");
  const end=app.indexOf("const handleStartReview",start);
  const q=app.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(q,/result\.status === "UNAVAILABLE" \? result\.reason : undefined/);
  assert.match(q,/classifyAuralisExecution\(\s*result\.status, engineering,/);
  assert.match(q,/resolveAuralisExecutionForReport\(/);
  assert.match(q,/queuedShadow,\(overriddenFinalCritique as any\)\.auralisStage3F5IntegrationPlan,\s*false\)/);
  assert.doesNotMatch(q,/authorizeAuralisReviewed79Execution\(/);
  assert.match(app,/const AURALIS_REVIEWED_79_SCORING_ENABLED = false;/);
  assert.match(display,/getAuralisWorkerFailureCodeForReport\(execution\)/);
  assert.match(display,/workerFailureCode "\+workerCode/);
  assert.match(display,/Engineering Worker execution status/);
  // Recreate the exact inert Excel value calculation with synthetic inputs.
  const m=await import("../src/lib/mudPreventionDiagnostic.ts");
  const raw=m.classifyAuralisExecution("UNAVAILABLE",null,"TIMEOUT");
  const workerCode=m.getAuralisWorkerFailureCodeForReport(raw);
  const value=raw.status+" — "+raw.reason+
    (workerCode ? "; workerFailureCode "+workerCode : "")+
    "; scoringImpact NONE";
  assert.equal(value,
    "UNAVAILABLE — WORKER_UNAVAILABLE; workerFailureCode TIMEOUT; scoringImpact NONE");
  assert.equal(raw.scoringImpact,"NONE");
});
