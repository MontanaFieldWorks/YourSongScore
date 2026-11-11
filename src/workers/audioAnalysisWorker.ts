import { analyzePcmData, runStage2c2aBrowserDiagnostics } from "../lib/liveAudioAnalyzer";

self.onmessage = async (event: MessageEvent<{
  sampleRate: number;
  numChannels: number;
  ch0: ArrayBuffer;
  ch1?: ArrayBuffer;
  kind?: "ENGINEERING_DIAGNOSTICS";
  includeReferenceMeters?: true;
  captureIdentity?: true;
}>) => {
  try {
    const { sampleRate, numChannels, ch0, ch1 } = event.data;
    if (event.data.kind === "ENGINEERING_DIAGNOSTICS") {
      const channels = [new Float32Array(ch0), ...(ch1 ? [new Float32Array(ch1)] : [])];
      // Independent SHA-256 over the exact transferred PCM channel views.
      // No raw PCM, large copied arrays or hash values enter the public report.
      let pcmIdentity:undefined|{channelSha256:string[];sampleRate:number;channels:number;samples:number};
      if(event.data.captureIdentity===true){
        if(!self.crypto?.subtle||channels.length!==numChannels||
          channels.some(c=>c.length!==channels[0]?.length))
          throw Error("PCM identity unavailable");
        const hashes:string[]=[];
        for(const channel of channels){
          const hash=await self.crypto.subtle.digest("SHA-256",channel);
          hashes.push(Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join(""));
        }
        pcmIdentity={channelSha256:hashes,sampleRate,channels:numChannels,samples:channels[0].length};
      }
      const result = runStage2c2aBrowserDiagnostics({ sampleRate, numberOfChannels: numChannels, getChannelData: (i: number) => channels[i] }, true, event.data.includeReferenceMeters === true);
      (self as any).postMessage({ kind: "ENGINEERING_DIAGNOSTICS", ...result,
        ...(event.data.captureIdentity===true?{pcmIdentity}:{}) });
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
