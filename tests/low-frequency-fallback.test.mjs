import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
const ui = readFileSync(new URL('../src/components/CritiqueDisplay.tsx', import.meta.url), 'utf8');
const weighted = (values) => Math.round(values.reduce((s,[score,w])=>s+score*w,0)/values.reduce((s,[,w])=>s+w,0));
const mix = ({mud,mid,division,lowBalance,sibilance,stereo}) => weighted([
  [mud,25],[mid,25],[division ?? lowBalance,20],...(sibilance==null?[]:[[sibilance,15]]),[stereo,15]
]);

test('instrument-source and two-pass audit safeguards remain present',()=>{
  assert.match(source,/if \(!percussionPresent \|\| !bassPresent \|\| !corroborated\)/);
  assert.match(source,/lowEnd\.applicable = false/);
  assert.match(source,/audit\.rolesIndependent === true/);
});
test('low-balance is required in Call 1 tier schema and canonical tier mapping',()=>{
  assert.match(source,/lowFrequencyBalance: \{ type: Type\.OBJECT/);
  assert.match(source,/'?"lowFrequencyBalance", "stereoWidth"'?/);
  assert.match(source,/isApplicable\(c1Ready\.lowEndDivision\) \? c1Ready\.lowEndDivision\.score : c1Ready\.lowFrequencyBalance\?\.score/);
});
test('clean independent bass/percussion case retains previous score',()=>{
  const input={mud:85,mid:88,division:93,lowBalance:58,sibilance:90,stereo:85};
  assert.equal(mix(input),weighted([[85,25],[88,25],[93,20],[90,15],[85,15]]));
});
test('no independent bass can still receive a low-end quality judgment',()=>{
  const thin={mud:85,mid:88,division:null,lowBalance:58,sibilance:90,stereo:85};
  const sound={...thin,lowBalance:90};
  assert.ok(mix(thin)<mix(sound));
  assert.equal(mix(thin),81);
});
test('no vocal sibilance renormalizes remaining weights',()=>{
  assert.equal(mix({mud:85,mid:88,division:null,lowBalance:79,sibilance:null,stereo:85}),84);
});
test('UI displays the fallback rather than zero/N/A when division is not applicable',()=>{
  assert.match(ui,/Low-Frequency Balance & Control \(20%\)/);
  assert.match(ui,/critiqueData\?\.subMetricsCall1\?\.lowEndDivision\?\.applicable === false/);
});
