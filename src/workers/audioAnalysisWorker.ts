import { analyzePcmData } from "../lib/liveAudioAnalyzer";

self.onmessage = (event: MessageEvent<{
  sampleRate: number;
  numChannels: number;
  ch0: ArrayBuffer;
  ch1?: ArrayBuffer;
}>) => {
  try {
    const { sampleRate, numChannels, ch0, ch1 } = event.data;
    const metrics = analyzePcmData(
      sampleRate,
      numChannels,
      new Float32Array(ch0),
      ch1 ? new Float32Array(ch1) : undefined
    );
    (self as DedicatedWorkerGlobalScope).postMessage({ ok: true, metrics });
  } catch (error: any) {
    (self as DedicatedWorkerGlobalScope).postMessage({
      ok: false,
      error: error?.message || "Batch DSP worker failed.",
    });
  }
};
