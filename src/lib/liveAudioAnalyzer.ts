import { LiveAudioMetrics } from "../types";
import FFT from "fft.js";

/**
 * Decodes a File or Blob into an AudioBuffer using the browser's native AudioContext.
 */
export async function decodeAudioFile(file: File | Blob): Promise<AudioBuffer> {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    audioCtx.close();
  }
}

/**
 * Fetches and decodes any direct audio stream URL into an AudioBuffer.
 */
export async function decodeAudioUrl(url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio track: ${response.statusText}`);
  }
  const blob = await response.blob();
  return decodeAudioFile(blob);
}

/**
 * Performs high-precision, real programmatic audio analysis on any AudioBuffer.
 */
export function analyzeAudioBuffer(audioBuffer: AudioBuffer): LiveAudioMetrics {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const duration = audioBuffer.duration;
  const len = audioBuffer.length;

  console.log(`[LiveAnalyzer] Analyzing buffer: channels=${numChannels}, rate=${sampleRate}Hz, duration=${duration.toFixed(2)}s`);

  // Extract raw channel data
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = numChannels > 1 ? audioBuffer.getChannelData(1) : ch0;

  // 1. Calculate True Peak of the full buffer
  let maxAbsSample = 0;
  // Sub-sample slightly for speed/efficiency (scan every 2nd sample)
  for (let i = 0; i < len; i += 2) {
    const val0 = Math.abs(ch0[i]);
    if (val0 > maxAbsSample) maxAbsSample = val0;
    
    if (numChannels > 1) {
      const val1 = Math.abs(ch1[i]);
      if (val1 > maxAbsSample) maxAbsSample = val1;
    }
  }
  let truePeak = 20 * Math.log10(maxAbsSample || 0.0001);
  if (truePeak < -60) truePeak = -60;
  if (truePeak > 3.0) truePeak = 3.0; // soft cap clipping

  // 2. Compute K-Weighted integrated Loudness (LUFS approximation)
  // RLB / K-Filter coefficients for high shelf (pre-filter) and high pass filter stages
  // Stage 1 (High Shelf RLB filter):
  const b0_s = 1.53090962;
  const b1_s = -2.65116903;
  const b2_s = 1.16916686;
  const a1_s = -1.66375038;
  const a2_s = 0.72141502;
  
  // Stage 2 (High Pass filter @ ~38Hz):
  const b0_h = 1.0;
  const b1_h = -2.0;
  const b2_h = 1.0;
  const a1_h = -1.99049168;
  const a2_h = 0.99054703;

  // Run the filters over the channels. To optimize memory and performance, we can skip and calculate over a sampled array,
  // or compile integrated blocks. Let's run a fast filtered loop over a sampled rate of the original channels.
  // Hop size of 4 operates extremely well (~11kHz effective sample rate).
  const hop = 4;
  const filteredLength = Math.floor(len / hop);
  const fCh0 = new Float32Array(filteredLength);
  const fCh1 = numChannels > 1 ? new Float32Array(filteredLength) : fCh0;

  let x1_s0 = 0, x2_s0 = 0, y1_s0 = 0, y2_s0 = 0;
  let x1_h0 = 0, x2_h0 = 0, y1_h0 = 0, y2_h0 = 0;

  let x1_s1 = 0, x2_s1 = 0, y1_s1 = 0, y2_s1 = 0;
  let x1_h1 = 0, x2_h1 = 0, y1_h1 = 0, y2_h1 = 0;

  for (let i = 0; i < filteredLength; i++) {
    const idx = i * hop;
    // Channel 0
    const x0 = ch0[idx];
    const ys0 = b0_s * x0 + b1_s * x1_s0 + b2_s * x2_s0 - a1_s * y1_s0 - a2_s * y2_s0;
    x2_s0 = x1_s0; x1_s0 = x0; y2_s0 = y1_s0; y1_s0 = ys0;

    const yh0 = b0_h * ys0 + b1_h * x1_h0 + b2_h * x2_h0 - a1_h * y1_h0 - a2_h * y2_h0;
    x2_h0 = x1_h0; x1_h0 = ys0; y2_h0 = y1_h0; y1_h0 = yh0;
    fCh0[i] = yh0;

    if (numChannels > 1) {
      // Channel 1
      const x1 = ch1[idx];
      const ys1 = b0_s * x1 + b1_s * x1_s1 + b2_s * x2_s1 - a1_s * y1_s1 - a2_s * y2_s1;
      x2_s1 = x1_s1; x1_s1 = x1; y2_s1 = y1_s1; y1_s1 = ys1;

      const yh1 = b0_h * ys1 + b1_h * x1_h1 + b2_h * x2_h1 - a1_h * y1_h1 - a2_h * y2_h1;
      x2_h1 = x1_h1; x1_h1 = ys1; y2_h1 = y1_h1; y1_h1 = yh1;
      fCh1[i] = yh1;
    }
  }

  // Calculate Average Short-Term Loudness (windows of 400ms overlap by 100ms)
  const windowSamples = Math.floor((sampleRate * 0.4) / hop);
  const windowShift = Math.floor((sampleRate * 0.1) / hop);
  const blockPowers: number[] = [];

  for (let start = 0; start + windowSamples < filteredLength; start += windowShift) {
    let sum0 = 0;
    let sum1 = 0;
    for (let j = 0; j < windowSamples; j++) {
      sum0 += fCh0[start + j] * fCh0[start + j];
      if (numChannels > 1) {
        sum1 += fCh1[start + j] * fCh1[start + j];
      }
    }
    const mean0 = sum0 / windowSamples;
    const mean1 = numChannels > 1 ? sum1 / windowSamples : mean0;
    
    // ITU BS.1770 Loudness calculation (G_i = 1.0 for Left/Right, with offset of -0.691)
    const combinedPower = mean0 + mean1;
    if (combinedPower > 0) {
      const dbK = 10 * Math.log10(combinedPower) - 0.691;
      blockPowers.push(dbK);
    }
  }

  // Gate power outputs to determine Integrated LUFS
  // Absolute gate at -70 LUFS
  const absoluteGated = blockPowers.filter(p => p > -70);
  let lufsValue = -14.0; // fallback standard
  if (absoluteGated.length > 0) {
    // Relative gate: find average power then gate out blocks -10 dB below that average
    const sumAbsolute = absoluteGated.reduce((acc, v) => acc + Math.pow(10, v / 10), 0);
    const avgAbsoluteDb = 10 * Math.log10(sumAbsolute / absoluteGated.length);
    const relativeGated = absoluteGated.filter(p => p > (avgAbsoluteDb - 10));
    
    if (relativeGated.length > 0) {
      const sumRelative = relativeGated.reduce((acc, v) => acc + Math.pow(10, v / 10), 0);
      lufsValue = 10 * Math.log10(sumRelative / relativeGated.length) - 0.691;
    } else {
      lufsValue = avgAbsoluteDb - 0.691;
    }
  }

  // Clamp LUFS to reasonable bounds
  if (lufsValue < -40) lufsValue = -40;
  if (lufsValue > 0) lufsValue = 0;

  // 3. Compute Loudness Range (LRA)
  let lra = 5.4; // standard fallback
  if (blockPowers.length > 5) {
    const sortedPowers = [...blockPowers].filter(p => p > -70).sort((a, b) => a - b);
    if (sortedPowers.length > 5) {
      const idx10 = Math.floor(sortedPowers.length * 0.1);
      const idx95 = Math.floor(sortedPowers.length * 0.95);
      lra = sortedPowers[idx95] - sortedPowers[idx10];
    }
  }
  lra = Math.min(25, Math.max(1.0, parseFloat(lra.toFixed(1))));

  // 4. Stereo Correlation Coefficient (-1 to +1)
  let correlationSumNum = 0;
  let correlationSumDenL = 0;
  let correlationSumDenR = 0;
  let meanL = 0;
  let meanR = 0;
  
  // Calculate average channel samples
  const correlationSampleStep = Math.max(1, Math.floor(len / 10000)); // ~10k sample points
  let count = 0;
  for (let i = 0; i < len; i += correlationSampleStep) {
    meanL += ch0[i];
    meanR += ch1[i];
    count++;
  }
  meanL /= count;
  meanR /= count;

  for (let i = 0; i < len; i += correlationSampleStep) {
    const diffL = ch0[i] - meanL;
    const diffR = ch1[i] - meanR;
    correlationSumNum += diffL * diffR;
    correlationSumDenL += diffL * diffL;
    correlationSumDenR += diffR * diffR;
  }
  
  let correlation = 1.0;
  if (numChannels > 1 && correlationSumDenL > 0 && correlationSumDenR > 0) {
    correlation = correlationSumNum / Math.sqrt(correlationSumDenL * correlationSumDenR);
  }
  correlation = parseFloat(correlation.toFixed(2));
  if (isNaN(correlation)) correlation = 1.0;

  // 5. Run Spectral Partitioning (Bass, Mids, Highs energy representation)
  // Low: < 250Hz. Mid: 250Hz to 4000Hz. High: > 4000Hz.
  // We can model this rapidly with single-pole filter accumulators
  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;

  let prevX = 0;
  let filteredLow = 0;

  for (let i = 0; i < filteredLength; i += 2) {
    const sample = fCh0[i];
    // Simple low pass simulation at ~250Hz
    filteredLow = filteredLow * 0.9 + sample * 0.1;
    const lowPower = filteredLow * filteredLow;

    // Simple high pass simulation at ~4000Hz
    const hp = sample - prevX;
    prevX = sample;
    const highPower = hp * hp * 0.8;

    // Mid is anything in between
    const midPower = Math.abs(sample * sample - lowPower - highPower);

    lowEnergy += lowPower;
    highEnergy += highPower;
    midEnergy += midPower;
  }

  const totalSpectralPower = lowEnergy + midEnergy + highEnergy || 0.0001;
  const bassPerc = Math.max(5, Math.min(65, Math.round((lowEnergy / totalSpectralPower) * 100)));
  const highPerc = Math.max(5, Math.min(50, Math.round((highEnergy / totalSpectralPower) * 100)));
  const midPerc = 100 - bassPerc - highPerc;

  // 6. Autocorrelation-Based BPM Detection
  // Build onset strength envelope in 10ms hops across the full signal
  let detectedBpm = 120;
  const hopSize = Math.floor(sampleRate * 0.01); // 10ms hop
  const envLength = Math.floor(fCh0.length / hopSize);
  const envelope: number[] = [];

  for (let i = 0; i < envLength; i++) {
    let energy = 0;
    const start = i * hopSize;
    const end = Math.min(fCh0.length, start + hopSize);
    for (let j = start; j < end; j++) {
      energy += fCh0[j] * fCh0[j];
    }
    envelope.push(Math.sqrt(energy / hopSize));
  }

  // Compute onset strength: positive first-order difference of envelope
  const onsetStrength: number[] = [0];
  for (let i = 1; i < envelope.length; i++) {
    onsetStrength.push(Math.max(0, envelope[i] - envelope[i - 1]));
  }

  // Autocorrelate the onset strength signal
  // Lag range covers 60 BPM (1.0s) down to 200 BPM (0.3s)
  const minLag = Math.floor((60 / 200) * (sampleRate / hopSize)); // 200 BPM
  const maxLag = Math.floor((60 / 60) * (sampleRate / hopSize));  // 60 BPM
  const acf: number[] = [];

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < onsetStrength.length - lag; i++) {
      sum += onsetStrength[i] * onsetStrength[i + lag];
    }
    acf.push(sum);
  }

  // Find the top candidate lags, then prefer whichever has the strongest
  // "harmonic support" (i.e. also shows elevated autocorrelation near 2x and 3x
  // that lag) - naive single-peak-picking can lock onto a rhythmic subdivision
  // (a hi-hat pattern, a sample-loop length) rather than the true beat period.
  const acfPeakCandidates: Array<{ lag: number; val: number }> = [];
  for (let i = 1; i < acf.length - 1; i++) {
    if (acf[i] > acf[i - 1] && acf[i] > acf[i + 1]) {
      acfPeakCandidates.push({ lag: minLag + i, val: acf[i] });
    }
  }
  acfPeakCandidates.sort((a, b) => b.val - a.val);
  const topCandidates = acfPeakCandidates.slice(0, 5);

  const getAcfAtLag = (targetLag: number): number => {
    const idx = targetLag - minLag;
    if (idx < 0 || idx >= acf.length) return 0;
    return acf[idx];
  };

  let bestAcf = 0;
  let bestLag = minLag;
  let bestSupportScore = -Infinity;
  for (const candidate of topCandidates) {
    const support2x = getAcfAtLag(candidate.lag * 2);
    const support3x = getAcfAtLag(candidate.lag * 3);
    const supportScore = candidate.val + support2x * 0.5 + support3x * 0.3;
    if (supportScore > bestSupportScore) {
      bestSupportScore = supportScore;
      bestAcf = candidate.val;
      bestLag = candidate.lag;
    }
  }
  if (topCandidates.length === 0) {
    for (let i = 0; i < acf.length; i++) {
      if (acf[i] > bestAcf) {
        bestAcf = acf[i];
        bestLag = minLag + i;
      }
    }
  }

  // Convert lag (in envelope frames) to BPM
  const lagSeconds = bestLag / (sampleRate / hopSize);
  const rawBpm = 60 / lagSeconds;

  // Fold into 60–180 BPM range
  let foldedBpm = rawBpm;
  while (foldedBpm > 180) foldedBpm /= 2;
  while (foldedBpm < 60) foldedBpm *= 2;
  const candidateBpm = Math.round(foldedBpm);

  // Accept autocorrelation result if signal had meaningful onset energy
  const meanOnset = onsetStrength.reduce((a, b) => a + b, 0) / onsetStrength.length;
  const bpmConfidence = parseFloat(Math.min(1, Math.max(0, meanOnset > 0.001 && bestAcf > 0 ? Math.min(1, bestAcf / (onsetStrength.length * 0.1)) : 0)).toFixed(3));
  if (meanOnset > 0.001 && bestAcf > 0) {
    detectedBpm = candidateBpm;
  } else {
    // Fallback for near-silent or purely ambient tracks
    detectedBpm = 120;
  }

  // 7. Pitch and Musical Key Estimation (Krumhansl-Schmuckler method)
  // Autocorrelation Pitch estimator
  const keyNames = [
    "C Major", "C# Major", "D Major", "D# Major", "E Major", "F Major", 
    "F# Major", "G Major", "G# Major", "A Major", "A# Major", "B Major",
    "C Minor", "C# Minor", "D Minor", "D# Minor", "E Minor", "F Minor", 
    "F# Minor", "G Minor", "G# Minor", "A Minor", "A# Minor", "B Minor"
  ];
  
  // Create a 12-semitone chromagram array using REAL FFT-based spectral analysis
  // (replaces the old autocorrelation single-pitch approach, which struggled with
  // polyphonic/chord-heavy audio and could latch onto a single dominant note per block
  // rather than reflecting the song's true overall harmonic content)
  const chromaBins = new Float32Array(12);
  const chromaFftSize = 4096;
  const chromaFft = new FFT(chromaFftSize);
  const chromaComplexOut = chromaFft.createComplexArray();
  const chromaMinFreq = 60;
  const chromaMaxFreq = 5000;

  // Use RAW (unfiltered) channel 0 data, NOT the K-weighted fCh0 - K-weighting's
  // high-pass stage attenuates bass frequencies, which carry crucial root-note
  // information for key detection.
  const chromaNumFrames = Math.floor((len - chromaFftSize) / chromaFftSize);
  const chromaFrameStep = Math.max(1, Math.floor(chromaNumFrames / 200)); // cap at ~200 analyzed frames for performance

  const chromaHannWindow = new Float32Array(chromaFftSize);
  for (let n = 0; n < chromaFftSize; n++) {
    chromaHannWindow[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (chromaFftSize - 1)));
  }

  for (let f = 0; f < chromaNumFrames; f += chromaFrameStep) {
    const start = f * chromaFftSize;
    const frame = new Array(chromaFftSize);
    for (let n = 0; n < chromaFftSize; n++) {
      frame[n] = (ch0[start + n] || 0) * chromaHannWindow[n];
    }

    chromaFft.realTransform(chromaComplexOut, frame);
    chromaFft.completeSpectrum(chromaComplexOut);

    const binHz = sampleRate / chromaFftSize;
    const numBins = chromaFftSize / 2;
    for (let k = 1; k < numBins; k++) {
      const freq = k * binHz;
      if (freq < chromaMinFreq || freq > chromaMaxFreq) continue;
      const re = chromaComplexOut[2 * k];
      const im = chromaComplexOut[2 * k + 1];
      const magnitude = Math.sqrt(re * re + im * im);
      const midiNote = 12 * Math.log2(freq / 440) + 69;
      const pitchClass = ((Math.round(midiNote) % 12) + 12) % 12;
      chromaBins[pitchClass] += magnitude;
    }
  }

  // Krumhansl-Schmuckler Key profile correlations
  const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  let bestCorrelation = -Infinity;
  let estimatedKeyIndex = 11; // default to A minor (23 index) or B minor

  const allCorrelations: number[] = new Array(24).fill(-Infinity);

  for (let keyIdx = 0; keyIdx < 24; keyIdx++) {
    const isMajor = keyIdx < 12;
    const tonicShift = keyIdx % 12;
    const profile = isMajor ? MAJOR_PROFILE : MINOR_PROFILE;
    
    // Calculate Pearson correlation of shifted chromaBins against template profile
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
    for (let s = 0; s < 12; s++) {
      const chromaVal = chromaBins[(s + tonicShift) % 12];
      const templateVal = profile[s];
      sumX += chromaVal;
      sumY += templateVal;
      sumXY += chromaVal * templateVal;
      sumXX += chromaVal * chromaVal;
      sumYY += templateVal * templateVal;
    }
    
    const r = (12 * sumXY - sumX * sumY) / Math.sqrt((12 * sumXX - sumX * sumX) * (12 * sumYY - sumY * sumY));
    allCorrelations[keyIdx] = r;
    if (r > bestCorrelation) {
      bestCorrelation = r;
      estimatedKeyIndex = keyIdx;
    }
  }

  // Disambiguation pass: basic Krumhansl-Schmuckler correlation is well-documented to
  // frequently confuse the true tonic with its dominant (a perfect fifth away) or its
  // relative major/minor (a minor third away), since both share most of the same notes.
  // If a close runner-up candidate exists in one of these two relationships, use the raw
  // chroma energy at each candidate's own tonic pitch class as a tie-breaker - the true
  // tonic should show strong direct energy at its own pitch, not just fit the profile shape.
  const bestTonicPitch = estimatedKeyIndex % 12;
  const bestIsMajor = estimatedKeyIndex < 12;
  const CONFUSION_MARGIN = 0.08;

  for (let keyIdx = 0; keyIdx < 24; keyIdx++) {
    if (keyIdx === estimatedKeyIndex) continue;
    const candidateTonicPitch = keyIdx % 12;
    const candidateIsMajor = keyIdx < 12;
    const correlationGap = bestCorrelation - allCorrelations[keyIdx];
    if (correlationGap > CONFUSION_MARGIN) continue; // not a close runner-up, skip

    const semitoneDiff = ((candidateTonicPitch - bestTonicPitch) + 12) % 12;
    const isDominantRelation = candidateIsMajor === bestIsMajor && (semitoneDiff === 5 || semitoneDiff === 7);
    const isRelativeMajorMinorRelation = candidateIsMajor !== bestIsMajor && (semitoneDiff === 9 || semitoneDiff === 3);
    // Cross-mode dominant confusion: in minor keys, the dominant chord is conventionally
    // raised to major (harmonic minor convention), which can fool the algorithm into
    // detecting that major dominant chord as if it were its own major tonic, rather than
    // recognizing it as the V of the true minor key. E.g. detecting F# Major instead of
    // the true B minor, where F# is genuinely the dominant chord (F#7) of B minor.
    const isCrossModeDominant = bestIsMajor && !candidateIsMajor && semitoneDiff === 5;

    if (isDominantRelation || isRelativeMajorMinorRelation || isCrossModeDominant) {
      const bestTonicEnergy = chromaBins[bestTonicPitch];
      const candidateTonicEnergy = chromaBins[candidateTonicPitch];
      if (candidateTonicEnergy > bestTonicEnergy) {
        estimatedKeyIndex = keyIdx;
        bestCorrelation = allCorrelations[keyIdx];
      }
    }
  }

  // Key and mode confidence: bestCorrelation is the Pearson r of the winning key match (0-1)
  // Mode confidence is the margin between the best major and best minor correlation
  const keyConfidence = parseFloat(Math.min(1, Math.max(0, bestCorrelation)).toFixed(3));

  const estimatedKeyName = keyNames[estimatedKeyIndex];

  // 8. Generate 100-point wave amplitude timeline points
  const waveTimeline: number[] = [];
  const timelineStep = Math.floor(filteredLength / 80); // 80 elegant high fidelity points
  for (let k = 0; k < 80; k++) {
    let maxBlockVal = 0;
    const rangeStart = k * timelineStep;
    const rangeEnd = Math.min(filteredLength, (k + 1) * timelineStep);
    for (let u = rangeStart; u < rangeEnd; u++) {
      const absS = Math.abs(fCh0[u]);
      if (absS > maxBlockVal) maxBlockVal = absS;
    }
    // Scale amplitude points elegantly for presentation [2% to 98%]
    const scaledVal = Math.max(8, Math.min(95, Math.round(maxBlockVal * 150)));
    waveTimeline.push(scaledVal);
  }

  // Generate 400-point HD wave amplitude timeline for section analysis
  const waveTimelineHD: number[] = [];
  const hdStep = Math.floor(filteredLength / 400);
  for (let k = 0; k < 400; k++) {
    let sumBlock = 0;
    const rangeStart = k * hdStep;
    const rangeEnd = Math.min(filteredLength, (k + 1) * hdStep);
    const blockLen = rangeEnd - rangeStart;
    for (let u = rangeStart; u < rangeEnd; u++) {
      sumBlock += Math.abs(fCh0[u]);
    }
    const avgVal = blockLen > 0 ? sumBlock / blockLen : 0;
    const scaledHD = Math.max(2, Math.min(98, Math.round(avgVal * 200)));
    waveTimelineHD.push(scaledHD);
  }

  // Fade-in detection: scan first 10% of HD waveform for sustained low amplitude
  const fadeInScanLength = Math.floor(waveTimelineHD.length * 0.10);
  let fadeInEndIndex = 0;
  const fadeThreshold = 15; // below this amplitude = effectively silent/fading in
  for (let f = 0; f < fadeInScanLength; f++) {
    if (waveTimelineHD[f] < fadeThreshold) {
      fadeInEndIndex = f + 1;
    } else {
      break;
    }
  }
  const endOfFadeIn = parseFloat(((fadeInEndIndex / 400) * duration).toFixed(2));

  // Fade-out detection: scan last 15% of HD waveform for sustained low amplitude
  const fadeOutScanStart = Math.floor(waveTimelineHD.length * 0.85);
  let fadeOutStartIndex = waveTimelineHD.length;
  for (let f = waveTimelineHD.length - 1; f >= fadeOutScanStart; f--) {
    if (waveTimelineHD[f] < fadeThreshold) {
      fadeOutStartIndex = f;
    } else {
      break;
    }
  }
  const startOfFadeOut = parseFloat(((fadeOutStartIndex / 400) * duration).toFixed(2));

  // Time signature detection via beat interval regularity
  // Uses the onset strength signal already computed for BPM
  // Analyzes groupings of beat intervals to distinguish 4/4, 3/4, and 6/8
  let detectedTimeSignature = 4; // default to 4/4
  let timeSignatureConfidence = 0.5;

  if (onsetStrength.length > 0 && detectedBpm > 0) {
    const beatInterval = (60 / detectedBpm) * (sampleRate / 100); // in envelope frames (10ms hops)
    
    // Sample beat-aligned onset strength at 3 and 4 beat multiples
    const test3 = Math.round(beatInterval * 3);
    const test4 = Math.round(beatInterval * 4);
    const test6 = Math.round(beatInterval * 6);
    
    let score3 = 0, score4 = 0, score6 = 0;
    const testPoints = Math.min(8, Math.floor(onsetStrength.length / test4));
    
    for (let p = 0; p < testPoints; p++) {
      const idx3 = Math.min(onsetStrength.length - 1, p * test3);
      const idx4 = Math.min(onsetStrength.length - 1, p * test4);
      const idx6 = Math.min(onsetStrength.length - 1, p * test6);
      score3 += onsetStrength[idx3] || 0;
      score4 += onsetStrength[idx4] || 0;
      score6 += onsetStrength[idx6] || 0;
    }

    const maxScore = Math.max(score3, score4, score6);
    if (maxScore > 0) {
      if (score4 >= score3 && score4 >= score6) {
        detectedTimeSignature = 4;
        timeSignatureConfidence = parseFloat(Math.min(0.95, score4 / maxScore).toFixed(2));
      } else if (score3 >= score4 && score3 >= score6) {
        detectedTimeSignature = 3;
        timeSignatureConfidence = parseFloat(Math.min(0.95, score3 / maxScore).toFixed(2));
      } else {
        detectedTimeSignature = 6;
        timeSignatureConfidence = parseFloat(Math.min(0.95, score6 / maxScore).toFixed(2));
      }
    }
  }

  // Real 6-band frequency energy measurement, reusing the same FFT infrastructure
  // built for the chromagram - genuine FFT magnitude summed into fixed Hz ranges,
  // converted to dB, then mapped to a 0-100 scale via a fixed floor/ceiling.
  // Replaces the old approach of extrapolating 6 values from just 3 measured numbers.
  const bandFftSize = 4096;
  const bandFft = new FFT(bandFftSize);
  const bandComplexOut = bandFft.createComplexArray();
  
  const bandSums = new Float32Array(6);
  const bandCounts = new Int32Array(6);
  
  const bandRanges = [
    { min: 20, max: 64 },      // Sub-bass
    { min: 64, max: 250 },     // Bass
    { min: 250, max: 1000 },   // Low Mids
    { min: 1000, max: 4000 },  // Core Mids
    { min: 4000, max: 8000 },  // Presence
    { min: 8000, max: 20000 }  // Air
  ];
  
  const bandNumFrames = Math.floor((len - bandFftSize) / bandFftSize);
  const bandFrameStep = Math.max(1, Math.floor(bandNumFrames / 200));
  
  const bandHannWindow = new Float32Array(bandFftSize);
  for (let n = 0; n < bandFftSize; n++) {
    bandHannWindow[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (bandFftSize - 1)));
  }
  
  for (let f = 0; f < bandNumFrames; f += bandFrameStep) {
    const start = f * bandFftSize;
    const frame = new Array(bandFftSize);
    for (let n = 0; n < bandFftSize; n++) {
      frame[n] = (ch0[start + n] || 0) * bandHannWindow[n];
    }
    
    bandFft.realTransform(bandComplexOut, frame);
    bandFft.completeSpectrum(bandComplexOut);
    
    const binHz = sampleRate / bandFftSize;
    const numBins = bandFftSize / 2;
    for (let k = 1; k < numBins; k++) {
      const freq = k * binHz;
      const re = bandComplexOut[2 * k];
      const im = bandComplexOut[2 * k + 1];
      const magnitude = Math.sqrt(re * re + im * im);
      
      for (let b = 0; b < 6; b++) {
        if (freq >= bandRanges[b].min && freq < bandRanges[b].max) {
          bandSums[b] += magnitude;
          bandCounts[b]++;
          break;
        }
      }
    }
  }
  
  const bandDbFloor = -70;
  const bandDbCeiling = -15;
  const bandEnergies = new Float32Array(6);
  
  for (let b = 0; b < 6; b++) {
    const avgMag = bandCounts[b] > 0 ? bandSums[b] / bandCounts[b] : 0.0001;
    let db = 20 * Math.log10(avgMag || 0.0001);
    let score = ((db - bandDbFloor) / (bandDbCeiling - bandDbFloor)) * 100;
    bandEnergies[b] = Math.max(0, Math.min(100, Math.round(score)));
  }

  return {
    calculatedLufs: parseFloat(lufsValue.toFixed(1)),
    calculatedTruePeak: parseFloat(truePeak.toFixed(2)),
    calculatedLra: lra,
    calculatedStereoCorrelation: correlation,
    calculatedBpm: detectedBpm,
    calculatedKey: estimatedKeyName,
    calculatedBassEnergy: bassPerc,
    calculatedMidEnergy: midPerc,
    calculatedHighEnergy: highPerc,
    calculatedWaveformPoints: waveTimeline,
    calculatedWaveformPointsHD: waveTimelineHD,
    calculatedDuration: parseFloat(duration.toFixed(2)),
    calculatedKeyConfidence: keyConfidence,
    calculatedModeConfidence: parseFloat(Math.min(1, Math.max(0, bestCorrelation)).toFixed(3)),
    calculatedBpmConfidence: bpmConfidence,
    calculatedEndOfFadeIn: endOfFadeIn,
    calculatedSubBassBandEnergy: bandEnergies[0],
    calculatedBassBandEnergy: bandEnergies[1],
    calculatedLowMidsBandEnergy: bandEnergies[2],
    calculatedCoreMidsBandEnergy: bandEnergies[3],
    calculatedPresenceBandEnergy: bandEnergies[4],
    calculatedAirBandEnergy: bandEnergies[5],
    calculatedStartOfFadeOut: startOfFadeOut,
    calculatedTimeSignature: detectedTimeSignature,
    calculatedTimeSignatureConfidence: timeSignatureConfidence
  };
}
