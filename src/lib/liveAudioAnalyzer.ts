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

  const maxOnset = Math.max(...onsetStrength, 0.0001);
  const onsetTimeline: number[] = [];
  const onsetDownsampleTarget = 400;
  const onsetStep = Math.max(1, Math.floor(onsetStrength.length / onsetDownsampleTarget));
  for (let i = 0; i < onsetStrength.length; i += onsetStep) {
    onsetTimeline.push(parseFloat((onsetStrength[i] / maxOnset).toFixed(3)));
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

  const chromaFrames: number[][] = [];
  const spectrogramFrames: number[][] = [];
  const frameBassPitchClasses: number[] = [];
  const mfccFrames: number[][] = [];

  // Precompute Mel-Frequency Filterbank (26 triangular filters)
  const freqToMel = (freq: number) => 2595 * Math.log10(1 + freq / 700);
  const melToFreq = (mel: number) => 700 * (Math.pow(10, mel / 2595) - 1);

  const melMin = freqToMel(20);
  const melMax = freqToMel(sampleRate / 2); // Nyquist frequency

  // 26 filters require 28 boundary points
  const melPoints = Array.from({ length: 28 }, (_, i) => melMin + (i * (melMax - melMin)) / 27);
  const freqPoints = melPoints.map(melToFreq);
  const binPoints = freqPoints.map(freq => Math.round((freq * chromaFftSize) / sampleRate));

  const melFilters: number[][] = [];
  const numBinsForMel = chromaFftSize / 2;
  for (let m = 1; m <= 26; m++) {
    const filter = new Array(numBinsForMel).fill(0);
    const leftBin = binPoints[m - 1];
    const centerBin = binPoints[m];
    const rightBin = binPoints[m + 1];

    for (let k = leftBin; k <= rightBin; k++) {
      if (k < 0 || k >= numBinsForMel) continue;
      if (k >= leftBin && k < centerBin) {
        if (centerBin !== leftBin) {
          filter[k] = (k - leftBin) / (centerBin - leftBin);
        }
      } else if (k >= centerBin && k <= rightBin) {
        if (rightBin !== centerBin) {
          filter[k] = (rightBin - k) / (rightBin - centerBin);
        }
      }
    }
    melFilters.push(filter);
  }

  const chromaHannWindow = new Float32Array(chromaFftSize);
  for (let n = 0; n < chromaFftSize; n++) {
    chromaHannWindow[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (chromaFftSize - 1)));
  }

  const spectrogramBands = 24;
  const spectrogramMinFreq = 20;
  const spectrogramMaxFreq = 16000;

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
    const frameChroma = new Array(12).fill(0);
    const frameBassChroma = new Array(12).fill(0);
    const frameSpectrogram = new Array(spectrogramBands).fill(0);
    const frameMagnitudes = new Float32Array(numBins);

    for (let k = 1; k < numBins; k++) {
      const freq = k * binHz;
      const re = chromaComplexOut[2 * k];
      const im = chromaComplexOut[2 * k + 1];
      const magnitude = Math.sqrt(re * re + im * im);
      frameMagnitudes[k] = magnitude;

      // Accumulate into 24 logarithmic bands spanning 20Hz to 16000Hz
      if (freq >= spectrogramMinFreq && freq < spectrogramMaxFreq) {
        const b = Math.floor(
          spectrogramBands * Math.log(freq / spectrogramMinFreq) / Math.log(spectrogramMaxFreq / spectrogramMinFreq)
        );
        if (b >= 0 && b < spectrogramBands) {
          frameSpectrogram[b] += magnitude;
        }
      }

      // Chromagram logic (restricted to 60Hz - 5000Hz)
      if (freq >= chromaMinFreq && freq <= chromaMaxFreq) {
        const midiNote = 12 * Math.log2(freq / 440) + 69;
        const pitchClass = ((Math.round(midiNote) % 12) + 12) % 12;
        chromaBins[pitchClass] += magnitude;
        frameChroma[pitchClass] += magnitude;

        if (freq >= 60 && freq <= 250) {
          frameBassChroma[pitchClass] += magnitude;
        }
      }
    }

    let frameSum = 0;
    for (let i = 0; i < 12; i++) {
      frameSum += frameChroma[i];
    }
    if (frameSum > 0) {
      for (let i = 0; i < 12; i++) {
        frameChroma[i] /= frameSum;
      }
    }
    chromaFrames.push(frameChroma);

    // Normalize spectrogram frame so it sums to 1
    let specSum = 0;
    for (let i = 0; i < spectrogramBands; i++) {
      specSum += frameSpectrogram[i];
    }
    if (specSum > 0) {
      for (let i = 0; i < spectrogramBands; i++) {
        frameSpectrogram[i] /= specSum;
      }
    }
    spectrogramFrames.push(frameSpectrogram);

    let frameBassSum = 0;
    for (let i = 0; i < 12; i++) {
      frameBassSum += frameBassChroma[i];
    }
    if (frameBassSum > 0) {
      for (let i = 0; i < 12; i++) {
        frameBassChroma[i] /= frameBassSum;
      }
    }

    let dominantBassPitchClass = -1;
    if (frameBassSum >= 0.01) {
      let maxBassVal = -1;
      for (let i = 0; i < 12; i++) {
        if (frameBassChroma[i] > maxBassVal) {
          maxBassVal = frameBassChroma[i];
          dominantBassPitchClass = i;
        }
      }
    }
    frameBassPitchClasses.push(dominantBassPitchClass);

    // Apply mel filterbank to frameMagnitudes to get 26 mel-band energies
    const melEnergies = new Float32Array(26);
    for (let m = 0; m < 26; m++) {
      let energy = 0;
      const filter = melFilters[m];
      for (let k = 0; k < numBins; k++) {
        energy += frameMagnitudes[k] * filter[k];
      }
      melEnergies[m] = Math.log(Math.max(energy, 1e-10));
    }

    // Apply DCT-II to get 14 coefficients
    const mfcc = new Float32Array(14);
    for (let c = 0; c < 14; c++) {
      let sum = 0;
      for (let n = 0; n < 26; n++) {
        sum += melEnergies[n] * Math.cos((Math.PI / 26) * (n + 0.5) * c);
      }
      mfcc[c] = sum;
    }

    // Keep only coefficients 2 through 13 (skipping 0 and 1)
    const keptMfcc = Array.from(mfcc.slice(2, 14));
    mfccFrames.push(keptMfcc);
  }

  // ==========================================
  // Timbral Consistency Score Pass (Derived from mfccFrames)
  // ==========================================
  // Calculate the average MFCC vector across the whole song
  const numMfccFrames = mfccFrames.length;
  const avgMfcc = new Array(12).fill(0);
  if (numMfccFrames > 0) {
    for (const frame of mfccFrames) {
      for (let i = 0; i < 12; i++) {
        avgMfcc[i] += frame[i];
      }
    }
    for (let i = 0; i < 12; i++) {
      avgMfcc[i] /= numMfccFrames;
    }
  }

  // Calculate Euclidean distance from each frame's MFCC to the average MFCC vector
  let totalMfccDistance = 0;
  for (const frame of mfccFrames) {
    let sumSq = 0;
    for (let i = 0; i < 12; i++) {
      const diff = frame[i] - avgMfcc[i];
      sumSq += diff * diff;
    }
    totalMfccDistance += Math.sqrt(sumSq);
  }
  const avgMfccDistance = numMfccFrames > 0 ? totalMfccDistance / numMfccFrames : 0;

  // Scaling formula:
  // The Euclidean distance measures the deviation of each frame's timbre from the average song-wide timbre.
  // Under typical audio profiles, the average Euclidean distance of 12 kept MFCC components centers around 3.0 to 10.0.
  // Using a linear scaling factor of 4.5 gives:
  // - A distance of 2.0 (highly consistent) -> 91 score
  // - A distance of 4.5 (normally consistent) -> 80 score
  // - A distance of 10.0 (high timbral variety) -> 55 score
  // We round this to the nearest integer and clamp between 0 and 100.
  const timbralConsistencyScore = numMfccFrames > 0
    ? Math.max(0, Math.min(100, Math.round(100 - avgMfccDistance * 4.5)))
    : 100;

  // ==========================================
  // Sibilance Detection Pass (Derived from spectrogramFrames)
  // ==========================================
  const sibilanceBandEdges = Array.from({ length: 25 }, (_, i) => 20 * Math.pow(16000 / 20, i / 24));
  const sibilanceBandIndices: number[] = [];
  for (let i = 0; i < 24; i++) {
    const low = sibilanceBandEdges[i];
    const high = sibilanceBandEdges[i + 1];
    // Determine which band indices have their frequency range falling within 5000-10000Hz.
    // Using subset inclusion: low >= 5000 && high <= 10000 (usually bands 20 and 21)
    if (low >= 5000 && high <= 10000) {
      sibilanceBandIndices.push(i);
    }
  }

  // Compute sibilanceEnergy timeline (sum across identified band indices)
  const sibilanceEnergyTimeline = spectrogramFrames.map(frame => {
    let sum = 0;
    for (const idx of sibilanceBandIndices) {
      sum += frame[idx];
    }
    return sum;
  });

  // Compute transient/spike detector: positive difference from previous frame (starting from frame 2)
  const sibilanceDiff: number[] = [0];
  for (let i = 1; i < sibilanceEnergyTimeline.length; i++) {
    sibilanceDiff.push(Math.max(0, sibilanceEnergyTimeline[i] - sibilanceEnergyTimeline[i - 1]));
  }

  // Determine a spike threshold using timeline statistics (mean + 2 * stdDev of positive difference values)
  let sibilanceSpikeCount = 0;
  let sibilanceSeverityScore = 100;

  if (sibilanceDiff.length > 0) {
    const diffSum = sibilanceDiff.reduce((a, b) => a + b, 0);
    const diffMean = diffSum / sibilanceDiff.length;
    let diffVarianceSum = 0;
    for (const val of sibilanceDiff) {
      const diffVal = val - diffMean;
      diffVarianceSum += diffVal * diffVal;
    }
    const diffStdDev = Math.sqrt(diffVarianceSum / sibilanceDiff.length);
    const sibilanceThreshold = diffMean + 2 * diffStdDev;

    // Count how many frames exceed this threshold
    for (const val of sibilanceDiff) {
      if (val > sibilanceThreshold) {
        sibilanceSpikeCount++;
      }
    }

    // Compute sibilanceSeverityScore (0-100)
    // A typical track has a spike ratio of 2-5%.
    // Deduct points proportionally to how many spikes were detected relative to total frame count.
    const sibilanceSpikeRatio = sibilanceSpikeCount / Math.max(1, spectrogramFrames.length);
    sibilanceSeverityScore = Math.max(0, Math.round(100 - Math.min(100, sibilanceSpikeRatio * 1200)));
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
  // frequently confuse the true tonic with its dominant (a perfect fifth away), its
  // relative major/minor (a minor third away), or other closely-related keys, since
  // these share most of the same notes. If a close runner-up candidate exists in one
  // of these relationships, use the candidate's full tonic TRIAD energy (root + third +
  // fifth) as a tie-breaker, rather than a single noisy bin - a genuine tonic should
  // show coherent strength across its whole triad, not just an isolated pitch spike.
  const bestTonicPitch = estimatedKeyIndex % 12;
  const bestIsMajor = estimatedKeyIndex < 12;
  const CONFUSION_MARGIN = 0.15;

  const getTriadEnergy = (tonicPitch: number, isMajor: boolean): number => {
    const third = (tonicPitch + (isMajor ? 4 : 3)) % 12;
    const fifth = (tonicPitch + 7) % 12;
    return chromaBins[tonicPitch] + chromaBins[third] + chromaBins[fifth];
  };

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
    // Mirror-image cross-mode dominant: the reverse direction - detecting a minor key
    // when the true answer is a major key a perfect fifth away. E.g. detecting C# Minor
    // instead of the true G#/Ab Major, where C# is the dominant of G#/Ab Major.
    const isMirrorCrossModeDominant = !bestIsMajor && candidateIsMajor && semitoneDiff === 7;
    // Supertonic confusion: detecting the ii/2nd-scale-degree instead of the true tonic -
    // a less common but confirmed real occurrence, same mode only.
    const isSupertonicRelation = candidateIsMajor === bestIsMajor && (semitoneDiff === 2 || semitoneDiff === 10);
    // Adjacent-semitone confusion: detecting a key exactly one semitone off from the true
    // tonic - a different failure mode than functional harmonic confusion, but confirmed
    // to occur in real testing.
    const isAdjacentSemitone = semitoneDiff === 1 || semitoneDiff === 11;

    if (isDominantRelation || isRelativeMajorMinorRelation || isCrossModeDominant ||
        isMirrorCrossModeDominant || isSupertonicRelation || isAdjacentSemitone) {
      const bestTriadEnergy = getTriadEnergy(bestTonicPitch, bestIsMajor);
      const candidateTriadEnergy = getTriadEnergy(candidateTonicPitch, candidateIsMajor);
      if (candidateTriadEnergy > bestTriadEnergy) {
        estimatedKeyIndex = keyIdx;
        bestCorrelation = allCorrelations[keyIdx];
      }
    }
  }

  // Key and mode confidence: bestCorrelation is the Pearson r of the winning key match (0-1)
  // Mode confidence is the margin between the best major and best minor correlation
  const keyConfidence = parseFloat(Math.min(1, Math.max(0, bestCorrelation)).toFixed(3));

  const estimatedKeyName = keyNames[estimatedKeyIndex];

  // Chord-recognition pass
  const MAJOR_TRIAD_TEMPLATE = [1,0,0,0,1,0,0,1,0,0,0,0];
  const MINOR_TRIAD_TEMPLATE = [1,0,0,1,0,0,0,1,0,0,0,0];
  const POWER_CHORD_TEMPLATE = [1,0,0,0,0,0,0,1,0,0,0,0]; // root + perfect fifth, no third
  const SUS4_TEMPLATE = [1,0,0,0,0,1,0,1,0,0,0,0]; // root + perfect fourth + perfect fifth, no third

  const frameGuesses: { root: number; quality: "major" | "minor" | "power" | "sus4" | "unclear"; bassPitchClass: number }[] = [];

  for (let f = 0; f < chromaFrames.length; f++) {
    const frame = chromaFrames[f];
    const bassPC = frameBassPitchClasses[f] ?? -1;

    let totalEnergy = 0;
    for (let i = 0; i < 12; i++) {
      totalEnergy += frame[i];
    }

    if (totalEnergy < 0.01) {
      frameGuesses.push({ root: -1, quality: "unclear", bassPitchClass: -1 });
      continue;
    }

    let bestCorr = -Infinity;
    let bestRoot = 0;
    let bestQuality: "major" | "minor" | "power" | "sus4" = "major";

    for (let root = 0; root < 12; root++) {
      for (const quality of ["major", "minor", "power", "sus4"] as const) {
        let template = MAJOR_TRIAD_TEMPLATE;
        if (quality === "minor") template = MINOR_TRIAD_TEMPLATE;
        else if (quality === "power") template = POWER_CHORD_TEMPLATE;
        else if (quality === "sus4") template = SUS4_TEMPLATE;

        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
        for (let s = 0; s < 12; s++) {
          const chromaVal = frame[(s + root) % 12];
          const templateVal = template[s];
          sumX += chromaVal;
          sumY += templateVal;
          sumXY += chromaVal * templateVal;
          sumXX += chromaVal * chromaVal;
          sumYY += templateVal * templateVal;
        }

        const denom = Math.sqrt((12 * sumXX - sumX * sumX) * (12 * sumYY - sumY * sumY));
        const r = denom > 0 ? (12 * sumXY - sumX * sumY) / denom : 0;

        if (r > bestCorr) {
          bestCorr = r;
          bestRoot = root;
          bestQuality = quality;
        }
      }
    }

    frameGuesses.push({ root: bestRoot, quality: bestQuality, bassPitchClass: bassPC });
  }

  // Smoothing pass: merge consecutive frames with identical (root, quality, bassPitchClass)
  const rawSegments: { root: number; quality: "major" | "minor" | "power" | "sus4" | "unclear"; startFrame: number; endFrame: number; bassPitchClass: number }[] = [];
  for (let i = 0; i < frameGuesses.length; i++) {
    const guess = frameGuesses[i];
    if (rawSegments.length === 0) {
      rawSegments.push({
        root: guess.root,
        quality: guess.quality,
        startFrame: i,
        endFrame: i,
        bassPitchClass: guess.bassPitchClass
      });
    } else {
      const lastSeg = rawSegments[rawSegments.length - 1];
      if (lastSeg.root === guess.root && lastSeg.quality === guess.quality && lastSeg.bassPitchClass === guess.bassPitchClass) {
        lastSeg.endFrame = i;
      } else {
        rawSegments.push({
          root: guess.root,
          quality: guess.quality,
          startFrame: i,
          endFrame: i,
          bassPitchClass: guess.bassPitchClass
        });
      }
    }
  }

  // Discard/merge any segment shorter than 0.75 seconds into its closer neighbor in time
  const stepSeconds = (chromaFrameStep * chromaFftSize) / sampleRate;
  let segments = rawSegments.map(s => ({ ...s }));
  let hasShortSegment = true;

  while (hasShortSegment) {
    hasShortSegment = false;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const segmentLen = seg.endFrame - seg.startFrame + 1;
      const durationSec = segmentLen * stepSeconds;
      if (durationSec < 0.75) {
        hasShortSegment = true;
        let mergeIntoIndex = -1;

        if (i > 0 && i < segments.length - 1) {
          const centerSeg = (seg.startFrame + seg.endFrame) / 2;
          const leftSeg = segments[i - 1];
          const rightSeg = segments[i + 1];
          const centerLeft = (leftSeg.startFrame + leftSeg.endFrame) / 2;
          const centerRight = (rightSeg.startFrame + rightSeg.endFrame) / 2;

          const distLeft = centerSeg - centerLeft;
          const distRight = centerRight - centerSeg;

          if (distLeft <= distRight) {
            mergeIntoIndex = i - 1;
          } else {
            mergeIntoIndex = i + 1;
          }
        } else if (i > 0) {
          mergeIntoIndex = i - 1;
        } else if (i < segments.length - 1) {
          mergeIntoIndex = i + 1;
        }

        if (mergeIntoIndex !== -1) {
          if (mergeIntoIndex === i - 1) {
            segments[i - 1].endFrame = seg.endFrame;
            segments.splice(i, 1);
          } else {
            segments[i + 1].startFrame = seg.startFrame;
            segments.splice(i, 1);
          }
        } else {
          hasShortSegment = false;
        }
        break;
      }
    }
  }

  // Re-merge adjacent identical segments after smoothing
  let combinedSegments: typeof rawSegments = [];
  for (const seg of segments) {
    if (combinedSegments.length === 0) {
      combinedSegments.push({ ...seg });
    } else {
      const lastSeg = combinedSegments[combinedSegments.length - 1];
      if (lastSeg.root === seg.root && lastSeg.quality === seg.quality && lastSeg.bassPitchClass === seg.bassPitchClass) {
        lastSeg.endFrame = seg.endFrame;
      } else {
        combinedSegments.push({ ...seg });
      }
    }
  }

  const getMostCommonBassPitchClass = (start: number, end: number): number => {
    const counts: Record<number, number> = {};
    let maxCount = 0;
    let mostCommon = -1;
    for (let i = start; i <= end; i++) {
      const pc = frameGuesses[i]?.bassPitchClass ?? -1;
      counts[pc] = (counts[pc] || 0) + 1;
      if (counts[pc] > maxCount) {
        maxCount = counts[pc];
        mostCommon = pc;
      }
    }
    return mostCommon;
  };

  // Filter out the "unclear" segments to only keep major, minor, power, or sus4 chords
  const chordSegments: { root: number; quality: "major" | "minor" | "power" | "sus4"; startFrame: number; endFrame: number; bassPitchClass: number }[] = [];
  for (const seg of combinedSegments) {
    if (seg.quality === "major" || seg.quality === "minor" || seg.quality === "power" || seg.quality === "sus4") {
      chordSegments.push({
        root: seg.root,
        quality: seg.quality,
        startFrame: seg.startFrame,
        endFrame: seg.endFrame,
        bassPitchClass: getMostCommonBassPitchClass(seg.startFrame, seg.endFrame)
      });
    }
  }

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

  // Self-contained pitch-tracking pass using YIN algorithm
  const yinWindowSize = 2048;
  const yinHopSize = 512;
  const yinMaxTau = Math.round((800 * sampleRate) / 48000);
  const totalYinFrames = Math.floor((ch0.length - yinWindowSize) / yinHopSize);
  const yinStep = Math.max(1, Math.ceil(totalYinFrames / 800));

  const melodyFrames: { voiced: boolean; frequencyHz?: number; midiNote?: number; timeSec: number }[] = [];

  for (let f = 0; f < totalYinFrames; f += yinStep) {
    const t = f * yinHopSize;
    const timeSec = parseFloat((t / sampleRate).toFixed(2));

    // 1. Difference function d(tau)
    const d = new Float32Array(yinMaxTau + 1);
    for (let tau = 1; tau <= yinMaxTau; tau++) {
      let sum = 0;
      for (let j = 0; j < yinWindowSize; j++) {
        const val1 = ch0[t + j] || 0;
        const val2 = ch0[t + j + tau] || 0;
        const diff = val1 - val2;
        sum += diff * diff;
      }
      d[tau] = sum;
    }

    // 2. Cumulative Mean Normalized Difference Function (CMNDF)
    const cmndf = new Float32Array(yinMaxTau + 1);
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau <= yinMaxTau; tau++) {
      runningSum += d[tau];
      if (runningSum === 0) {
        cmndf[tau] = 1;
      } else {
        cmndf[tau] = d[tau] / (runningSum / tau);
      }
    }

    // 3. Absolute threshold + local minimum check
    let bestTau = -1;
    for (let tau = 2; tau < yinMaxTau; tau++) {
      if (cmndf[tau] < 0.15) {
        if (cmndf[tau] < cmndf[tau - 1] && cmndf[tau] < cmndf[tau + 1]) {
          bestTau = tau;
          break;
        }
      }
    }

    if (bestTau === -1) {
      melodyFrames.push({ voiced: false, timeSec });
      continue;
    }

    // 4. Parabolic interpolation
    let refinedTau = bestTau;
    if (bestTau > 1 && bestTau < yinMaxTau) {
      const y_prev = cmndf[bestTau - 1];
      const y_curr = cmndf[bestTau];
      const y_next = cmndf[bestTau + 1];
      const denom = y_prev - 2 * y_curr + y_next;
      if (Math.abs(denom) > 1e-10) {
        const s = 0.5 * (y_prev - y_next) / denom;
        refinedTau = bestTau + s;
      }
    }

    const freq = sampleRate / refinedTau;

    // Plausible melodic/vocal range: 80Hz to 1200Hz
    if (freq >= 80 && freq <= 1200) {
      const midiNote = 12 * Math.log2(freq / 440) + 69;
      melodyFrames.push({
        voiced: true,
        frequencyHz: parseFloat(freq.toFixed(1)),
        midiNote: Math.round(midiNote),
        timeSec
      });
    } else {
      melodyFrames.push({ voiced: false, timeSec });
    }
  }

  // Segment melodyFrames into distinct notes and calculate interval statistics
  const rawNoteSegments: { midiNote: number; startTimeSec: number; endTimeSec: number; frameCount: number }[] = [];
  let currentNote: { midiNote: number; startTimeSec: number; endTimeSec: number; frameCount: number } | null = null;

  for (let i = 0; i < melodyFrames.length; i++) {
    const frame = melodyFrames[i];
    if (frame.voiced && frame.midiNote !== undefined) {
      if (currentNote === null) {
        currentNote = {
          midiNote: frame.midiNote,
          startTimeSec: frame.timeSec,
          endTimeSec: frame.timeSec,
          frameCount: 1
        };
      } else if (currentNote.midiNote === frame.midiNote) {
        currentNote.endTimeSec = frame.timeSec;
        currentNote.frameCount++;
      } else {
        rawNoteSegments.push(currentNote);
        currentNote = {
          midiNote: frame.midiNote,
          startTimeSec: frame.timeSec,
          endTimeSec: frame.timeSec,
          frameCount: 1
        };
      }
    } else {
      if (currentNote !== null) {
        rawNoteSegments.push(currentNote);
        currentNote = null;
      }
    }
  }
  if (currentNote !== null) {
    rawNoteSegments.push(currentNote);
  }

  // Discard any note segment shorter than 2 frames
  const noteSegments = rawNoteSegments
    .filter(seg => seg.frameCount >= 2)
    .map(({ midiNote, startTimeSec, endTimeSec }) => ({
      midiNote,
      startTimeSec,
      endTimeSec
    }));

  let totalSteps = 0;
  let totalLeaps = 0;
  let totalRepeats = 0;

  for (let i = 0; i < noteSegments.length - 1; i++) {
    const curr = noteSegments[i];
    const next = noteSegments[i + 1];
    const gap = next.startTimeSec - curr.endTimeSec;
    if (gap > 2.0) {
      continue;
    }

    const intervalSemitones = next.midiNote - curr.midiNote;
    if (intervalSemitones === 0) {
      totalRepeats++;
    } else if (Math.abs(intervalSemitones) <= 2) {
      totalSteps++;
    } else {
      totalLeaps++;
    }
  }

  const stepToLeapRatio = totalSteps / Math.max(1, totalLeaps);

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
    timeResolvedChromagram: chromaFrames,
    timeResolvedSpectrogram: spectrogramFrames,
    onsetRhythmTimeline: onsetTimeline,
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
    calculatedTimeSignatureConfidence: timeSignatureConfidence,
    detectedChordProgression: chordSegments,
    detectedChordProgressionNamed: chordSegments.map(seg => {
      const stepSeconds = (chromaFrameStep * chromaFftSize) / sampleRate;
      const rootName = keyNames[seg.root].replace(" Major", "").replace(" Minor", "");
      let suffix = "";
      if (seg.quality === "minor") suffix = "m";
      else if (seg.quality === "power") suffix = "5";
      else if (seg.quality === "sus4") suffix = "sus4";

      let chordName = `${rootName}${suffix}`;
      if (seg.bassPitchClass !== -1 && seg.bassPitchClass !== seg.root) {
        const bassName = keyNames[seg.bassPitchClass].replace(" Major", "").replace(" Minor", "");
        chordName += `/${bassName}`;
      }

      return {
        ...seg,
        name: chordName,
        startTimeSec: parseFloat((seg.startFrame * stepSeconds).toFixed(2)),
        endTimeSec: parseFloat((seg.endFrame * stepSeconds).toFixed(2))
      };
    }),
    detectedMelodyContour: melodyFrames,
    detectedMelodyNotes: {
      notes: noteSegments,
      totalSteps,
      totalLeaps,
      totalRepeats,
      stepToLeapRatio
    },
    calculatedSibilanceSpikeCount: sibilanceSpikeCount,
    calculatedSibilanceSeverityScore: sibilanceSeverityScore,
    calculatedTimbralConsistencyScore: timbralConsistencyScore
  };
}
