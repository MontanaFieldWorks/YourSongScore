import type { LiveAudioMetrics } from "../types";
import FFT from "fft.js";

// Lazily-loaded essentia.js instance - loaded once per page session, reused across
// multiple key-detection calls. Loading is async (fetches a ~2MB WASM file), so this
// is deliberately kept separate from the synchronous analyzeAudioBuffer function below.
let essentiaInstancePromise: Promise<any> | null = null;

// Tracks in-flight script loads by src, so a second concurrent call to loadScript for
// the same script genuinely waits for the first load to finish (resolve or reject)
// rather than assuming the mere presence of a <script> tag in the DOM means it's done.
const inFlightScriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = inFlightScriptLoads.get(src);
  if (existing) return existing;

  const existingTag = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
  if (existingTag && (existingTag as any)._loaded) {
    return Promise.resolve();
  }

  const promise = new Promise<void>((resolve, reject) => {
    if (existingTag) {
      // A tag exists but we don't know if it already finished - attach listeners to
      // find out, rather than assuming success just because the element is present.
      existingTag.addEventListener("load", () => { (existingTag as any)._loaded = true; resolve(); });
      existingTag.addEventListener("error", () => reject(new Error(`Failed to load script: ${src}`)));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => { (script as any)._loaded = true; resolve(); };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });

  inFlightScriptLoads.set(src, promise);
  return promise;
}

async function getEssentiaInstance(): Promise<any> {
  if (essentiaInstancePromise) return essentiaInstancePromise;

  essentiaInstancePromise = (async () => {
    try {
      await loadScript("/essentia/essentia-wasm.web.js");
      await loadScript("/essentia/essentia.js-core.js");
      const w = window as any;
      if (!w.EssentiaWASM || !w.Essentia) {
        throw new Error("essentia.js scripts loaded but did not expose expected globals");
      }
      const wasmModule = await w.EssentiaWASM();
      return new w.Essentia(wasmModule);
    } catch (e) {
      // Critical fix: clear the cached promise on failure so the NEXT call genuinely
      // retries from scratch, instead of permanently returning this same rejected
      // promise for the rest of the browser session. Without this, one transient
      // failure (e.g. a slow network on first load) would silently break key
      // detection for every subsequent song analyzed in that session.
      essentiaInstancePromise = null;
      throw e;
    }
  })();

  return essentiaInstancePromise;
}

export interface KeyDetectionResult {
  key: string;              // e.g. "F#"
  scale: "major" | "minor";
  strength: number;         // raw essentia.js correlation strength, 0-1 - kept for
                             // internal/debug reference only. Validated this session
                             // against 19 real songs with known reference keys: this
                             // value does NOT reliably separate correct from incorrect
                             // results (a completely wrong result scored 0.936, higher
                             // than most correct ones), so it is never surfaced to users
                             // as a confidence or "tonal fit" label.
}

function mixToMono(audioBuffer: AudioBuffer): Float32Array {
  const len = audioBuffer.length;
  const out = new Float32Array(len);
  const channels = audioBuffer.numberOfChannels;
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < len; i++) {
      out[i] += data[i] / channels;
    }
  }
  return out;
}

/**
 * Detects musical key using essentia.js's real, peer-reviewed HPCP+Key algorithm
 * (Music Technology Group, UPF Barcelona) - a genuine, validated improvement over the
 * basic chroma+Krumhansl approach previously used and removed from this app.
 *
 * IMPORTANT, deliberate design decisions based on real validation this session:
 * - Does NOT compute or return a "relative major/minor alternative" - that would be
 *   manufactured from music theory, not detected from audio, and was specifically
 *   identified and corrected as a real mistake during development.
 * - Does NOT convert the raw strength value into a confidence or "tonal fit" label -
 *   validated against 19 real songs with known reference keys and found to not
 *   reliably discriminate correct from incorrect results.
 * The UI should show the single estimated key with a general, honest, unvarying
 * disclaimer about relative-key and modal ambiguity - never a per-song confidence
 * figure derived from this data.
 */
export async function detectMusicalKey(audioBuffer: AudioBuffer): Promise<KeyDetectionResult | null> {
  try {
    const essentia = await getEssentiaInstance();
    const mono = audioBuffer.numberOfChannels > 1
      ? mixToMono(audioBuffer)
      : audioBuffer.getChannelData(0);

    const vectorInput = essentia.arrayToVector(mono);
    const result = essentia.KeyExtractor(vectorInput);

    const rawScale: string = (result.scale || "").toLowerCase() === "minor" ? "minor" : "major";

    return {
      key: result.key,
      scale: rawScale as "major" | "minor",
      strength: typeof result.strength === "number" ? result.strength : 0,
    };
  } catch (e) {
    console.warn("[KeyDetection] essentia.js key detection failed (non-fatal):", e);
    return null;
  }
}

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
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
  return analyzePcmData(audioBuffer.sampleRate, audioBuffer.numberOfChannels, ch0, ch1);
}

/**
 * Pure PCM version of the live analyzer. This contains the exact same analysis math as
 * analyzeAudioBuffer(), but accepts plain Float32Array channels so the temporary batch
 * runner can execute it inside a Web Worker without blocking the browser UI thread.
 */

// Stage 1A: opt-in, reference-oriented meters for offline comparisons.
// Not called by analyzeAudioBuffer / analyzePcmData or any scoring/report path.
// Existing calculatedLufs, calculatedTruePeak, calculatedLra, RMS and crest remain unchanged.
// Acceptance targets (fixed before the prototype): LUFS +/-0.5 LU; LRA +/-1 LU;
// sample peak +/-0.1 dB; 4x true peak +/-0.5 dBTP; convention-matched crest +/-0.5 dB.
// Input is the original decoded mono/stereo PCM at its actual sample rate.
export interface Stage1aMeterReadings {
  samplePeakDbfs: number | null;
  truePeakDbtp4x: number | null;
  rmsDbfs: number | null;
  midRmsDbfs: number | null;
  crestFactorDb: number | null;
  midCrestFactorDb: number | null;
  integratedLufs: number | null;
  loudnessRangeLu: number | null;
}
export interface Stage1aMeterComparison {
  method: "stage1a-reference-v1";
  sampleRate: number;
  channelCount: number;
  sampleCount: number;
  // Diagnostic-only validity status, not a production applicability decision.
  lraAvailability: "AVAILABLE" | "SILENCE" | "TOO_SHORT" |
    "INSUFFICIENT_GATED_WINDOWS";
  // Exploratory peak-relative energy-duration observation, not an LRA
  // availability criterion; an isolated peak can skew this value.
  equivalentPeakPowerDurationSeconds: number;
  // The Annex 2 coefficient set assumes 48 kHz PCM. At other rates a
  // numeric 4x estimate remains exploratory until independently validated.
  truePeakAccuracyStatus: "ANNEX2_48KHZ_REFERENCE_NOT_CERTIFIED" | "NON_48KHZ_UNVERIFIED";
  measurements: Stage1aMeterReadings;
  // Corrected value minus the unchanged legacy value, in the same units.
  differences: Record<string, number>;
  limitations: string[];
}

