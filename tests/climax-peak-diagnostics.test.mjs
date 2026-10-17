import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyzeClimaxPeakCompetition, formatClimaxPeakDiagnostic } from "../src/lib/climaxPeakDiagnostics.ts";

const envelope = (n, peaks) => Array.from({ length: n }, (_, i) => ({
  timeSec: i,
  db: -30 + peaks.reduce((total, p) => total + p.height * Math.exp(-0.5 * ((i - p.index) / p.sigma) ** 2), 0),
}));

test("separated near-equal peaks are identified without choosing a new score", () => {
  const points = envelope(101, [{index: 70,height:10,sigma:2}, {index:49,height:9.99,sigma:2}]);
  const result = analyzeClimaxPeakCompetition(points);
  assert.ok(result);
  assert.equal(result.primaryPercent, 70);
  assert.ok(result.alternativePeaks.some(p => p.percent === 49 && p.deltaDb <= .5));
  assert.match(formatClimaxPeakDiagnostic(result), /within 0.5 dB/);
  assert.match(formatClimaxPeakDiagnostic(result), /not scoring penalties/);
});

test("two distinct near-tied peaks from a Shape-like envelope remain visible", () => {
  const points = envelope(101, [{index:67,height:10,sigma:2},{index:96,height:9.88,sigma:2}]);
  const result = analyzeClimaxPeakCompetition(points);
  assert.ok(result);
  assert.equal(result.primaryPercent, 67);
  assert.ok(result.alternativePeaks.some(p => p.percent === 96));
});

test("one dominant peak does not invent competing candidates", () => {
  const result = analyzeClimaxPeakCompetition(envelope(81, [{index:35,height:12,sigma:3}]));
  assert.ok(result);
  assert.deepEqual(result.alternativePeaks, []);
  assert.match(formatClimaxPeakDiagnostic(result), /No other distinct local peaks/);
});

test("flat plateaus and short fluctuations are not listed as many separate peaks", () => {
  const pts = Array.from({length:40},(_,i)=>({timeSec:i,db:i>=12 && i<=19 ? -9 : -20}));
  const result = analyzeClimaxPeakCompetition(pts);
  assert.ok(result);
  assert.equal(result.alternativePeaks.length, 0);
});

test("insufficient and corrupted envelopes do not produce fabricated evidence", () => {
  assert.equal(analyzeClimaxPeakCompetition(null), null);
  assert.equal(analyzeClimaxPeakCompetition(envelope(6,[])), null);
  assert.equal(analyzeClimaxPeakCompetition([{timeSec:0,db:NaN},...envelope(9,[])]), null);
  assert.equal(analyzeClimaxPeakCompetition(Array.from({length:10},()=>({timeSec:0,db:-10}))),null);
});

test("diagnostic never mutates supplied live envelope", () => {
  const e=envelope(90,[{index:58,height:10,sigma:3}]);
  const snapshot=structuredClone(e);
  analyzeClimaxPeakCompetition(e);
  assert.deepEqual(e,snapshot);
});

test("UI and Excel use same read-only helper; old scoring and DSP formulas remain untouched", async () => {
  const display=await readFile("src/components/CritiqueDisplay.tsx","utf8");
  const analyzer=await readFile("src/lib/liveAudioAnalyzer.ts","utf8");
  const server=await readFile("server.ts","utf8");
  assert.match(display,/analyzeClimaxPeakCompetition\(rawEnvelope\)/);
  assert.match(display,/formatClimaxPeakDiagnostic\(peakDiagnostics\)/);
  assert.match(display,/formatClimaxPeakDiagnostic\(climaxDiagnostic\)/);
  assert.match(await readFile("src/lib/climaxPeakDiagnostics.ts","utf8"),/Original three-window energy peak/);
  assert.doesNotMatch(display,/Climax Trajectory Score is a 50\/50 blend/);
  assert.doesNotMatch(display,/Golden Climax Zone \(55%–90%\)/);
  assert.match(display,/Gemini Call 2 listening tier when available/);
  assert.match(analyzer,/climaxTrajectoryScore = Math\.round\(positionScore \* 0\.35 \+ magnitudeScore \* 0\.65\)/);
  assert.match(server,/assignTierScore\(call2\?\.acousticTension\?\.climaxTrajectory/);
});
