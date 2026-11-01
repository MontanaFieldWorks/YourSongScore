import { LiveAudioMetrics } from "../types";

/**
 * Runs the existing synchronous PCM analyzer inside a dedicated worker for the temporary
 * batch tool. The arrays are copies, then transferred to the worker, so the original
 * AudioBuffer remains intact for Essentia key detection afterward.
 */
export function analyzeAudioBufferInWorker(
  audioBuffer: AudioBuffer,
  signal?: AbortSignal
): Promise<LiveAudioMetrics> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/audioAnalysisWorker.ts", import.meta.url),
      { type: "module" }
    );

    let settled = false;
    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };

    const finishReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onAbort = () => {
      const err = new DOMException("Batch analysis stopped.", "AbortError");
      finishReject(err);
    };

    worker.onmessage = (event: MessageEvent<{ ok: boolean; metrics?: LiveAudioMetrics; error?: string }>) => {
      if (settled) return;
      if (!event.data?.ok || !event.data.metrics) {
        finishReject(new Error(event.data?.error || "Batch DSP worker failed."));
        return;
      }
      settled = true;
      const metrics = event.data.metrics;
      cleanup();
      resolve(metrics);
    };

    worker.onerror = (event) => {
      finishReject(new Error(event.message || "Batch DSP worker crashed."));
    };

    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });

    const ch0 = new Float32Array(audioBuffer.getChannelData(0));
    const ch1 = audioBuffer.numberOfChannels > 1
      ? new Float32Array(audioBuffer.getChannelData(1))
      : undefined;

    const transfer: Transferable[] = [ch0.buffer];
    if (ch1) transfer.push(ch1.buffer);

    worker.postMessage({
      sampleRate: audioBuffer.sampleRate,
      numChannels: audioBuffer.numberOfChannels,
      ch0: ch0.buffer,
      ch1: ch1?.buffer,
    }, transfer);
  });
}


// Stage 2C2B: optional, separate worker request; never used by the legacy batch path.
// Copies are transferred, so the original decoded AudioBuffer is never detached.
export function analyzeEngineeringDiagnosticsInWorker(
  audioBuffer: AudioBuffer,
  signal?: AbortSignal,
  maxInputBytes = 128 * 1024 * 1024,
  timeoutMs = 30000,
): Promise<
  | {status:"AVAILABLE"; evidence: ReturnType<typeof import("./liveAudioAnalyzer").assembleStage2c1EngineeringEvidence>}
  | {status:"UNAVAILABLE"|"CANCELLED"; reason:string}
> {
  if(signal?.aborted)return Promise.resolve({status:"CANCELLED",reason:"ABORTED"});
  const channels=audioBuffer.numberOfChannels;
  const bytes=audioBuffer.length*channels*Float32Array.BYTES_PER_ELEMENT;
  if(channels!==1&&channels!==2)return Promise.resolve({status:"UNAVAILABLE",reason:"UNSUPPORTED_CHANNEL_COUNT"});
  if(!Number.isSafeInteger(audioBuffer.length)||audioBuffer.length<1||
     !Number.isFinite(bytes)||bytes>maxInputBytes)
    return Promise.resolve({status:"UNAVAILABLE",reason:"INPUT_BUDGET_EXCEEDED"});
  return new Promise(resolve=>{
    let worker:Worker|undefined;
    let timeout:ReturnType<typeof setTimeout>|undefined;
    let settled=false;
    const finish=(result:Awaited<ReturnType<typeof analyzeEngineeringDiagnosticsInWorker>>)=>{
      if(settled)return;
      settled=true;
      if(timeout!==undefined)clearTimeout(timeout);
      signal?.removeEventListener("abort",onAbort);
      worker?.terminate();
      resolve(result);
    };
    const onAbort=()=>finish({status:"CANCELLED",reason:"ABORTED"});
    signal?.addEventListener("abort",onAbort,{once:true});
    if(signal?.aborted){onAbort();return;}
    try{
      worker=new Worker(new URL("../workers/audioAnalysisWorker.ts",import.meta.url),{type:"module"});
      worker.onmessage=(event:MessageEvent)=>{
        const data=event.data;
        if(data?.kind!=="ENGINEERING_DIAGNOSTICS"||
           (data.status!=="AVAILABLE"&&data.status!=="UNAVAILABLE")){
          finish({status:"UNAVAILABLE",reason:"INVALID_WORKER_RESPONSE"});return;
        }
        if(data.status==="AVAILABLE"&&data.evidence?.scoringImpact==="NONE"){
          finish({status:"AVAILABLE",evidence:data.evidence});return;
        }
        finish({status:"UNAVAILABLE",reason:data.reason||"DIAGNOSTIC_COMPUTATION_FAILED"});
      };
      worker.onerror=()=>finish({status:"UNAVAILABLE",reason:"WORKER_ERROR"});
      worker.onmessageerror=()=>finish({status:"UNAVAILABLE",reason:"WORKER_MESSAGE_ERROR"});
      timeout=setTimeout(()=>finish({status:"UNAVAILABLE",reason:"TIMEOUT"}),timeoutMs);
      const ch0=new Float32Array(audioBuffer.getChannelData(0));
      const ch1=channels===2?new Float32Array(audioBuffer.getChannelData(1)):undefined;
      worker.postMessage({kind:"ENGINEERING_DIAGNOSTICS",sampleRate:audioBuffer.sampleRate,
        numChannels:channels,ch0:ch0.buffer,ch1:ch1?.buffer},
        ch1?[ch0.buffer,ch1.buffer]:[ch0.buffer]);
    }catch{
      finish({status:"UNAVAILABLE",reason:"WORKER_SETUP_FAILED"});
    }
  });
}
