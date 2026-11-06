import { analyzePcmData, runStage2c2aBrowserDiagnostics } from "../lib/liveAudioAnalyzer";

self.onmessage = (event: MessageEvent<{
  sampleRate: number;
  numChannels: number;
  ch0: ArrayBuffer;
  ch1?: ArrayBuffer;
  kind?: "ENGINEERING_DIAGNOSTICS";
  includeReferenceMeters?: true;
}>) => {
  try {
    const { sampleRate, numChannels, ch0, ch1 } = event.data;
    if (event.data.kind === "ENGINEERING_DIAGNOSTICS") {
      const channels = [new Float32Array(ch0), ...(ch1 ? [new Float32Array(ch1)] : [])];
      const result = runStage2c2aBrowserDiagnostics({ sampleRate, numberOfChannels: numChannels, getChannelData: (i: number) => channels[i] }, true, event.data.includeReferenceMeters === true);
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
    if (event.data?.kind === "ENGINEERING_DIAGNOSTICS") {
      // Diagnostic protocol failures must remain diagnostic: do not return
      // the legacy {ok:false,error} envelope or expose exception text.
      (self as any).postMessage({
        kind: "ENGINEERING_DIAGNOSTICS",
        status: "UNAVAILABLE",
        reason: "DIAGNOSTIC_COMPUTATION_FAILED",
      });
      return;
    }
    // The legacy batch worker protocol is intentionally unchanged.
    (self as any).postMessage({
      ok: false,
      error: error?.message || "Batch DSP worker failed.",
    });
  }
};
