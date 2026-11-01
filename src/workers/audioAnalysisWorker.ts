import { analyzePcmData, runStage2c2aBrowserDiagnostics } from "../lib/liveAudioAnalyzer";

self.onmessage = (event: MessageEvent<{
  sampleRate: number;
  numChannels: number;
  ch0: ArrayBuffer;
  ch1?: ArrayBuffer;
  kind?: "ENGINEERING_DIAGNOSTICS";
}>) => {
  try {
    const { sampleRate, numChannels, ch0, ch1 } = event.data;
    if (event.data.kind === "ENGINEERING_DIAGNOSTICS") {
      const channels = [new Float32Array(ch0), ...(ch1 ? [new Float32Array(ch1)] : [])];
      const result = runStage2c2aBrowserDiagnostics({ sampleRate, numberOfChannels: numChannels, getChannelData: (i: number) => channels[i] }, true);
      (self as any).postMessage({ kind: "ENGINEERING_DIAGNOSTICS", ...result });
      return;
    }
    const metrics = analyzePcmData(
      sampleRate,
      numChannels,
      new Float32Array(ch0),
      ch1 ? new Float32Array(ch1) : undefined
    );
    (self as any).postMessage({ ok: true, metrics });
  } catch (error: any) {
    (self as any).postMessage({
      ok: false,
      error: error?.message || "Batch DSP worker failed.",
    });
  }
};
