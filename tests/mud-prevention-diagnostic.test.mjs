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

 
test("Stage 3D-1 evidence remains score-inert, gain-invariant and fail-closed",async()=>{
  const edges=[20,60,250,500,2000,6000,11000,20000];
  const profile={schemaVersion:"stage2j1-spectral-profile-v1",scoringImpact:"NONE",
    units:"mean-square-full-scale-pcm",sampleRate:48000,channelCount:2,
    bands:edges.slice(0,7).map((x,i)=>({
      bandHz:[x,edges[i+1]],status:"AVAILABLE",
      channelPower:[i===1?0.02:0.01,i===1?0.02:0.01]}))};
  const input={status:"AVAILABLE",evidence:{scoringImpact:"NONE",
    sourceProvenance:{sampleRate:48000,channelCount:2}},spectralProfile:profile};
  const unchanged=JSON.stringify(input);
  const result=prepareAuralisEngineeringEvidence(input);
  assert.equal(result.schemaVersion,AURALIS_ENGINEERING_ADAPTER_VERSION);
  assert.equal(result.scoringImpact,"NONE");
  assert.equal(result.scoringAdapter.status,AURALIS_ENGINEERING_SCORE_POLICY);
  assert.deepEqual(result.scoringAdapter.adjustments,[]);
  assert.ok(result.observations.every(x=>x.includes("intentional")));
  assert.equal(JSON.stringify(input),unchanged,"input measurements unchanged");
  const withMeters={...input,referenceMeters:{
    schemaVersion:"stage2k-meter-summary-v1",scoringImpact:"NONE",
    measurements:{integratedLufs:-11.5,samplePeakDbfs:-0.6}}};
  const master=prepareAuralisEngineeringEvidence(withMeters);
  assert.equal(master.observations.length,3);
  assert.match(master.observations[2],/mastering-quality verdict/);
  assert.match(master.observations[2],/intentional production choice/);
  assert.equal(master.scoringAdapter.adjustments.length,0);
  const gain=structuredClone(input);
  for(const b of gain.spectralProfile.bands)b.channelPower=b.channelPower.map(v=>v/4);
  assert.equal(prepareAuralisEngineeringEvidence(gain).metrics.lowToUpperDb,
    result.metrics.lowToUpperDb);
  for(const invalid of [null,{...input,status:"UNAVAILABLE"},
    {...input,evidence:{scoringImpact:"SCORED",sourceProvenance:input.evidence.sourceProvenance}},
    {...input,spectralProfile:{...profile,bands:profile.bands.slice(0,6)}},
    {...input,spectralProfile:{...profile,bands:profile.bands.map((b,i)=>
      i===1?{...b,status:"PARTIAL"}:b)}},
    {...input,spectralProfile:{...profile,bands:profile.bands.map((b,i)=>
      i===1?{...b,channelPower:[NaN,0]}:b)}}]){
    assert.equal(prepareAuralisEngineeringEvidence(invalid),null);
  }
  const app=await readFile(new URL("../src/App.tsx",import.meta.url),"utf8");
  const display=await readFile(new URL("../src/components/CritiqueDisplay.tsx",import.meta.url),"utf8");
  const server=await readFile(new URL("../server.ts",import.meta.url),"utf8");
  assert.match(app,/STAGE3D1_AURALIS_EVIDENCE_ENABLED = true/);
  assert.match(app,/!a2PilotEnabled/);
  assert.match(app,/prepareAuralisEngineeringEvidence\(result\)/);
  assert.match(app,/auralisEvidencePromise/);
  assert.match(display,/Conditional engineering observation \(NOT SCORED\)/);
  assert.match(display,/Auralis observations \(not scored\)/);
  assert.doesNotMatch(server,/prepareAuralisEngineeringEvidence/);
  assert.doesNotMatch(app,/evaluateAuralisSpectralShadowCandidate/);
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