export function analyzeStage1aMeterReference(
  channels: Float32Array[],
  sampleRate: number,
  legacy?: Partial<LiveAudioMetrics>,
): Stage1aMeterComparison {
  if (!Array.isArray(channels) || channels.length < 1 || channels.length > 2 ||
      !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError("Stage 1A requires mono/stereo PCM with a supported sample rate");
  }
  const count = channels[0].length;
  if (!count) throw new RangeError("No PCM samples");
  if (channels.some(channel => !(channel instanceof Float32Array) || channel.length !== count)) {
    throw new RangeError("Stage 1A channels must be equally sized Float32Arrays");
  }
  const db = (amplitude: number): number | null => amplitude > 0 ? 20 * Math.log10(amplitude) : null;
  let sampleMax = 0;
  let sumSq = 0;
  let midSq = 0;
  for (let i = 0; i < count; i++) {
    let mid = 0;
    for (const channel of channels) {
      const value = channel[i];
      if (!Number.isFinite(value)) throw new RangeError("Nonfinite PCM sample");
      sampleMax = Math.max(sampleMax, Math.abs(value));
      sumSq += value * value;
      mid += value;
    }
    mid /= channels.length;
    midSq += mid * mid;
  }
  const samplePeakDbfs = db(sampleMax);
  // A conservative, level-independent sparse-event indicator, not an EBU
  // definition. Equal to the number of seconds at the observed global peak
  // whose energy would equal the programme's mean per-channel energy.
  // For a 6-sample isolated impulse this is <1 ms; a 5-second constant
  // sinusoid is ~2.5 s. This is diagnostic evidence only.
  const equivalentPeakPowerDurationSeconds = sampleMax > 0
    ? sumSq / (channels.length * sampleMax * sampleMax * sampleRate)
    : 0;
  const rmsDbfs = db(Math.sqrt(sumSq / (count * channels.length)));
  const midRmsDbfs = db(Math.sqrt(midSq / count));
  const crestFactorDb = samplePeakDbfs !== null && rmsDbfs !== null
    ? samplePeakDbfs - rmsDbfs : null;
  const midCrestFactorDb = samplePeakDbfs !== null && midRmsDbfs !== null
    ? samplePeakDbfs - midRmsDbfs : null;

  // Four-phase 12-tap FIR from ITU-R BS.1770-5 Annex 2, in floating point.
  // Avoids the old 96-tap operations per sample; coefficients are static.
  const firRows = [
    [0.001708984375, -0.0291748046875, -0.0189208984375, -0.00830078125],
    [0.010986328125, 0.029296875, 0.0330810546875, 0.014892578125],
    [-0.0196533203125, -0.0517578125, -0.0582275390625, -0.026611328125],
    [0.033203125, 0.089111328125, 0.1015625, 0.047607421875],
    [-0.0594482421875, -0.16650390625, -0.2003173828125, -0.102294921875],
    [0.1373291015625, 0.465087890625, 0.77978515625, 0.97216796875],
    [0.97216796875, 0.77978515625, 0.465087890625, 0.1373291015625],
    [-0.102294921875, -0.2003173828125, -0.16650390625, -0.0594482421875],
    [0.047607421875, 0.1015625, 0.089111328125, 0.033203125],
    [-0.026611328125, -0.0582275390625, -0.0517578125, -0.0196533203125],
    [0.014892578125, 0.0330810546875, 0.029296875, 0.010986328125],
    [-0.00830078125, -0.0189208984375, -0.0291748046875, 0.001708984375],
  ];
  const polyphase = [0, 1, 2, 3].map(phase => firRows.map(row => row[phase]));
  const kernelAbsBound = Math.max(...polyphase.map(kernel =>
    kernel.reduce((sum, value) => sum + Math.abs(value), 0)));
  let interpolatedPeak = sampleMax;
  // Rigorous local envelope bound: a FIR phase cannot exceed the maximum
  // absolute input in its 12-sample footprint times its kernel L1 norm.
  // Evaluate negative/last sample indices with zero-padding for edge transients.
  for (const channel of channels) {
    for (let index = -6; index < count + 6; index++) {
      let envelope = 0;
      for (let tap = 0; tap < 12; tap++) {
        const at = index + tap - 5;
        if (at >= 0 && at < count) envelope = Math.max(envelope, Math.abs(channel[at]));
      }
      if (envelope * kernelAbsBound <= interpolatedPeak) continue;
      for (const kernel of polyphase) {
        let estimate = 0;
        for (let tap = 0; tap < 12; tap++) {
          const at = index + tap - 5;
          if (at >= 0 && at < count) estimate += channel[at] * kernel[tap];
        }
        interpolatedPeak = Math.max(interpolatedPeak, Math.abs(estimate));
      }
    }
  }
  const truePeakDbtp4x = db(interpolatedPeak);

  // ITU-R BS.1770 K-weighting design: pre-shelf and RLB high-pass are derived
  // for the ACTUAL input sample rate. Do not stride through the signal without
  // redesigning the filters (the legacy implementation does this).
  const kPre = Math.tan(Math.PI * 1681.974450955533 / sampleRate);
  const qPre = 0.7071752369554196;
  const vh = Math.pow(10, 3.999843853973347 / 20);
  const vb = Math.pow(vh, 0.4996667741545416);
  const preDen = 1 + kPre / qPre + kPre * kPre;
  const preB = [
    (vh + vb * kPre / qPre + kPre * kPre) / preDen,
    2 * (kPre * kPre - vh) / preDen,
    (vh - vb * kPre / qPre + kPre * kPre) / preDen,
  ];
  const preA = [1, 2 * (kPre * kPre - 1) / preDen, (1 - kPre / qPre + kPre * kPre) / preDen];
  const kHp = Math.tan(Math.PI * 38.13547087602444 / sampleRate);
  const qHp = 0.5003270373238773;
  const hpDen = 1 + kHp / qHp + kHp * kHp;
  const hpB = [1, -2, 1];
  const hpA = [1, 2 * (kHp * kHp - 1) / hpDen, (1 - kHp / qHp + kHp * kHp) / hpDen];

  // Bounded-memory sample-rate-correct K-weighted analysis. Reuse biquad
  // state and only retain 100ms bucket energies (30-bucket rolling window)
  // and 400ms/3s power observations, not full-track filtered PCM arrays.
  const biquad = (b: number[], a: number[]) => {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    return (x: number) => {
      const y = b[0] * x + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    };
  };
  const kFilters = channels.map(() => {
    const pre = biquad(preB, preA), hp = biquad(hpB, hpA);
    return (v: number) => hp(pre(v));
  });
  const energyRing = new Float64Array(30), countRing = new Uint32Array(30);
  const momentaryPowers: number[] = [], shortTermPowers: number[] = [];
  let bucket = 0, bucketEnd = Math.round(sampleRate / 10);
  let bucketEnergy = 0, bucketSamples = 0;
  // EBU Tech 3342, file-based LRA: continue the K-weighted stream for
  // >=1.5 s of zero input after the programme. This permits the last
  // programme samples to contribute to the trailing 3-second windows.
  // The synthetic silence is NOT included in integrated loudness,
  // peak, RMS, crest, or the supplied audio duration.
  const lraTrailingSamples = Math.ceil(sampleRate * 1.5);
  for (let i = 0; i < count + lraTrailingSamples; i++) {
    for (let ch = 0; ch < channels.length; ch++) {
      const weighted = kFilters[ch](i < count ? channels[ch][i] : 0);
      bucketEnergy += weighted * weighted;
    }
    bucketSamples++;
    if (i + 1 !== bucketEnd) continue;
    const slot = bucket % 30;
    energyRing[slot] = bucketEnergy;
    countRing[slot] = bucketSamples;
    bucket++;
    if (bucket >= 4) {
      let power = 0, samples = 0;
      for (let j = 0; j < 4; j++) {
        const at = (bucket - 1 - j) % 30;
        power += energyRing[at]; samples += countRing[at];
      }
      // Keep integrated loudness programme-only. Post-programme silence
      // is a measurement-latency convention for LRA, not extra content.
      if (i + 1 <= count) momentaryPowers.push(power / samples);
    }
    if (bucket >= 30) {
      let power = 0, samples = 0;
      for (let j = 0; j < 30; j++) {
        const at = (bucket - 1 - j) % 30;
        power += energyRing[at]; samples += countRing[at];
      }
      shortTermPowers.push(power / samples);
    }
    bucketEnergy = 0; bucketSamples = 0;
    // This boundary expression remains accurate for fractional 100ms
    // sample counts, such as a 11025 Hz decoded recording.
    bucketEnd = Math.round((bucket + 1) * sampleRate / 10);
  }
  const loudness = (power: number): number =>
    power > 0 ? -0.691 + 10 * Math.log10(power) : -Infinity;
  const mean = (values: number[]): number =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const gated = (values: number[], absolute: number, relative: number): number[] => {
    const aboveAbsolute = values.filter(power => loudness(power) > absolute);
    if (!aboveAbsolute.length) return [];
    const threshold = loudness(mean(aboveAbsolute)) - relative;
    return aboveAbsolute.filter(power => loudness(power) > threshold);
  };
  const integrated = gated(momentaryPowers, -70, 10);
  const integratedLufs = integrated.length ? loudness(mean(integrated)) : null;

  // EBU Tech 3342 v4: short-term 3-second measurements at >=10 Hz,
  // with -70 LUFS absolute gating and -20 LU relative gating.
  // FFmpeg/libebur128 rounded percentile ranks: round((N-1) * p).
  // EBU specifies percentile ESTIMATES; this convention is documented rather
  // than misrepresenting it as a uniquely mandated EBU estimator.
  const lraPowers = gated(shortTermPowers, -70, 20);
  let loudnessRangeLu: number | null = null;
  if (count >= Math.round(3 * sampleRate) && lraPowers.length >= 2) {
    const sorted = lraPowers.map(loudness).sort((a, b) => a - b);
    loudnessRangeLu =
      sorted[Math.round((sorted.length - 1) * 0.95)] -
      sorted[Math.round((sorted.length - 1) * 0.1)];
  }
  // Availability follows existing gated-window support. The experimental
  // peak-equivalent duration cannot independently invalidate LRA: a single
  // peak within an otherwise continuous programme may make it very small.
  const lraAvailability: Stage1aMeterComparison["lraAvailability"] =
    sampleMax === 0 ? "SILENCE" :
    count < Math.round(3 * sampleRate) ? "TOO_SHORT" :
    loudnessRangeLu === null ? "INSUFFICIENT_GATED_WINDOWS" : "AVAILABLE";
  const measurements: Stage1aMeterReadings = {
    samplePeakDbfs, truePeakDbtp4x, rmsDbfs, midRmsDbfs,
    crestFactorDb, midCrestFactorDb, integratedLufs, loudnessRangeLu,
  };
  const differences: Record<string, number> = {};
  if (legacy) {
    const pairs: Array<[keyof LiveAudioMetrics, keyof Stage1aMeterReadings]> = [
      ["calculatedLufs", "integratedLufs"],
      ["calculatedLra", "loudnessRangeLu"],
      ["calculatedTruePeak", "truePeakDbtp4x"],
      ["calculatedRmsDbfs", "rmsDbfs"],
      ["calculatedCrestFactorDb", "crestFactorDb"],
    ];
    for (const [oldName, newName] of pairs) {
      const oldValue = legacy[oldName];
      const newValue = measurements[newName];
      if (typeof oldValue === "number" && Number.isFinite(oldValue) &&
          typeof newValue === "number" && Number.isFinite(newValue)) {
        if (oldName !== "calculatedRmsDbfs" && oldName !== "calculatedCrestFactorDb") {
          differences[oldName] = newValue - oldValue;
        }
      }
    }
    // Compare the old mid-channel RMS against the reference mid-channel RMS,
    // not against full-stereo RMS (a different definition).
    if (typeof legacy.calculatedRmsDbfs === "number" && midRmsDbfs !== null) {
      differences.legacyMidRmsVsReferenceMidRms = midRmsDbfs - legacy.calculatedRmsDbfs;
    }
    if (typeof legacy.calculatedTruePeak === "number" && samplePeakDbfs !== null) {
      differences.legacyPeakVsFullSamplePeak = samplePeakDbfs - legacy.calculatedTruePeak;
    }
    if (typeof legacy.calculatedCrestFactorDb === "number" && midCrestFactorDb !== null) {
      differences.legacyCrestVsFullMidCrest = midCrestFactorDb - legacy.calculatedCrestFactorDb;
    }
  }
  return {
    method: "stage1a-reference-v1", sampleRate, channelCount: channels.length,
    sampleCount: count, lraAvailability, equivalentPeakPowerDurationSeconds,
    truePeakAccuracyStatus: sampleRate === 48000
      ? "ANNEX2_48KHZ_REFERENCE_NOT_CERTIFIED"
      : "NON_48KHZ_UNVERIFIED",
    measurements, differences,
    limitations: [
      "4x BS.1770 Annex 2 polyphase FIR diagnostic is not independently certified at all sample rates",
      "Full-channel and stereo-mid RMS/crest have different conventions; only like-for-like error deltas are reported",
      "LRA measured at 10 Hz with 1.5 s of post-programme silence and rounded percentile rank; programme shorter than 3 s or fewer than two gated windows is unavailable",
      "Peak-equivalent energy duration is exploratory diagnostic evidence only; no 50 ms LRA availability threshold is applied",
      sampleRate === 48000
        ? "True peak uses the ITU Annex 2 48 kHz reference configuration; not independently certified"
        : "True-peak estimate at this sample rate is exploratory and not independently validated",
      "No new score or applicability decision is made by this module",
    ],
  };
}

