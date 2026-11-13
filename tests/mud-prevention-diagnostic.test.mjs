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
      assert.equal(engineering.observations.length,3,"Valid optional meters retained");
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
  for(const b of gain.spectralProfile.bands)b.channelPower=b.channelPower.map(v=>v/4);
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
      bands:diagnostic.spectralProfile.bands.slice(0,6)}},critique],
    [{...diagnostic,spectralProfile:{...diagnostic.spectralProfile,
      bands:diagnostic.spectralProfile.bands.map((b,i)=>
        i===1?{...b,status:"UNAVAILABLE"}:b)}},critique],
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