export function analyzePcmData(
  sampleRate: number,
  numChannels: number,
  ch0: Float32Array,
  ch1Input?: Float32Array
): LiveAudioMetrics {
  const duration = ch0.length / sampleRate;
  const len = ch0.length;
  const ch1 = numChannels > 1 && ch1Input ? ch1Input : ch0;

  console.log(`[LiveAnalyzer] Analyzing PCM: channels=${numChannels}, rate=${sampleRate}Hz, duration=${duration.toFixed(2)}s`);

  // 1. Calculate peak plus full-track RMS/crest for the production-finish cross-check.
  // RMS uses the stereo mid signal while peak uses the maximum channel sample, matching
  // the frozen 17-song benchmark harness used to calibrate this diagnostic.
  let maxAbsSample = 0;
  let finishRmsSum = 0;
  let finishRmsCount = 0;
  // Sub-sample slightly for speed/efficiency (scan every 2nd sample).
  for (let i = 0; i < len; i += 2) {
    const raw0 = ch0[i] || 0;
    const raw1 = numChannels > 1 ? (ch1[i] || 0) : raw0;
    const val0 = Math.abs(raw0);
    const val1 = Math.abs(raw1);
    if (val0 > maxAbsSample) maxAbsSample = val0;
    if (val1 > maxAbsSample) maxAbsSample = val1;

    const mid = (raw0 + raw1) * 0.5;
    finishRmsSum += mid * mid;
    finishRmsCount++;
  }
  let truePeak = 20 * Math.log10(maxAbsSample || 0.0001);
  if (truePeak < -60) truePeak = -60;
  if (truePeak > 3.0) truePeak = 3.0; // soft cap clipping

  const finishRms = Math.sqrt(finishRmsSum / Math.max(1, finishRmsCount));
  const finishRmsDbfs = 20 * Math.log10(finishRms || 0.0001);
  const finishCrestFactorDb = truePeak - finishRmsDbfs;

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
  // Fixed: previously only applied the absolute gate (-70), missing the relative gate
  // (-20 LU below average) that real EBU R128 LRA measurement requires specifically -
  // this is a different, wider threshold than the -10 LU relative gate used for
  // Integrated Loudness above. Confirmed via real-audio testing: without this gate,
  // genuinely quiet blocks (sparse verses, near-silence) inflate the reported range -
  // one real test track went from an implausible 20.7 LU down to a real 12.5 LU once
  // this gate was correctly applied.
  let lra = 5.4; // standard fallback
  if (blockPowers.length > 5) {
    const absoluteGatedForLra = blockPowers.filter(p => p > -70);
    if (absoluteGatedForLra.length > 5) {
      const sumAbsForLra = absoluteGatedForLra.reduce((acc, v) => acc + Math.pow(10, v / 10), 0);
      const avgAbsDbForLra = 10 * Math.log10(sumAbsForLra / absoluteGatedForLra.length);
      const relativeGatedForLra = absoluteGatedForLra.filter(p => p > (avgAbsDbForLra - 20));
      const sortedPowers = relativeGatedForLra.length > 5
        ? [...relativeGatedForLra].sort((a, b) => a - b)
        : [...absoluteGatedForLra].sort((a, b) => a - b);
      if (sortedPowers.length > 5) {
        const idx10 = Math.floor(sortedPowers.length * 0.1);
        const idx95 = Math.floor(sortedPowers.length * 0.95);
        lra = sortedPowers[idx95] - sortedPowers[idx10];
      }
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

  // BPM_DEBUG: convert a lag (in envelope frames) to a raw BPM value for logging.
  const lagToBpm = (lag: number): number => parseFloat((60 / (lag / (sampleRate / hopSize))).toFixed(1));

  let bestAcf = 0;
  let bestLag = minLag;
  let bestSupportScore = -Infinity;
  const debugCandidates: { bpm: number; correlation: number; support2x: number; support3x: number; supportScore: number }[] = [];
  for (const candidate of topCandidates) {
    const support2x = getAcfAtLag(candidate.lag * 2);
    const support3x = getAcfAtLag(candidate.lag * 3);
    // Support weight reduced from 0.5/0.3 to 0.08/0.05, verified against real debug-logged
    // results from 4 test songs. At the old weight, a candidate with a strong "octave
    // sibling" (a 2x or 3x relative) could override a competitor with clearly higher raw
    // correlation - confirmed on Boston (109 BPM had the highest raw score of all 5
    // candidates but lost to 176 purely via this boost) and Bangarang (same failure shape,
    // 109 BPM losing to 146). At this lower weight both now correctly resolve to the true
    // tempo. Verified this doesn't regress Drake's God's Plan, which has two legitimately
    // valid readings (77/154 BPM, both independently confirmed) - it now lands on 77
    // instead of 154, still a defensible answer, not a new error.
    const supportScore = candidate.val + support2x * 0.08 + support3x * 0.05;
    debugCandidates.push({
      bpm: lagToBpm(candidate.lag),
      correlation: parseFloat(candidate.val.toFixed(2)),
      support2x: parseFloat(support2x.toFixed(2)),
      support3x: parseFloat(support3x.toFixed(2)),
      supportScore: parseFloat(supportScore.toFixed(2))
    });
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

  // Fold into 60-200 BPM range - was previously capped at 180, but the autocorrelation
  // search itself covers lags down to 200 BPM (see minLag above), so any genuinely fast
  // song (EDM, punk, drum and bass) between 180-200 BPM was being silently halved into
  // range even when the higher tempo was correct. Fold range now matches search range.
  let foldedBpm = rawBpm;
  while (foldedBpm > 200) foldedBpm /= 2;
  while (foldedBpm < 60) foldedBpm *= 2;
  const candidateBpm = Math.round(foldedBpm);

  if (typeof window !== "undefined" && (window as any).BPM_DEBUG) {
    console.log("[BPM_DEBUG] Top candidate lags considered (sorted by raw correlation):");
    console.table(debugCandidates);
    console.log(`[BPM_DEBUG] Winner: ${lagToBpm(bestLag)} BPM raw -> ${candidateBpm} BPM after fold (support score: ${bestSupportScore.toFixed(2)})`);
  }

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

  const keyNamesForDebug = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  if (typeof window !== "undefined" && (window as any).KEY_DEBUG) {
    const initialWinnerName = `${keyNamesForDebug[estimatedKeyIndex % 12]} ${estimatedKeyIndex < 12 ? "Major" : "Minor"}`;
    const sorted = allCorrelations
      .map((r, idx) => ({ idx, r, name: `${keyNamesForDebug[idx % 12]} ${idx < 12 ? "Major" : "Minor"}` }))
      .sort((a, b) => b.r - a.r)
      .slice(0, 6);
    console.log("[KEY_DEBUG] Initial (pre-disambiguation) winner:", initialWinnerName, "correlation:", bestCorrelation.toFixed(3));
    console.log("[KEY_DEBUG] Top 6 candidates by raw correlation:");
    console.table(sorted.map(s => ({ key: s.name, correlation: parseFloat(s.r.toFixed(3)) })));
  }

  // Disambiguation pass: basic Krumhansl-Schmuckler correlation is well-documented to
  // frequently confuse the true tonic with its dominant (a perfect fifth away), its
  // relative major/minor (a minor third away), or other closely-related keys, since
  // these share most of the same notes. If a close runner-up candidate exists in one
  // of these relationships, use the candidate's full tonic TRIAD energy (root + third +
  // fifth) as a tie-breaker, rather than a single noisy bin - a genuine tonic should
  // show coherent strength across its whole triad, not just an isolated pitch spike.
  let bestTonicPitch = estimatedKeyIndex % 12;
  let bestIsMajor = estimatedKeyIndex < 12;
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
      if (typeof window !== "undefined" && (window as any).KEY_DEBUG) {
        const ruleName = isDominantRelation ? "dominant" : isRelativeMajorMinorRelation ? "relative major/minor"
          : isCrossModeDominant ? "cross-mode dominant" : isMirrorCrossModeDominant ? "mirror cross-mode dominant"
          : isSupertonicRelation ? "supertonic" : "adjacent semitone";
        const candName = `${keyNamesForDebug[candidateTonicPitch]} ${candidateIsMajor ? "Major" : "Minor"}`;
        console.log(`[KEY_DEBUG] Close candidate ${candName} triggers "${ruleName}" rule - triad energy: candidate=${candidateTriadEnergy.toFixed(3)} vs current-best=${bestTriadEnergy.toFixed(3)} ->`, candidateTriadEnergy > bestTriadEnergy ? "SWITCHING to candidate" : "keeping current best");
      }
      if (candidateTriadEnergy > bestTriadEnergy) {
        estimatedKeyIndex = keyIdx;
        bestCorrelation = allCorrelations[keyIdx];
        bestTonicPitch = candidateTonicPitch;
        bestIsMajor = candidateIsMajor;
      }
    }
  }

  if (typeof window !== "undefined" && (window as any).KEY_DEBUG) {
    console.log(`[KEY_DEBUG] Final answer: ${keyNamesForDebug[estimatedKeyIndex % 12]} ${estimatedKeyIndex < 12 ? "Major" : "Minor"}`);
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

  // Minimum Pearson correlation required to accept a frame's best-matching chord template
  // as a confident guess. Previously every frame with any energy was forced into whichever
  // (root, quality) pair scored highest, even when that correlation was weak - meaning
  // genuinely ambiguous or non-triadic chroma content (chord transitions, passing tones, or
  // real multi-instrument mixes where other instruments blur the harmonic content) still
  // produced a specific, often-wrong chord guess instead of being marked "unclear" - the
  // classification this pipeline already has a clean, existing mechanism to filter out
  // downstream. Ground-truth testing against real sheet music showed a 6x chord-count
  // overcounting gap (36 detected vs. 6 real unique chords), consistent with this gap.
  const MIN_CHORD_CONFIDENCE = 0.55;

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

    if (bestCorr >= MIN_CHORD_CONFIDENCE) {
      frameGuesses.push({ root: bestRoot, quality: bestQuality, bassPitchClass: bassPC });
    } else {
      frameGuesses.push({ root: -1, quality: "unclear", bassPitchClass: bassPC });
    }
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

  // Two-pass energy-prioritized sampling. The old approach spent a fixed frame budget
  // evenly across the ENTIRE song regardless of content - wasting most of that budget on
  // intros, gaps between vocal phrases, and instrumental-only sections. Ground-truth testing
  // against real sheet music showed this was leaving most real vocal notes undetected even
  // after raising the raw budget (9 -> 57 out of 186 real notes on one test song).
  //
  // Pass 1 (cheap): scan every hop in the song for RMS energy - O(windowSize/stride) per
  // hop, much cheaper than the full YIN difference function - to find which hops actually
  // have meaningful signal present.
  // Pass 2 (expensive): spend the fixed YIN analysis budget only on those active hops, in
  // chronological order, so the budget concentrates on content instead of silence. Where
  // hops are skipped (either genuine silence or spacing within a dense active region), an
  // explicit "unvoiced" marker frame is inserted so the note-assembly logic downstream can't
  // accidentally merge two coincidentally-same-pitch notes across a real gap.
  const activeHopIndices: number[] = [];
  const energyStride = 4; // subsample within each window during the cheap scan for speed
  for (let f = 0; f < totalYinFrames; f++) {
    const t = f * yinHopSize;
    let sum = 0;
    let sampleCount = 0;
    for (let j = 0; j < yinWindowSize; j += energyStride) {
      const v = ch0[t + j] || 0;
      sum += v * v;
      sampleCount++;
    }
    const rms = Math.sqrt(sum / sampleCount);
    if (rms >= 0.01) {
      activeHopIndices.push(f);
    }
  }

  const yinFrameBudget = 2000;
  const activeStep = Math.max(1, Math.ceil(activeHopIndices.length / yinFrameBudget));

  const melodyFrames: { voiced: boolean; frequencyHz?: number; midiNote?: number; timeSec: number }[] = [];
  let lastProcessedHop = -999;

  for (let idx = 0; idx < activeHopIndices.length; idx += activeStep) {
    const f = activeHopIndices[idx];
    const t = f * yinHopSize;
    const timeSec = parseFloat((t / sampleRate).toFixed(2));

    if (f - lastProcessedHop > 1) {
      // Non-contiguous jump (silence gap, or spacing within a dense active region) -
      // insert a break marker so note-assembly doesn't wrongly merge notes across it.
      melodyFrames.push({ voiced: false, timeSec });
    }
    lastProcessedHop = f;

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
    // Threshold loosened from 0.25 to 0.30 — real mixed/mastered audio (background
    // instrumentation, reverb, compression) blurs periodicity clarity even during
    // genuinely sung passages, which was causing too many real vocal frames to be
    // rejected as "unvoiced." This accepts a slightly weaker periodicity dip as valid.
    let bestTau = -1;
    for (let tau = 2; tau < yinMaxTau; tau++) {
      if (cmndf[tau] < 0.30) {
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

  // Pitch smoothing pass. The move to dense, energy-prioritized sampling (closer frame
  // spacing within active regions) exposed normal frame-to-frame pitch-tracking jitter that
  // was invisible at the old, much coarser sampling rate. At fine spacing, a genuinely
  // sustained note's raw MIDI estimate can bounce +/-1 semitone between adjacent frames,
  // which was breaking the "same note" streak the segmentation logic below relies on -
  // fragmenting real sustained notes into noise almost entirely, rather than detecting them.
  // A small mode filter (most common value in a 5-frame window) absorbs that single-frame
  // jitter while still tracking genuine pitch changes, since a real change dominates its own
  // window once it persists for more than a frame or two.
  const smoothingHalfWindow = 2;
  const smoothedMidiNotes: (number | undefined)[] = melodyFrames.map(f => f.midiNote);
  for (let i = 0; i < melodyFrames.length; i++) {
    if (!melodyFrames[i].voiced || melodyFrames[i].midiNote === undefined) continue;
    const counts = new Map<number, number>();
    for (let k = Math.max(0, i - smoothingHalfWindow); k <= Math.min(melodyFrames.length - 1, i + smoothingHalfWindow); k++) {
      const note = melodyFrames[k].midiNote;
      if (melodyFrames[k].voiced && note !== undefined) {
        counts.set(note, (counts.get(note) || 0) + 1);
      }
    }
    let bestNote = melodyFrames[i].midiNote!;
    let bestCount = 0;
    for (const [note, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestNote = note;
      }
    }
    smoothedMidiNotes[i] = bestNote;
  }
  for (let i = 0; i < melodyFrames.length; i++) {
    if (melodyFrames[i].voiced) {
      melodyFrames[i].midiNote = smoothedMidiNotes[i];
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

  // Discard any note segment shorter than 45ms. Duration-based rather than frame-count-based
  // deliberately - frame count only meant something when every frame was evenly spaced across
  // the whole song; with energy-prioritized sampling, spacing varies, so actual elapsed time
  // is the only sampling-density-invariant way to reject spuriously short fragments.
  const noteSegments = rawNoteSegments
    .filter(seg => (seg.endTimeSec - seg.startTimeSec) >= 0.045)
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

  // Separate, relative-energy bands used only by the production-finish cross-check.
  // These ranges intentionally match the frozen 17-song benchmark harness exactly.
  const finishBandRanges = [
    { min: 20, max: 60 },      // sub
    { min: 60, max: 250 },     // bass
    { min: 250, max: 500 },    // low-mid
    { min: 500, max: 2000 },   // mid
    { min: 2000, max: 6000 },  // presence
    { min: 6000, max: 11000 }  // air
  ];
  const finishBandPowerSums = new Float64Array(6);
  
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
      const power = re * re + im * im;
      const magnitude = Math.sqrt(power);
      
      for (let b = 0; b < 6; b++) {
        if (freq >= bandRanges[b].min && freq < bandRanges[b].max) {
          bandSums[b] += magnitude;
          bandCounts[b]++;
          break;
        }
      }

      for (let b = 0; b < 6; b++) {
        if (freq >= finishBandRanges[b].min && freq < finishBandRanges[b].max) {
          finishBandPowerSums[b] += power;
          break;
        }
      }
    }
  }
  
  const bandDbFloor = -22;
  const bandDbCeiling = 45;
  const bandEnergies = new Float32Array(6);
  
  for (let b = 0; b < 6; b++) {
    const avgMag = bandCounts[b] > 0 ? bandSums[b] / bandCounts[b] : 0.0001;
    let db = 20 * Math.log10(avgMag || 0.0001);
    let score = ((db - bandDbFloor) / (bandDbCeiling - bandDbFloor)) * 100;
    bandEnergies[b] = Math.max(0, Math.min(100, Math.round(score)));
  }

  const finishBandTotal = Array.from(finishBandPowerSums).reduce((sum, value) => sum + value, 0) || 1;
  const finishBandPct = Array.from(finishBandPowerSums).map(value => (100 * value) / finishBandTotal);
  const finishSubPct = finishBandPct[0];
  const finishMidPct = finishBandPct[3];
  const finishAirPct = finishBandPct[5];

  // DSP evidence package for Mud Prevention / Midrange Spacing / Low-End Division,
  // built per the agreed approach: real, multi-signal observations (not a single
  // manufactured "mud score" or "separation score") for Gemini to interpret alongside
  // genre context. Reuses the exact same FFT frames from the loop above - tracked
  // separately here since these need per-frame time-series (for correlation/flux),
  // not just an aggregate sum like the 6-band energy measurement above.
  const subBassTimeSeries: number[] = [];
  const bassTimeSeries: number[] = [];
  const mudFrameMagnitudes: number[][] = [];
  const midrangeFrameMagnitudes: number[][] = [];

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
    let subSum = 0, subCount = 0, bassSum = 0, bassCount = 0;
    const mudMags: number[] = [];
    const midMags: number[] = [];

    for (let k = 1; k < numBins; k++) {
      const freq = k * binHz;
      const re = bandComplexOut[2 * k];
      const im = bandComplexOut[2 * k + 1];
      const magnitude = Math.sqrt(re * re + im * im);

      if (freq >= 20 && freq < 60) { subSum += magnitude; subCount++; }
      if (freq >= 60 && freq < 150) { bassSum += magnitude; bassCount++; }
      if (freq >= 150 && freq < 400) mudMags.push(magnitude);
      if (freq >= 400 && freq < 4000) midMags.push(magnitude);
    }

    subBassTimeSeries.push(subCount > 0 ? subSum / subCount : 0);
    bassTimeSeries.push(bassCount > 0 ? bassSum / bassCount : 0);
    mudFrameMagnitudes.push(mudMags);
    midrangeFrameMagnitudes.push(midMags);
  }

  function pearsonCorrelation(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    if (n < 3) return 0;
    const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
    const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA, db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    const den = Math.sqrt(denA * denB);
    return den > 0 ? num / den : 0;
  }

  function crestFactor(series: number[]): number {
    if (series.length === 0) return 0;
    const peak = Math.max(...series);
    const avg = series.reduce((s, v) => s + v, 0) / series.length;
    return avg > 0 ? peak / avg : 0;
  }

  function spectralFlatnessAndFlux(frameMags: number[][]): { flatness: number; flux: number } {
    const flatnessVals: number[] = [];
    const fluxVals: number[] = [];
    let prevFrame: number[] | null = null;
    for (const mags of frameMags) {
      const positive = mags.filter(m => m > 1e-10);
      if (positive.length > 0) {
        const logSum = positive.reduce((s, v) => s + Math.log(v), 0);
        const geoMean = Math.exp(logSum / positive.length);
        const arithMean = positive.reduce((s, v) => s + v, 0) / positive.length;
        flatnessVals.push(arithMean > 0 ? geoMean / arithMean : 0);
      }
      if (prevFrame && prevFrame.length === mags.length && mags.length > 0) {
        let sumSq = 0;
        for (let i = 0; i < mags.length; i++) {
          const d = mags[i] - prevFrame[i];
          sumSq += d * d;
        }
        fluxVals.push(Math.sqrt(sumSq / mags.length));
      }
      prevFrame = mags;
    }
    const flatness = flatnessVals.length > 0 ? flatnessVals.reduce((s, v) => s + v, 0) / flatnessVals.length : 0;
    const flux = fluxVals.length > 0 ? fluxVals.reduce((s, v) => s + v, 0) / fluxVals.length : 0;
    return { flatness: parseFloat(flatness.toFixed(3)), flux: parseFloat(flux.toFixed(2)) };
  }

  const subBassCorrelation = parseFloat(pearsonCorrelation(subBassTimeSeries, bassTimeSeries).toFixed(3));
  const subBassCrestFactor = parseFloat(crestFactor(subBassTimeSeries).toFixed(2));
  const bassCrestFactor = parseFloat(crestFactor(bassTimeSeries).toFixed(2));
  const mudEvidence = spectralFlatnessAndFlux(mudFrameMagnitudes);
  const midrangeEvidence = spectralFlatnessAndFlux(midrangeFrameMagnitudes);


  // Modulation (how much loudness contrast exists between quiet and loud sections) and
  // Climax Trajectory (whether the song builds toward a genuine late peak, rather than
  // front-loading its energy). Real, computed values - first-pass reasoned scoring curves,
  // not yet empirically calibrated against real songs, same as other new metrics this
  // session; worth checking against real test songs before trusting the exact numbers.
  // Windowed RMS energy envelope across the whole song - shared basis for both Dynamic
  // Modulation (how much loudness contrast exists between quiet and loud sections) and
  // Climax Trajectory (whether the song builds toward a genuine late peak, rather than
  // front-loading its energy). Real, computed values - first-pass reasoned scoring curves,
  // not yet empirically calibrated against real songs, same as other new metrics this
  // session; worth checking against real test songs before trusting the exact numbers.
  const energyWindowSec = 1.0;
  const energyWindowSamples = Math.round(energyWindowSec * sampleRate);
  const numEnergyWindows = Math.max(1, Math.floor(len / energyWindowSamples));
  const windowRmsDb: number[] = [];
  for (let w = 0; w < numEnergyWindows; w++) {
    const start = w * energyWindowSamples;
    let sum = 0;
    for (let j = 0; j < energyWindowSamples; j += 4) { // subsample for speed
      const v = ch0[start + j] || 0;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / (energyWindowSamples / 4));
    windowRmsDb.push(20 * Math.log10(rms || 0.0001));
  }

  // Exposed energy envelope - the full time-series, not just summary stats, so the
  // frontend can actually draw the real shape behind Dynamic Modulation, Climax
  // Trajectory, and Arrangement Flow's scores, instead of showing a number with nothing
  // to look at. Same underlying data all three scores are computed from.
  const energyEnvelope: { timeSec: number; db: number }[] = windowRmsDb.map((db, w) => ({
    timeSec: parseFloat((w * energyWindowSec).toFixed(1)),
    db: parseFloat(db.toFixed(1))
  }));

  // Section boundary detection on this same envelope, reusing the same proven technique
  // already used for the Song Structure card (smoothing + local min/max/big-change
  // detection + minimum-section-duration merge) - real, DSP-detected transition points,
  // not AI-guessed ones. Exposed as timestamps so Arrangement Flow's visualization can
  // show real detected transitions instead of implying its AI-judged score comes from
  // something it doesn't.
  //
  // Re-bucketed into a fixed 32 windows regardless of song length before detection -
  // matching Song Structure's proven resolution strategy. Running detection directly on
  // raw 1-second-resolution data was tested first and produced 30+ noisy boundaries for
  // a song with only 5 real transitions; fixed-window bucketing (heavier per-window
  // averaging, same as Song Structure already uses successfully) brought that down to a
  // consistent, usable handful of real transitions across repeated synthetic test runs.
  const sectionBoundaries: number[] = [];
  if (windowRmsDb.length >= 8) {
    const numBoundaryWindows = 32;
    const totalEnvelopeSeconds = windowRmsDb.length * energyWindowSec;
    const bucketed: number[] = [];
    for (let i = 0; i < numBoundaryWindows; i++) {
      const startSec = (i / numBoundaryWindows) * totalEnvelopeSeconds;
      const endSec = ((i + 1) / numBoundaryWindows) * totalEnvelopeSeconds;
      const startIdx = Math.floor(startSec / energyWindowSec);
      const endIdx = Math.max(startIdx + 1, Math.floor(endSec / energyWindowSec));
      const slice = windowRmsDb.slice(startIdx, endIdx);
      const avg = slice.length > 0 ? slice.reduce((a, b) => a + b, 0) / slice.length : (windowRmsDb[windowRmsDb.length - 1] ?? 0);
      bucketed.push(avg);
    }

    const boundarySmoothed = bucketed.map((v, i) => {
      const neighbors = bucketed.slice(Math.max(0, i - 1), Math.min(numBoundaryWindows, i + 2));
      return neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
    });
    const rawBoundaries: number[] = [0];
    for (let i = 2; i < numBoundaryWindows - 2; i++) {
      const rising = boundarySmoothed[i] > boundarySmoothed[i - 1] && boundarySmoothed[i - 1] < boundarySmoothed[i - 2];
      const falling = boundarySmoothed[i] < boundarySmoothed[i - 1] && boundarySmoothed[i - 1] > boundarySmoothed[i - 2];
      const bigChange = Math.abs(boundarySmoothed[i] - boundarySmoothed[i - 1]) > 4;
      if ((rising || falling || bigChange) && i - rawBoundaries[rawBoundaries.length - 1] >= 2) {
        rawBoundaries.push(i);
      }
    }
    rawBoundaries.push(numBoundaryWindows);
    const minGap = Math.max(1, Math.floor(numBoundaryWindows * 0.03));
    const merged: number[] = [0];
    for (let i = 1; i < rawBoundaries.length; i++) {
      if (rawBoundaries[i] - merged[merged.length - 1] >= minGap) {
        merged.push(rawBoundaries[i]);
      }
    }
    merged.forEach(idx => sectionBoundaries.push(parseFloat(((idx / numBoundaryWindows) * totalEnvelopeSeconds).toFixed(1))));
  }

  let dynamicModulationScore: number | null = null;
  let dynamicRangeDb: number | null = null;
  let dynamicHighPercentileDb: number | null = null;
  let dynamicLowPercentileDb: number | null = null;
  let climaxTrajectoryScore: number | null = null;
  let climaxPositionRatio: number | null = null;
  let climaxBuildDb: number | null = null;

  if (windowRmsDb.length >= 8) {
    // Silence gate: exclude genuinely silent windows (below -50dB) before computing the
    // percentile range, so true dead air - intro silence, a fade to silence at the outro -
    // doesn't skew the result. Tested empirically this session: this only removes actual
    // silence, not quiet-but-intentional musical content, unlike a blind fixed-time trim
    // (which would cut real music regardless of loudness and was rejected for that reason).
    // Falls back to the ungated set if gating would leave too few windows to be meaningful.
    const SILENCE_GATE_DB = -50;
    const gated = windowRmsDb.filter(db => db > SILENCE_GATE_DB);
    const gatedForRange = gated.length >= 8 ? gated : windowRmsDb;

    const sortedDb = [...gatedForRange].sort((a, b) => a - b);
    const pIndex = (p: number) => sortedDb[Math.min(sortedDb.length - 1, Math.floor(p * sortedDb.length))];
    const highP = pIndex(0.85);
    const lowP = pIndex(0.15);
    dynamicRangeDb = parseFloat((highP - lowP).toFixed(1));
    dynamicHighPercentileDb = parseFloat(highP.toFixed(1));
    dynamicLowPercentileDb = parseFloat(lowP.toFixed(1));

    // DSP FALLBACK ONLY — this is NOT the user-facing quality judgment when Call 2 succeeds.
    // The measured percentile range tells us how much sustained loud/quiet contrast exists,
    // but cannot tell us whether that contrast is artistically well-shaped. The fallback
    // therefore preserves discrimination at the compressed end while still capping wide
    // material at 88: low-range masters may fall into the 70s, healthy range climbs into
    // the low/mid-80s, and additional width above the professional band is never rewarded
    // beyond 88 or penalized for being wide.
    if (dynamicRangeDb <= 0.5) {
      dynamicModulationScore = 65;
    } else if (dynamicRangeDb <= 2) {
      dynamicModulationScore = Math.round(65 + ((dynamicRangeDb - 0.5) / 1.5) * 5);
    } else if (dynamicRangeDb <= 3) {
      dynamicModulationScore = Math.round(70 + (dynamicRangeDb - 2) * 5);
    } else if (dynamicRangeDb <= 4) {
      dynamicModulationScore = Math.round(75 + (dynamicRangeDb - 3) * 4);
    } else if (dynamicRangeDb <= 6) {
      dynamicModulationScore = Math.round(79 + ((dynamicRangeDb - 4) / 2) * 4);
    } else if (dynamicRangeDb <= 9) {
      dynamicModulationScore = Math.round(83 + ((dynamicRangeDb - 6) / 3) * 3);
    } else {
      dynamicModulationScore = Math.round(
        Math.min(88, 86 + Math.min(1, (dynamicRangeDb - 9) / 3) * 2)
      );
    }

    // Climax Trajectory: find the peak of a lightly smoothed envelope (3-window moving
    // average) to avoid a single loud transient spike being mistaken for "the climax."
    const smoothed = windowRmsDb.map((_, i) => {
      const a = windowRmsDb[Math.max(0, i - 1)];
      const b = windowRmsDb[i];
      const c = windowRmsDb[Math.min(windowRmsDb.length - 1, i + 1)];
      return (a + b + c) / 3;
    });
    let peakIdx = 0;
    for (let i = 1; i < smoothed.length; i++) {
      if (smoothed[i] > smoothed[peakIdx]) peakIdx = i;
    }
    climaxPositionRatio = parseFloat((peakIdx / (smoothed.length - 1)).toFixed(2));

    // DSP FALLBACK ONLY — peak timing is a structural characteristic, not proof that the
    // climax was musically effective. Treat most plausible peak locations as broadly
    // professional evidence, reserve lower values for genuinely front-loaded/extreme-edge
    // shapes, and never let timing alone create a 90+ quality score.
    let positionScore: number;
    if (climaxPositionRatio < 0.1) {
      positionScore = 72;
    } else if (climaxPositionRatio < 0.25) {
      positionScore = Math.round(72 + ((climaxPositionRatio - 0.1) / 0.15) * 8);
    } else if (climaxPositionRatio <= 0.9) {
      positionScore = 84;
    } else if (climaxPositionRatio <= 0.97) {
      positionScore = 82;
    } else {
      positionScore = 78;
    }

    // Build magnitude is also descriptive evidence only. A larger rise confirms a stronger
    // measurable build, but it does not prove superior emotional payoff. Rise into the
    // professional band as evidence increases, cap at 88, and never taper downward merely
    // because a cinematic/orchestral piece has a very large dynamic build.
    const firstThirdCount = Math.max(1, Math.floor(smoothed.length / 3));
    const openingAvgDb = smoothed.slice(0, firstThirdCount).reduce((a, b) => a + b, 0) / firstThirdCount;
    const buildDb = smoothed[peakIdx] - openingAvgDb;
    climaxBuildDb = parseFloat(buildDb.toFixed(1));
    let magnitudeScore: number;
    if (buildDb <= 0) {
      magnitudeScore = 68;
    } else if (buildDb <= 2) {
      magnitudeScore = Math.round(68 + (buildDb / 2) * 12);
    } else if (buildDb <= 5) {
      magnitudeScore = Math.round(80 + ((buildDb - 2) / 3) * 6);
    } else {
      magnitudeScore = Math.round(
        Math.min(88, 86 + Math.min(1, (buildDb - 5) / 10) * 2)
      );
    }

    climaxTrajectoryScore = Math.round(positionScore * 0.35 + magnitudeScore * 0.65);
    climaxTrajectoryScore = Math.min(88, climaxTrajectoryScore);
  }

  return {
    calculatedLufs: parseFloat(lufsValue.toFixed(1)),
    calculatedTruePeak: parseFloat(truePeak.toFixed(2)),
    calculatedLra: lra,
    calculatedRmsDbfs: parseFloat(finishRmsDbfs.toFixed(2)),
    calculatedCrestFactorDb: parseFloat(finishCrestFactorDb.toFixed(2)),
    calculatedFinishSubPct: parseFloat(finishSubPct.toFixed(3)),
    calculatedFinishMidPct: parseFloat(finishMidPct.toFixed(3)),
    calculatedFinishAirPct: parseFloat(finishAirPct.toFixed(3)),
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
    calculatedSubBassCorrelation: subBassCorrelation,
    calculatedSubBassCrestFactor: subBassCrestFactor,
    calculatedBassCrestFactor: bassCrestFactor,
    calculatedMudFlatness: mudEvidence.flatness,
    calculatedMudFlux: mudEvidence.flux,
    calculatedMidrangeFlatness: midrangeEvidence.flatness,
    calculatedMidrangeFlux: midrangeEvidence.flux,
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
    calculatedTimbralConsistencyScore: timbralConsistencyScore,
    calculatedGridCohesionScore: (() => {
      // 1. TIMELINE GRID COHESION
      // Reuses the onsetStrength array and the detected BPM from earlier in the function.
      // Identify significant onset peaks (local max and > 40% of the maximum onset strength).
      // Compute absolute deviation (in seconds) from the nearest expected beat position.
      let gridCohesionScore = 80; // Fallback default score if no peaks are found
      if (onsetStrength.length > 0 && detectedBpm > 0) {
        let peakCount = 0;
        let totalDeviation = 0;
        
        // Find significant onset peaks: local maximum and > 40% of maxOnset
        for (let i = 1; i < onsetStrength.length - 1; i++) {
          const val = onsetStrength[i];
          if (val > onsetStrength[i - 1] && val > onsetStrength[i + 1]) {
            if (val > 0.4 * maxOnset) {
              peakCount++;
              // Convert frame index to seconds using hopSize and sampleRate
              const peakTimeSec = (i * hopSize) / sampleRate;
              
              // Calculate beat interval in seconds
              const beatIntervalSec = 60 / detectedBpm;
              
              // Find nearest expected beat position (which falls at multiples of beatIntervalSec from the start)
              const beatIndex = Math.round(peakTimeSec / beatIntervalSec);
              const nearestBeatTimeSec = beatIndex * beatIntervalSec;
              
              // Absolute deviation in seconds
              const deviation = Math.abs(peakTimeSec - nearestBeatTimeSec);
              totalDeviation += deviation;
            }
          }
        }
        
        if (peakCount > 0) {
          const avgGridDeviation = totalDeviation / peakCount;
          
          // Scaling Logic and Calibration Comments:
          // We want near-zero average deviation to yield a high score, while larger deviations yield lower scores.
          // Specifically:
          // - Deviations under 30ms (0.030s) score 90+ (e.g., 0ms is 100, 30ms is 90)
          // - Deviations over 150ms (0.150s) score well below 50 (e.g., 150ms is 45)
          // A piecewise linear mapping handles this precisely and cleanly:
          if (avgGridDeviation <= 0.030) {
            // Linear mapping from 100 (0ms deviation) to 90 (30ms deviation)
            gridCohesionScore = 100 - (avgGridDeviation / 0.030) * 10;
          } else if (avgGridDeviation <= 0.150) {
            // Linear mapping from 90 (30ms deviation) to 45 (150ms deviation)
            const t = (avgGridDeviation - 0.030) / (0.150 - 0.030);
            gridCohesionScore = 90 - t * 45;
          } else {
            // Beyond 150ms deviation, score goes down to a minimum of 10
            const t = (avgGridDeviation - 0.150) / 0.150;
            gridCohesionScore = Math.max(10, 45 - t * 35);
          }
          gridCohesionScore = Math.round(gridCohesionScore);
        }
      }
      return gridCohesionScore;
    })(),
    calculatedInstrumentalWarmthScore: (() => {
      // 2. INSTRUMENTAL WARMTH
      // Reuses the existing 6-band frequency energy percentages already computed in bandEnergies.
      // Bass is bandEnergies[1], Low-Mids is bandEnergies[2], Presence is bandEnergies[4], Air is bandEnergies[5].
      const bassAndLowMids = bandEnergies[1] + bandEnergies[2];
      const presenceAndAir = bandEnergies[4] + bandEnergies[5];
      const warmthRatio = bassAndLowMids / Math.max(1, presenceAndAir);
      
      // Scaling Logic and Calibration Comments:
      // Warmth is a balance, not simply maximum bass.
      // - A ratio around 1.0-1.3 (balanced-to-warm low-mid weight relative to highs) lands in a healthy 75-95 range.
      // - A ratio well below 1.0 (thin/bright/harsh) scores notably lower (e.g., ratio of 0.5 scores around 45).
      // - A ratio that is extremely high (overly dark/muffled mix) also scores lower, not higher.
      let warmthScore = 70;
      if (warmthRatio >= 1.0 && warmthRatio <= 1.3) {
        // Ideal range: interpolate peaking at 95 when ratio is 1.15
        if (warmthRatio <= 1.15) {
          const t = (warmthRatio - 1.0) / 0.15;
          warmthScore = 80 + t * 15; // Maps 1.0..1.15 to 80..95
        } else {
          const t = (warmthRatio - 1.15) / 0.15;
          warmthScore = 95 - t * 10; // Maps 1.15..1.3 to 95..85
        }
      } else if (warmthRatio < 1.0) {
        // Thin / bright imbalance: scale from 10 (at 0.0) up to 80 (at 1.0)
        warmthScore = 10 + warmthRatio * 70;
      } else {
        // Muffled / overly dark imbalance: scale down towards lower scores
        if (warmthRatio <= 3.0) {
          const t = (warmthRatio - 1.3) / 1.7;
          warmthScore = 85 - t * 50; // Maps 1.3..3.0 to 85..35
        } else {
          const t = Math.min(1.0, (warmthRatio - 3.0) / 2.0);
          warmthScore = Math.max(10, 35 - t * 25); // Drops to minimum of 10 for extremely dark tracks
        }
      }
      return Math.round(warmthScore);
    })(),
    calculatedTransientPunchScore: (() => {
      // 3. TRANSIENT PUNCH (crest factor at real onset points)
      // Reuses the same onset peak detection: significant local maxima in onsetStrength, above 40% of maxOnset.
      // For each detected onset, looks at a short 25ms window of raw audio (ch0) starting at that onset's sample position.
      let transientPunchScore = 75; // Default fallback score if no peaks are found
      if (onsetStrength.length > 0) {
        let peakCount = 0;
        let totalCrestFactor = 0;
        const windowSize = Math.floor(sampleRate * 0.025); // 25ms window
        
        for (let i = 1; i < onsetStrength.length - 1; i++) {
          const val = onsetStrength[i];
          if (val > onsetStrength[i - 1] && val > onsetStrength[i + 1]) {
            if (val > 0.4 * maxOnset) {
              peakCount++;
              
              // Map envelope index to raw sample index:
              // envelope was built with hopSize in fCh0, which is downsampled by 'hop' (4)
              const rawSampleIndex = i * hopSize * hop;
              const startSample = Math.min(len - 1, rawSampleIndex);
              const endSample = Math.min(len, startSample + windowSize);
              
              let peakAbs = 0;
              let sumSq = 0;
              let count = 0;
              
              for (let s = startSample; s < endSample; s++) {
                const sampleVal = Math.abs(ch0[s]);
                if (sampleVal > peakAbs) {
                  peakAbs = sampleVal;
                }
                sumSq += sampleVal * sampleVal;
                count++;
              }
              
              if (count > 0) {
                const rms = Math.sqrt(sumSq / count);
                // Avoid division by zero and handle tiny values
                if (rms > 0.0001) {
                  const crestFactor = peakAbs / rms;
                  totalCrestFactor += crestFactor;
                } else {
                  totalCrestFactor += 1.0; // Minimal crest factor for silence/near-silence
                }
              }
            }
          }
        }
        
        if (peakCount > 0) {
          const avgCrestFactor = totalCrestFactor / peakCount;
          
          // Scaling Logic and Calibration Comments:
          // A transient window's crest factor (peak / RMS) reflects how sharp and uncompressed the transient is.
          // - High-quality, punchy transient peaks typically exhibit a crest factor of 6.0 or greater. We map this to 90+.
          // - Moderate punchiness displays a crest factor between 3.0 and 6.0, mapping linearly from 50 up to 90.
          // - Heavily compressed, limited, or mushy music has crest factors below 3.0, mapping to 10 - 50.
          if (avgCrestFactor >= 6.0) {
            // High dynamic range and extremely punchy transients (score 90 to 100)
            transientPunchScore = 90 + Math.min(10, ((avgCrestFactor - 6.0) / 4.0) * 10);
          } else if (avgCrestFactor >= 3.0) {
            // Standard/healthy punchiness (score 50 to 90)
            transientPunchScore = 50 + ((avgCrestFactor - 3.0) / 3.0) * 40;
          } else {
            // Over-compressed or mushy transients (score 10 to 50)
            transientPunchScore = 10 + Math.max(0, ((avgCrestFactor - 1.5) / 1.5) * 40);
          }
          transientPunchScore = Math.round(transientPunchScore);
        }
      }
      return transientPunchScore;
    })(),
    calculatedMelodicStagingScore: (() => {
      // 4. MELODIC STAGING (stereo pan-distribution variance)
      // Measures instrument separation across the stereo field by computing standard variance of pan balance values.
      // Uses windows matching the chroma frame size (4096 samples).
      const stagingFrameSize = 4096;
      const numStagingFrames = Math.floor(len / stagingFrameSize);
      // Cap at ~400 analyzed frames for fast, non-blocking performance
      const stagingFrameStep = Math.max(1, Math.floor(numStagingFrames / 400));
      const panValues: number[] = [];
      
      for (let f = 0; f < numStagingFrames; f += stagingFrameStep) {
        const start = f * stagingFrameSize;
        const end = Math.min(len, start + stagingFrameSize);
        
        let sumSq0 = 0;
        let sumSq1 = 0;
        let count = 0;
        
        for (let i = start; i < end; i++) {
          const val0 = ch0[i];
          const val1 = ch1[i];
          sumSq0 += val0 * val0;
          sumSq1 += val1 * val1;
          count++;
        }
        
        if (count > 0) {
          const rms0 = Math.sqrt(sumSq0 / count);
          const rms1 = Math.sqrt(sumSq1 / count);
          const sumRms = rms0 + rms1;
          if (sumRms > 0.0001) {
            const pan = (rms1 - rms0) / sumRms;
            panValues.push(pan);
          }
        }
      }
      
      let stagingScore = 70; // Fallback default score if no frames were processed
      if (panValues.length > 0) {
        // Calculate statistical variance of pan balance values across the song
        const meanPan = panValues.reduce((sum, v) => sum + v, 0) / panValues.length;
        const sqDiffSum = panValues.reduce((sum, v) => sum + (v - meanPan) * (v - meanPan), 0);
        const variance = sqDiffSum / panValues.length;
        
        // Scaling Logic and Calibration Comments:
        // Pan values range from -1 (fully left) to +1 (fully right).
        // - A mono or center-panned song has a variance near 0, indicating minimal stereo staging (score < 50).
        // - A well-staged, wide stereo track has variance >= 0.04 (score 85+).
        // - A standard stereo mix with panning across the field scales smoothly between.
        if (variance >= 0.04) {
          // Excellent, wide stereo staging (score 85 to 98)
          stagingScore = 85 + Math.min(13, ((variance - 0.04) / 0.11) * 13);
        } else if (variance >= 0.005) {
          // Standard stereo field layout (score 50 to 85)
          stagingScore = 50 + ((variance - 0.005) / 0.035) * 35;
        } else {
          // Extremely narrow or fully mono audio (score 10 to 50)
          stagingScore = 10 + (variance / 0.005) * 40;
        }
        stagingScore = Math.round(stagingScore);
      }
      return stagingScore;
    })(),
    calculatedVocalDynamicsScore: (() => {
      // Calculate Vocal Dynamics Score (Coefficient of Variation of envelope during voiced frames)
      let vocalDynamicsScore: number | null = null;
      const voicedFrames = melodyFrames.filter(f => f.voiced);
      if (voicedFrames.length >= 10) {
        const voicedEnvelopeValues: number[] = [];
        for (const frame of voicedFrames) {
          // Map timeSec back to the nearest envelope index
          // envelope was built with hopSize in fCh0, which is downsampled by 'hop' (4)
          // So time conversion factor is (hopSize * hop) / sampleRate
          const envIdx = Math.min(
            envelope.length - 1,
            Math.max(0, Math.round((frame.timeSec * sampleRate) / (hopSize * hop)))
          );
          voicedEnvelopeValues.push(envelope[envIdx]);
        }

        const count = voicedEnvelopeValues.length;
        let sum = 0;
        for (const val of voicedEnvelopeValues) {
          sum += val;
        }
        const mean = sum / count;

        if (mean > 0) {
          let sumSqDiff = 0;
          for (const val of voicedEnvelopeValues) {
            const diff = val - mean;
            sumSqDiff += diff * diff;
          }
          const variance = sumSqDiff / count;
          const stdDev = Math.sqrt(variance);
          const cv = stdDev / mean;

          // Scaling Formula:
          // - A CV of 0 means absolutely flat / no variation, which gets a minimum score of 10.
          // - A CV of 0.15 (highly compressed/robotic) maps to 50.
          // - A CV of 0.45 (ideal dynamic range for standard expressive vocals) maps to 95.
          // - A CV of 0.75 (very wide expressive/dramatic range) maps to 100.
          // - CV values above 0.75 remain at 100.
          if (cv <= 0.15) {
            vocalDynamicsScore = Math.round(10 + (cv / 0.15) * 40);
          } else if (cv <= 0.45) {
            const t = (cv - 0.15) / (0.45 - 0.15);
            vocalDynamicsScore = Math.round(50 + t * 45);
          } else if (cv <= 0.75) {
            const t = (cv - 0.45) / (0.75 - 0.45);
            vocalDynamicsScore = Math.round(95 + t * 5);
          } else {
            vocalDynamicsScore = 100;
          }
        }
      }
      return vocalDynamicsScore;
    })(),
    calculatedDynamicModulationScore: dynamicModulationScore,
    calculatedDynamicRangeDb: dynamicRangeDb,
    calculatedDynamicHighPercentileDb: dynamicHighPercentileDb,
    calculatedDynamicLowPercentileDb: dynamicLowPercentileDb,
    calculatedClimaxTrajectoryScore: climaxTrajectoryScore,
    calculatedClimaxPositionRatio: climaxPositionRatio,
    calculatedClimaxBuildDb: climaxBuildDb,
    calculatedEnergyEnvelope: energyEnvelope,
    calculatedSectionBoundaries: sectionBoundaries
  };
}


// Stage 2A experimental engineering evidence. Never consumed by scoring.
// Window-power normalized, one-sided FFT power in mean-square PCM units.
// Bin centers are allocated to half-open engineering bands; unassigned
// DC / out-of-range bins are explicit so energy is never silently discarded.
export const STAGE2A_BANDS_HZ = [20, 60, 250, 500, 2000, 6000, 11000, 20000] as const;
export interface Stage2aSpectralPowerResult {
  method: "stage2a-hann-fft-power-v1";
  sampleRate: number;
  fftSize: number;
  hopSize: number;
  frames: number;
  inputSampleCount: number;
  representedSampleCount: number;
  omittedTrailingSampleCount: number;
  zeroPaddedSampleCount: number;
  channelCount: number;
  units: "mean-square-full-scale-pcm";
  window: "periodic-hann";
  normalization: "one-sided-parseval-sum-window-squared";
  bandEdgesHz: number[];
  channelBandPower: number[][];
  channelUnassignedPower: number[];
  channelTotalPower: number[];
  limitations: string[];
}
export function analyzeStage2aSpectralPower(
  channels: Float32Array[], sampleRate: number,
): Stage2aSpectralPowerResult {
  if (!channels.length || channels.length > 2 || !channels[0]?.length ||
      !channels.every(ch => ch.length === channels[0].length) ||
      !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) {
    throw new RangeError("Stage 2A requires nonempty equal-length mono/stereo PCM and valid sample rate");
  }
  const fftSize = 4096, hopSize = 2048;
  const fft = new FFT(fftSize);
  const window = Float64Array.from({ length: fftSize }, (_, n) =>
    0.5 - 0.5 * Math.cos(2 * Math.PI * n / fftSize));
  const windowPower = window.reduce((s, w) => s + w * w, 0);
  const count = channels[0].length;
  const frames = count < fftSize ? 1 : 1 + Math.floor((count - fftSize) / hopSize);
  // Union of samples touched by at least one selected frame, not the
  // sum of overlapping frame lengths. Short buffers are zero-padded.
  const representedSampleCount = Math.min(count, (frames - 1) * hopSize + fftSize);
  const omittedTrailingSampleCount = count - representedSampleCount;
  const zeroPaddedSampleCount = Math.max(0, fftSize - count);
  const channelBandPower: number[][] = [];
  const channelUnassignedPower: number[] = [];
  const channelTotalPower: number[] = [];
  const nyquist = sampleRate / 2;
  for (const ch of channels) {
    // Full PCM validity includes the tail omitted by complete-frame analysis.
    for (let i = representedSampleCount; i < count; i++) {
      if (!Number.isFinite(ch[i])) throw new RangeError("Stage 2A PCM must be finite");
    }
    const bands = new Array(STAGE2A_BANDS_HZ.length - 1).fill(0);
    let unassigned = 0, total = 0;
    const input = fft.createComplexArray();
    const output = fft.createComplexArray();
    for (let frame = 0; frame < frames; frame++) {
      const offset = frame * hopSize;
      for (let j = 0; j < fftSize; j++) {
        const value = offset + j < count ? ch[offset + j] : 0;
        if (!Number.isFinite(value)) throw new RangeError("Stage 2A PCM must be finite");
        input[2 * j] = value * window[j];
        input[2 * j + 1] = 0;
      }
      fft.transform(output, input);
      for (let k = 0; k <= fftSize / 2; k++) {
        const hz = k * sampleRate / fftSize;
        const factor = k === 0 || k === fftSize / 2 ? 1 : 2;
        const real = output[2 * k], imag = output[2 * k + 1];
        const power = factor * (real * real + imag * imag) / (fftSize * windowPower * frames);
        total += power;
        let assigned = false;
        for (let b = 0; b < bands.length; b++) {
          if (hz >= STAGE2A_BANDS_HZ[b] &&
              hz < Math.min(STAGE2A_BANDS_HZ[b + 1], nyquist + Number.EPSILON)) {
            bands[b] += power;
            assigned = true;
            break;
          }
        }
        if (!assigned) unassigned += power;
      }
    }
    channelBandPower.push(bands);
    channelUnassignedPower.push(unassigned);
    channelTotalPower.push(total);
  }
  return {
    method: "stage2a-hann-fft-power-v1", sampleRate, fftSize, hopSize,
    frames, inputSampleCount: count, representedSampleCount,
    omittedTrailingSampleCount, zeroPaddedSampleCount,
    channelCount: channels.length, units: "mean-square-full-scale-pcm",
    window: "periodic-hann", normalization: "one-sided-parseval-sum-window-squared",
    bandEdgesHz: [...STAGE2A_BANDS_HZ], channelBandPower,
    channelUnassignedPower, channelTotalPower,
    limitations: [
      "Non-scoring diagnostic; not a mastering-quality or masking judgment",
      "Bin-center allocation; frequency boundary leakage and finite FFT resolution apply",
      "Power is window-weighted frame mean-square, not whole-programme RMS",
      "Only complete overlapping frames are used except one zero-padded short frame; explicit sample coverage fields count each represented input sample once",
      "Bands above Nyquist are unavailable; DC and out-of-band energy are unassigned",
    ],
  };
}


// Stage 2B1: exploratory low-frequency frame evidence, not instrument
// identification, source separation, onset classification or a scoring signal.
// Uses the Stage 2A frequency / window / Parseval convention independently.
export interface Stage2b1LowFrequencyResult {
  method: "stage2b1-low-frame-power-v1";
  sampleRate: number;
  fftSize: 4096;
  hopSize: 2048;
  bandsHz: [number, number, number];
  units: "mean-square-full-scale-pcm";
  // Numerical validity floor, not a psychoacoustic audibility threshold.
  minimumValidBandPower: number;
  inputSampleCount: number;
  representedSampleCount: number;
  omittedTrailingSampleCount: number;
  zeroPaddedSampleCount: number;
  channelCount: number;
  frames: {
    startSample: number;
    startSeconds: number;
    centerSeconds: number;
    // The final field describes FFT-window weighting, not an instantaneous event.
    channelBandPower: number[][];
    // 10log10(current/previous), unavailable for initial, zero or silent frames.
    channelBandPowerChangeDb: (number | null)[][];
    transientLikeRise: (boolean | null)[][];
  }[];
  limitations: string[];
}
export function analyzeStage2b1LowFrequency(
  channels: Float32Array[], sampleRate: number,
): Stage2b1LowFrequencyResult {
  if (channels.length < 1 || channels.length > 2 || !channels[0]?.length ||
      !channels.every(ch => ch.length === channels[0].length) ||
      !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000)
    throw new RangeError("Stage 2B1 requires equal-length mono/stereo nonempty PCM and valid rate");
  const fftSize = 4096 as const, hopSize = 2048 as const;
  const count = channels[0].length;
  const frameCount = count < fftSize ? 1 : 1 + Math.floor((count - fftSize) / hopSize);
  const representedSampleCount = Math.min(count, (frameCount - 1) * hopSize + fftSize);
  const omittedTrailingSampleCount = count - representedSampleCount;
  const zeroPaddedSampleCount = Math.max(0, fftSize - count);
  // Validate the full buffer, including samples outside the selected frames.
  for (const ch of channels)
    for (let i = 0; i < ch.length; i++)
      if (!Number.isFinite(ch[i])) throw new RangeError("Stage 2B1 requires finite PCM");
  const fft = new FFT(fftSize);
  const win = Float64Array.from({length:fftSize},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/fftSize));
  const w2 = win.reduce((s,v)=>s+v*v,0);
  const inbuf = fft.createComplexArray(), outbuf = fft.createComplexArray();
  // -120 dBFS equivalent mean-square: suppress unstable relative ratios
  // where either frame falls at or below this explicit diagnostic floor.
  const minimumValidBandPower = 1e-12;
  const previous: (number[] | null)[] = channels.map(()=>null);
  const frames: Stage2b1LowFrequencyResult["frames"] = [];
  for (let f=0; f<frameCount; f++) {
    const startSample=f*hopSize;
    const channelBandPower:number[][]=[];
    const channelBandPowerChangeDb:(number|null)[][]=[];
    const transientLikeRise:(boolean|null)[][]=[];
    for (let ch=0;ch<channels.length;ch++){
      for(let i=0;i<fftSize;i++){
        inbuf[2*i]=(channels[ch][startSample+i]??0)*win[i];
        inbuf[2*i+1]=0;
      }
      fft.transform(outbuf,inbuf);
      const powers=[0,0];
      for(let k=0;k<=fftSize/2;k++){
        const hz=k*sampleRate/fftSize;
        const band=hz>=20&&hz<60?0:hz>=60&&hz<250?1:-1;
        if(band<0)continue;
        const re=outbuf[2*k],im=outbuf[2*k+1];
        const sided=k===0||k===fftSize/2?1:2;
        powers[band]+=sided*(re*re+im*im)/(fftSize*w2);
      }
      const prior=previous[ch];
      const changes=powers.map((p,b)=>prior&&p>minimumValidBandPower&&prior[b]>minimumValidBandPower?10*Math.log10(p/prior[b]):null);
      // 6 dB is an *illustrative* relative-rise marker; no onset-source claim.
      channelBandPower.push(powers);
      channelBandPowerChangeDb.push(changes);
      transientLikeRise.push(changes.map(x=>x===null?null:x>=6));
      previous[ch]=powers;
    }
    frames.push({startSample,startSeconds:startSample/sampleRate,
      centerSeconds:(startSample+fftSize/2)/sampleRate,
      channelBandPower,channelBandPowerChangeDb,transientLikeRise});
  }
  return {method:"stage2b1-low-frame-power-v1",sampleRate,fftSize,hopSize,
    bandsHz:[20,60,250],units:"mean-square-full-scale-pcm",minimumValidBandPower,
    inputSampleCount:count,representedSampleCount,omittedTrailingSampleCount,
    zeroPaddedSampleCount,channelCount:channels.length,frames,
    limitations:[
      "Diagnostic only: cannot identify kick drums, bass instruments, masking or mix quality",
      "FFT frame timing and Hann overlap blur short transients; 6 dB relative-rise flag is exploratory",
      "Band power at or below 1e-12 mean-square PCM is numerically unavailable for relative changes; not an audibility threshold",
      "Uses complete frames except one zero-padded short frame; omitted tail is reported",
      "No stereo correlation or source separation; that work is reserved for Stage 2B2",
    ]};
}


// Stage 2B2: independent diagnostic stereo-band evidence, never scoring.
// Mono=(L+R)/2, comparator is (P_L+P_R)/2 (not the stereo sum).
export interface Stage2b2StereoResult {
  method: "stage2b2-band-stereo-v1";
  fftSize: 4096; hopSize: 2048; sampleRate: number;
  inputSampleCount: number; representedSampleCount: number;
  omittedTrailingSampleCount: number; zeroPaddedSampleCount: number;
  bandsHz: [number,number,number];
  minimumValidBandPower: number;
  completeCancellationRelativePowerTolerance: number;
  frames: { startSample:number; centerSeconds:number;
    bands: {leftPower:number;rightPower:number;crossPower:number;monoPower:number;
      asymmetryDb:number|null; correlation:number|null;monoChangeDb:number|null;
      status:"VALID"|"MONO_NOT_APPLICABLE"|"INSUFFICIENT_ENERGY"|"SINGLE_CHANNEL"|"COMPLETE_CANCELLATION";
    }[];
  }[];
  limitations:string[];
}
export function analyzeStage2b2Stereo(channels:Float32Array[],sampleRate:number):Stage2b2StereoResult {
  if(channels.length<1||channels.length>2||!channels[0]?.length||
    !channels.every(ch=>ch.length===channels[0].length)||
    !Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000)
    throw new RangeError("Stage 2B2 requires mono/stereo equal-length PCM and supported rate");
  const fftSize=4096 as const,hopSize=2048 as const, count=channels[0].length;
  const frameCount=count<fftSize?1:1+Math.floor((count-fftSize)/hopSize);
  const representedSampleCount=Math.min(count,(frameCount-1)*hopSize+fftSize);
  const omittedTrailingSampleCount=count-representedSampleCount;
  const zeroPaddedSampleCount=Math.max(0,fftSize-count);
  for(const ch of channels)for(let i=0;i<count;i++)
    if(!Number.isFinite(ch[i]))throw new RangeError("Stage 2B2 PCM must be finite");
  const minimumValidBandPower=1e-12;
  // Tolerance is relative to the mean channel power; not audibility.
  const completeCancellationRelativePowerTolerance=1e-12;
  const fft=new FFT(fftSize);
  const window=Float64Array.from({length:fftSize},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/fftSize));
  const w2=window.reduce((s,x)=>s+x*x,0);
  const input=fft.createComplexArray(),out=fft.createComplexArray();
  const frames:Stage2b2StereoResult["frames"]=[];
  for(let frame=0;frame<frameCount;frame++){
    const startSample=frame*hopSize;
    const spectra:number[][]=[];
    for(const ch of channels){
      for(let i=0;i<fftSize;i++){
        input[2*i]=(ch[startSample+i]??0)*window[i];
        input[2*i+1]=0;
      }
      fft.transform(out,input);
      spectra.push(Array.from(out));
    }
    const accum=Array.from({length:2},()=>({leftPower:0,rightPower:0,crossPower:0}));
    for(let k=0;k<=fftSize/2;k++){
      const hz=k*sampleRate/fftSize;
      const band=hz>=20&&hz<60?0:hz>=60&&hz<250?1:-1;
      if(band<0)continue;
      const a=spectra[0],b=spectra[1]??spectra[0];
      const ar=a[2*k],ai=a[2*k+1],br=b[2*k],bi=b[2*k+1];
      const factor=(k===0||k===fftSize/2?1:2)/(fftSize*w2);
      const target=accum[band];
      target.leftPower+=(ar*ar+ai*ai)*factor;
      if(channels.length===2){
        target.rightPower+=(br*br+bi*bi)*factor;
        target.crossPower+=(ar*br+ai*bi)*factor;
      }
    }
    const bands=accum.map(({leftPower,rightPower,crossPower})=>{
      if(channels.length===1)return {leftPower,rightPower,crossPower,monoPower:0,
        asymmetryDb:null,correlation:null,monoChangeDb:null,status:"MONO_NOT_APPLICABLE" as const};
      const average=(leftPower+rightPower)/2;
      const monoPower=Math.max(0,(leftPower+rightPower+2*crossPower)/4);
      let asymmetryDb:number|null=null,correlation:number|null=null,monoChangeDb:number|null=null;
      let status:Stage2b2StereoResult["frames"][number]["bands"][number]["status"]="VALID";
      if(average<=minimumValidBandPower)status="INSUFFICIENT_ENERGY";
      else if(leftPower<=minimumValidBandPower||rightPower<=minimumValidBandPower){
        status="SINGLE_CHANNEL";
        if(monoPower>0)monoChangeDb=10*Math.log10(monoPower/average);
      }else{
        asymmetryDb=10*Math.log10(leftPower/rightPower);
        correlation=crossPower/Math.sqrt(leftPower*rightPower);
        // Preserve tiny floating-point errors; never silently clip r.
        const ratio=monoPower/average;
        if(ratio<=completeCancellationRelativePowerTolerance)status="COMPLETE_CANCELLATION";
        else monoChangeDb=10*Math.log10(ratio);
      }
      return {leftPower,rightPower,crossPower,monoPower,asymmetryDb,correlation,monoChangeDb,status};
    });
    frames.push({startSample,centerSeconds:(startSample+fftSize/2)/sampleRate,bands});
  }
  return {method:"stage2b2-band-stereo-v1",fftSize,hopSize,sampleRate,
    inputSampleCount:count,representedSampleCount,omittedTrailingSampleCount,
    zeroPaddedSampleCount,bandsHz:[20,60,250],minimumValidBandPower,
    completeCancellationRelativePowerTolerance,frames,limitations:[
      "Diagnostic only; band cross-power is not an instrument, masking or mix-quality verdict",
      "Mono fold-down is (L+R)/2; change is relative to average channel power",
      "Complete cancellation means mono power <= 1e-12 times average channel power",
      "Finite FFT resolution/window leakage and omitted trailing samples apply",
      "Low-energy and mono cases are unavailable for normalized stereo measures",
    ]};
}


// Stage 2C1 — pure, deterministic engineering-evidence assembly. NEVER scoring.
export function assembleStage2c1EngineeringEvidence(
  spectral: Stage2aSpectralPowerResult,
  temporal: Stage2b1LowFrequencyResult,
  stereo: Stage2b2StereoResult,
) {
  const same=(a:number,b:number)=>a===b;
  const count=spectral.inputSampleCount;
  if(spectral.method!=="stage2a-hann-fft-power-v1"||
     temporal.method!=="stage2b1-low-frame-power-v1"||
     stereo.method!=="stage2b2-band-stereo-v1"||
     !same(spectral.sampleRate,temporal.sampleRate)||
     !same(spectral.sampleRate,stereo.sampleRate)||
     !same(count,temporal.inputSampleCount)||!same(count,stereo.inputSampleCount)||
     spectral.channelCount!==temporal.channelCount||
     spectral.channelCount!==(stereo.frames[0]?.bands[0]?.status==="MONO_NOT_APPLICABLE"?1:2)||
     spectral.fftSize!==4096||temporal.fftSize!==4096||stereo.fftSize!==4096||
     spectral.hopSize!==2048||temporal.hopSize!==2048||stereo.hopSize!==2048||
     spectral.representedSampleCount!==temporal.representedSampleCount||
     spectral.representedSampleCount!==stereo.representedSampleCount||
     spectral.omittedTrailingSampleCount!==temporal.omittedTrailingSampleCount||
     spectral.omittedTrailingSampleCount!==stereo.omittedTrailingSampleCount||
     spectral.zeroPaddedSampleCount!==temporal.zeroPaddedSampleCount||
     spectral.zeroPaddedSampleCount!==stereo.zeroPaddedSampleCount||
     spectral.frames!==temporal.frames.length||
     spectral.frames!==stereo.frames.length||
     temporal.bandsHz.join(",")!=="20,60,250"||
     stereo.bandsHz.join(",")!=="20,60,250"||
     spectral.bandEdgesHz.slice(0,3).join(",")!=="20,60,250"||
     temporal.minimumValidBandPower!==1e-12||
     stereo.minimumValidBandPower!==1e-12||
     stereo.completeCancellationRelativePowerTolerance!==1e-12||
     spectral.units!=="mean-square-full-scale-pcm"||
     temporal.units!=="mean-square-full-scale-pcm")
    throw new RangeError("Stage 2C1 incompatible engineering evidence provenance or coverage");
  const frameCount=temporal.frames.length;
  for(let i=0;i<frameCount;i++){
    if(temporal.frames[i].startSample!==i*2048||
       stereo.frames[i].startSample!==i*2048||
       temporal.frames[i].channelBandPower.length!==spectral.channelCount||
       stereo.frames[i].bands.length!==2||
       Math.abs(temporal.frames[i].centerSeconds-stereo.frames[i].centerSeconds)>1e-10)
      throw new RangeError("Stage 2C1 inconsistent frame provenance");
  }
  const bands=([0,1] as const).map(bandIndex=>{
    const evidence=temporal.frames.map((frame,i)=>({
      frameIndex:i,
      startSample:frame.startSample,
      temporalPower:frame.channelBandPower.map(ch=>ch[bandIndex]),
      powerChangesDb:frame.channelBandPowerChangeDb.map(ch=>ch[bandIndex]),
      rises:frame.transientLikeRise.map(ch=>ch[bandIndex]),
      stereoStatus:stereo.frames[i].bands[bandIndex].status,
      correlation:stereo.frames[i].bands[bandIndex].correlation,
      monoChangeDb:stereo.frames[i].bands[bandIndex].monoChangeDb,
      asymmetryDb:stereo.frames[i].bands[bandIndex].asymmetryDb,
    }));
    const validStereo=evidence.filter(x=>x.stereoStatus==="VALID");
    const cancellations=evidence.filter(x=>x.stereoStatus==="COMPLETE_CANCELLATION");
    const riseDenominator=evidence.reduce((n,x)=>n+x.rises.filter(v=>v!==null).length,0);
    const rises=evidence.reduce((n,x)=>n+x.rises.filter(v=>v===true).length,0);
    const statusCounts:Record<string,number>={};
    for(const e of evidence)statusCounts[e.stereoStatus]=(statusCounts[e.stereoStatus]??0)+1;
    return {
      bandHz:bandIndex===0?[20,60]:[60,250],
      spectralChannelPower:spectral.channelBandPower.map(ch=>ch[bandIndex]),
      frameCount,
      stereoValidFrames:validStereo.length,
      stereoValidDenominator:frameCount,
      cancellationFrames:cancellations.length,
      cancellationDenominator:frameCount,
      cancellationFrameIndices:cancellations.map(x=>x.frameIndex),
      riseCount:rises,
      riseValidComparisons:riseDenominator,
      stereoStatusCounts:statusCounts,
      frameEvidence:evidence,
      description:"Observed calibrated band-energy, relative power changes and stereo relationships; no quality judgment.",
      applicability:"Measurements describe a completed mix; arrangement and instrument identity are unknown.",
    };
  });
  return {
    schemaVersion:"stage2c1-engineering-evidence-v1" as const,
    scoringImpact:"NONE" as const,
    sourceProvenance:{
      methods:[spectral.method,temporal.method,stereo.method],
      sampleRate:spectral.sampleRate,
      channelCount:spectral.channelCount,
      fftSize:4096,
      hopSize:2048,
      window:"periodic-hann" as const,
      spectralNormalization:spectral.normalization,
      numericBandPowerFloor:1e-12,
      cancellationRelativePowerTolerance:1e-12,
      inputSampleCount:count,
      representedSampleCount:spectral.representedSampleCount,
      omittedTrailingSampleCount:spectral.omittedTrailingSampleCount,
      zeroPaddedSampleCount:spectral.zeroPaddedSampleCount,
    },
    bands,
    limitations:[
      "Not a score, mix-quality judgment, genre classification or instrument/source identification",
      "Windowed overlapping frames are correlated; event counts are not independent observations",
      "A cancellation proportion is a frame count over all measured frames, not a duration-weighted estimate",
      "Thresholds are numerical/illustrative, not auditory or genre-specific quality standards",
      "Stage 2A aggregate band power and Stage 2B1/B2 per-frame evidence use compatible windows but different aggregation semantics",
    ],
  };
}
