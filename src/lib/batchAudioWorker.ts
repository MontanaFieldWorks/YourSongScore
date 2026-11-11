import type { LiveAudioMetrics } from "../types";
import type { AuralisEncodedSourceIdentity } from "./liveAudioAnalyzer";

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


// Stage 2F-2: validate an untrusted worker result before accepting it as
// diagnostic evidence. Check source identity, bounded FFT coverage, counts and
// frame structure; do not compute DSP or grade acoustic quality here.
function validEngineeringWorkerEvidence(
  candidate: unknown,
  input: Pick<AudioBuffer,"length"|"numberOfChannels"|"sampleRate">,
): candidate is ReturnType<typeof import("./liveAudioAnalyzer").assembleStage2c1EngineeringEvidence> {
  if(!candidate||typeof candidate!=="object")return false;
  const data=candidate as ReturnType<typeof import("./liveAudioAnalyzer").assembleStage2c1EngineeringEvidence>;
  const p=data.sourceProvenance;
  const finite=(x:unknown):x is number=>typeof x==="number"&&Number.isFinite(x);
  const positive=(x:unknown)=>finite(x)&&x>=0;
  const integer=(x:unknown)=>Number.isSafeInteger(x)&&typeof x==="number";
  const methods=["stage2a-hann-fft-power-v1","stage2b1-low-frame-power-v1","stage2b2-band-stereo-v1"];
  if(data.schemaVersion!=="stage2c1-engineering-evidence-v1"||
     data.scoringImpact!=="NONE"||!p||
     !Array.isArray(p.methods)||p.methods.length!==3||
     p.methods.some((method,i)=>method!==methods[i])||
     p.sampleRate!==input.sampleRate||!finite(p.sampleRate)||
     p.sampleRate<8000||p.sampleRate>192000||
     p.channelCount!==input.numberOfChannels||
     p.inputSampleCount!==input.length||
     !integer(p.inputSampleCount)||p.inputSampleCount<1||
     p.fftSize!==4096||p.hopSize!==2048||
     p.window!=="periodic-hann"||
     p.spectralNormalization!=="one-sided-parseval-sum-window-squared"||
     p.numericBandPowerFloor!==1e-12||
     p.cancellationRelativePowerTolerance!==1e-12||
     !Array.isArray(data.bands)||data.bands.length!==2||
     !Array.isArray(data.limitations)||!data.limitations.every(x=>typeof x==="string"))
    return false;
  const frameCount=p.inputSampleCount<4096?1:1+Math.floor((p.inputSampleCount-4096)/2048);
  const covered=Math.min(p.inputSampleCount,(frameCount-1)*2048+4096);
  if(p.representedSampleCount!==covered||
     p.omittedTrailingSampleCount!==p.inputSampleCount-covered||
     p.zeroPaddedSampleCount!==Math.max(0,4096-p.inputSampleCount))return false;
  const statuses=["VALID","MONO_NOT_APPLICABLE","INSUFFICIENT_ENERGY",
    "SINGLE_CHANNEL","COMPLETE_CANCELLATION"];
  for(let b=0;b<2;b++){
    const band=data.bands[b],expectedBand=b===0?[20,60]:[60,250];
    if(!band||!Array.isArray(band.bandHz)||
       band.bandHz.length!==2||band.bandHz.some((v,i)=>v!==expectedBand[i])||
       band.frameCount!==frameCount||
       band.stereoValidDenominator!==frameCount||
       band.cancellationDenominator!==frameCount||
       !Array.isArray(band.spectralChannelPower)||
       band.spectralChannelPower.length!==p.channelCount||
       !band.spectralChannelPower.every(positive)||
       !Array.isArray(band.frameEvidence)||band.frameEvidence.length!==frameCount||
       !Array.isArray(band.cancellationFrameIndices)||
       !band.stereoStatusCounts||typeof band.stereoStatusCounts!=="object")
      return false;
    const counts:Record<string,number>={};
    let valid=0,cancel=0,rises=0,comparisons=0;
    const cancelledIndices:number[]=[];
    for(let i=0;i<frameCount;i++){
      const f=band.frameEvidence[i];
      if(!f||f.frameIndex!==i||f.startSample!==i*2048||
         !Array.isArray(f.temporalPower)||f.temporalPower.length!==p.channelCount||
         !f.temporalPower.every(positive)||
         !Array.isArray(f.powerChangesDb)||f.powerChangesDb.length!==p.channelCount||
         !Array.isArray(f.rises)||f.rises.length!==p.channelCount||
         !statuses.includes(f.stereoStatus)||
         !(f.correlation===null||finite(f.correlation))||
         !(f.monoChangeDb===null||finite(f.monoChangeDb))||
         !(f.asymmetryDb===null||finite(f.asymmetryDb)))return false;
      for(let ch=0;ch<p.channelCount;ch++){
        const change=f.powerChangesDb[ch],rise=f.rises[ch];
        if(!(change===null||finite(change))||
           !(rise===null||typeof rise==="boolean")||
           (change===null)!==(rise===null)||
           (change!==null&&rise!==(change>=6)))return false;
        if(rise!==null)comparisons++;
        if(rise===true)rises++;
      }
      if(p.channelCount===1 && (f.stereoStatus!=="MONO_NOT_APPLICABLE"||
        f.correlation!==null||f.monoChangeDb!==null||f.asymmetryDb!==null))return false;
      if(p.channelCount===2 && f.stereoStatus==="MONO_NOT_APPLICABLE")return false;
      if(f.stereoStatus==="VALID")valid++;
      if(f.stereoStatus==="COMPLETE_CANCELLATION"){cancel++;cancelledIndices.push(i);}
      counts[f.stereoStatus]=(counts[f.stereoStatus]??0)+1;
    }
    if(band.stereoValidFrames!==valid||band.cancellationFrames!==cancel||
       band.riseCount!==rises||band.riseValidComparisons!==comparisons||
       band.cancellationFrameIndices.length!==cancelledIndices.length||
       band.cancellationFrameIndices.some((v,i)=>v!==cancelledIndices[i]))
      return false;
    const keys=Object.keys(band.stereoStatusCounts);
    if(keys.length!==Object.keys(counts).length||
       keys.some(key=>!statuses.includes(key)||band.stereoStatusCounts[key]!==counts[key]))
      return false;
  }
  return true;
}

// Optional aggregate Stage 2A profile, validated separately from the stable
// Stage 2C1 low-band contract. Old diagnostic responses may omit this field.
function validEngineeringSpectralProfile(
  candidate:unknown,
  evidence:ReturnType<typeof import("./liveAudioAnalyzer").assembleStage2c1EngineeringEvidence>,
  input:Pick<AudioBuffer,"length"|"numberOfChannels"|"sampleRate">,
): candidate is import("./liveAudioAnalyzer").Stage2j1SpectralProfile {
  if(!candidate||typeof candidate!=="object")return false;
  const p=candidate as import("./liveAudioAnalyzer").Stage2j1SpectralProfile;
  const edges=[20,60,250,500,2000,6000,11000,20000];
  const validPower=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)&&value>=0;
  const source=evidence.sourceProvenance;
  if(p.schemaVersion!=="stage2j1-spectral-profile-v1"||p.scoringImpact!=="NONE"||
     p.method!=="stage2a-hann-fft-power-v1"||p.units!=="mean-square-full-scale-pcm"||
     p.sampleRate!==input.sampleRate||p.channelCount!==input.numberOfChannels||
     p.inputSampleCount!==input.length||p.fftSize!==source.fftSize||
     p.hopSize!==source.hopSize||p.representedSampleCount!==source.representedSampleCount||
     p.omittedTrailingSampleCount!==source.omittedTrailingSampleCount||
     p.zeroPaddedSampleCount!==source.zeroPaddedSampleCount||
     p.frames!==(input.length<4096?1:1+Math.floor((input.length-4096)/2048))||
     !Array.isArray(p.bandEdgesHz)||p.bandEdgesHz.length!==edges.length||
     p.bandEdgesHz.some((edge,i)=>edge!==edges[i])||
     !Array.isArray(p.channelBandPower)||p.channelBandPower.length!==input.numberOfChannels||
     !Array.isArray(p.channelUnassignedPower)||p.channelUnassignedPower.length!==input.numberOfChannels||
     !Array.isArray(p.channelTotalPower)||p.channelTotalPower.length!==input.numberOfChannels)
    return false;
  for(let ch=0;ch<input.numberOfChannels;ch++){
    const bands=p.channelBandPower[ch],unassigned=p.channelUnassignedPower[ch],total=p.channelTotalPower[ch];
    if(!Array.isArray(bands)||bands.length!==edges.length-1||
       !bands.every(validPower)||!validPower(unassigned)||!validPower(total)||
       Math.abs(bands.reduce((sum,power)=>sum+power,unassigned)-total)>1e-8*Math.max(1,total)||
       bands[0]!==evidence.bands[0].spectralChannelPower[ch]||
       bands[1]!==evidence.bands[1].spectralChannelPower[ch])return false;
    for(let i=0;i<bands.length;i++)
      if(edges[i]>=input.sampleRate/2&&bands[i]!==0)return false;
  }
  return true;
}

// Stage 2K meter evidence is requested only by the local song pilot. Keep
// older diagnostic responses compatible, but fail closed when it is requested.
function validEngineeringReferenceMeters(
  candidate:unknown,
  input:Pick<AudioBuffer,"length"|"numberOfChannels"|"sampleRate">,
): candidate is import("./liveAudioAnalyzer").Stage2kMeterSummary {
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))return false;
  const p=candidate as import("./liveAudioAnalyzer").Stage2kMeterSummary;
  const fields=["samplePeakDbfs","truePeakDbtp4x","rmsDbfs","midRmsDbfs",
    "crestFactorDb","midCrestFactorDb","integratedLufs","loudnessRangeLu"] as const;
  const status=["AVAILABLE","SILENCE","TOO_SHORT","INSUFFICIENT_GATED_WINDOWS"];
  if(Object.keys(p).sort().join(",")!==
     ["schemaVersion","scoringImpact","method","sampleRate","channelCount",
       "sampleCount","lraAvailability","truePeakAccuracyStatus","measurements"].sort().join(",")||
     p.schemaVersion!=="stage2k-meter-summary-v1"||p.scoringImpact!=="NONE"||
     p.method!=="stage1a-reference-v1"||p.sampleRate!==input.sampleRate||
     p.channelCount!==input.numberOfChannels||p.sampleCount!==input.length||
     !status.includes(p.lraAvailability)||
     p.truePeakAccuracyStatus!==(input.sampleRate===48000?
       "ANNEX2_48KHZ_REFERENCE_NOT_CERTIFIED":"NON_48KHZ_UNVERIFIED")||
     !p.measurements||typeof p.measurements!=="object"||
     Array.isArray(p.measurements)||
     Object.keys(p.measurements).sort().join(",")!==[...fields].sort().join(","))
    return false;
  const m=p.measurements;
  if(fields.some(key=>m[key]!==null&&
       (typeof m[key]!=="number"||!Number.isFinite(m[key])))||
     (p.lraAvailability==="AVAILABLE")!==(m.loudnessRangeLu!==null)||
     (p.lraAvailability==="SILENCE")!==(m.samplePeakDbfs===null)||
     (p.lraAvailability==="TOO_SHORT"&&input.length>=Math.round(3*input.sampleRate))||
     (p.lraAvailability==="AVAILABLE"&&input.length<Math.round(3*input.sampleRate))||
     (m.crestFactorDb===null)!==(m.samplePeakDbfs===null||m.rmsDbfs===null)||
     (m.midCrestFactorDb===null)!==(m.samplePeakDbfs===null||m.midRmsDbfs===null))
    return false;
  if(m.samplePeakDbfs!==null&&
     (m.truePeakDbtp4x===null||m.truePeakDbtp4x<m.samplePeakDbfs-1e-8||
      (m.rmsDbfs!==null&&m.rmsDbfs>m.samplePeakDbfs+1e-8)||
      (m.midRmsDbfs!==null&&m.midRmsDbfs>m.samplePeakDbfs+1e-8)))return false;
  if(m.loudnessRangeLu!==null&&m.loudnessRangeLu<0)return false;
  if(m.crestFactorDb!==null&&m.samplePeakDbfs!==null&&m.rmsDbfs!==null&&
     Math.abs(m.crestFactorDb-(m.samplePeakDbfs-m.rmsDbfs))>1e-8)return false;
  if(m.midCrestFactorDb!==null&&m.samplePeakDbfs!==null&&m.midRmsDbfs!==null&&
     Math.abs(m.midCrestFactorDb-(m.samplePeakDbfs-m.midRmsDbfs))>1e-8)return false;
  return true;
}

// Stage 2C2B: optional, separate worker request; never used by the legacy batch path.
// Copies are transferred, so the original decoded AudioBuffer is never detached.
export function analyzeEngineeringDiagnosticsInWorker(
  audioBuffer: AudioBuffer,
  signal?: AbortSignal,
  maxInputBytes = 128 * 1024 * 1024,
  timeoutMs = 30000,
  includeReferenceMeters = false,
  encodedIdentity?: Promise<AuralisEncodedSourceIdentity>,
): Promise<
  | {status:"AVAILABLE"; identity?: {
      status:"VERIFIED";encodedSha256:string;decodedChannelSha256:string[];
      workerChannelSha256:string[];encodedBytes:number;
      sourceFormat:AuralisEncodedSourceIdentity["format"];
      sourceSampleRate:number|null;sourceRateStatus:AuralisEncodedSourceIdentity["sourceRateStatus"];
      decodedSampleRate:number;workerSampleRate:number;
      decodedChannels:number;workerChannels:number;decodedSamples:number;workerSamples:number;
      rateRelationship:"SAME_RATE"|"DECODED_RATE_DIFFERENT"|"SOURCE_RATE_UNVERIFIED";
    }; evidence: ReturnType<typeof import("./liveAudioAnalyzer").assembleStage2c1EngineeringEvidence>; spectralProfile?:import("./liveAudioAnalyzer").Stage2j1SpectralProfile; referenceMeters?:import("./liveAudioAnalyzer").Stage2kMeterSummary}
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
    let verifiedDecodedHashes:string[]|null=null;
    let verifiedSource:AuralisEncodedSourceIdentity|null=null;
    const hex=(hash:ArrayBuffer)=>Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("");
    // Hash decoded PCM in-place, per channel. No additional Float32Array copy.
    const hashDecoded=async()=>{
      if(typeof crypto==="undefined"||!crypto.subtle)throw Error("Web Crypto unavailable");
      const digests:string[]=[];
      for(let i=0;i<channels;i++)digests.push(hex(await crypto.subtle.digest("SHA-256",audioBuffer.getChannelData(i))));
      return digests;
    };
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
        if(data.status==="AVAILABLE"){
          if(data.evidence?.scoringImpact!=="NONE"){
            finish({status:"UNAVAILABLE",reason:"DIAGNOSTIC_COMPUTATION_FAILED"});return;
          }
          if(!validEngineeringWorkerEvidence(data.evidence,audioBuffer)){
            finish({status:"UNAVAILABLE",reason:"INVALID_WORKER_EVIDENCE"});return;
          }
          if(data.spectralProfile!==undefined &&
             !validEngineeringSpectralProfile(data.spectralProfile,data.evidence,audioBuffer)){
            finish({status:"UNAVAILABLE",reason:"INVALID_WORKER_EVIDENCE"});return;
          }
          if(includeReferenceMeters?
             !validEngineeringReferenceMeters(data.referenceMeters,audioBuffer):
             data.referenceMeters!==undefined){
            finish({status:"UNAVAILABLE",reason:"INVALID_WORKER_EVIDENCE"});return;
          }
          if(encodedIdentity){
            const received=data.pcmIdentity;
            if(!verifiedDecodedHashes||!verifiedSource||verifiedSource.status!=="VERIFIED"||
              !Array.isArray(received?.channelSha256)||
              received.channelSha256.length!==channels||
              received.channelSha256.some((h:unknown,i:number)=>typeof h!=="string"||
                !/^[a-f0-9]{64}$/.test(h)||h!==verifiedDecodedHashes![i])||
              received.sampleRate!==audioBuffer.sampleRate||
              received.channels!==channels||received.samples!==audioBuffer.length){
              finish({status:"UNAVAILABLE",reason:"PCM_IDENTITY_MISMATCH"});return;
            }
            const sourceRate=verifiedSource.sourceSampleRate;
            const rateRelationship=sourceRate===null?"SOURCE_RATE_UNVERIFIED":
              sourceRate===audioBuffer.sampleRate?"SAME_RATE":"DECODED_RATE_DIFFERENT";
            finish({status:"AVAILABLE",evidence:data.evidence,
              ...(data.spectralProfile===undefined?{}:{spectralProfile:data.spectralProfile}),
              ...(data.referenceMeters===undefined?{}:{referenceMeters:data.referenceMeters}),
              identity:{status:"VERIFIED",encodedSha256:verifiedSource.encodedSha256!,
                encodedBytes:verifiedSource.encodedBytes,sourceFormat:verifiedSource.format,
                sourceSampleRate:sourceRate,sourceRateStatus:verifiedSource.sourceRateStatus,
                decodedChannelSha256:verifiedDecodedHashes,workerChannelSha256:received.channelSha256,
                decodedSampleRate:audioBuffer.sampleRate,workerSampleRate:received.sampleRate,
                decodedChannels:channels,workerChannels:received.channels,
                decodedSamples:audioBuffer.length,workerSamples:received.samples,
                rateRelationship}});return;
          }
          // Legacy request: a Worker must not claim opted-in hashes unrequested.
          if(data.pcmIdentity!==undefined){
            finish({status:"UNAVAILABLE",reason:"INVALID_WORKER_RESPONSE"});return;
          }
          finish({status:"AVAILABLE",evidence:data.evidence,
            ...(data.spectralProfile===undefined?{}:{spectralProfile:data.spectralProfile}),
            ...(data.referenceMeters===undefined?{}:{referenceMeters:data.referenceMeters})});return;
        }
        finish({status:"UNAVAILABLE",reason:
          typeof data.reason==="string"&&data.reason.length?data.reason:"DIAGNOSTIC_COMPUTATION_FAILED"});
      };
      worker.onerror=()=>finish({status:"UNAVAILABLE",reason:"WORKER_ERROR"});
      worker.onmessageerror=()=>finish({status:"UNAVAILABLE",reason:"WORKER_MESSAGE_ERROR"});
      timeout=setTimeout(()=>finish({status:"UNAVAILABLE",reason:"TIMEOUT"}),timeoutMs);
      const send=async()=>{
        if(encodedIdentity){
          try{
            // Timeout and abort are already armed, including during hashing.
            const [source,decoded]=await Promise.all([encodedIdentity,hashDecoded()]);
            if(settled||signal?.aborted)return;
            if(source.status!=="VERIFIED"||!source.encodedSha256){
              finish({status:"UNAVAILABLE",reason:"ENCODED_IDENTITY_UNAVAILABLE"});return;
            }
            verifiedSource=source;
            verifiedDecodedHashes=decoded;
          }catch{
            finish({status:"UNAVAILABLE",reason:"PCM_IDENTITY_UNAVAILABLE"});return;
          }
        }
        if(settled||signal?.aborted)return;
        const ch0=new Float32Array(audioBuffer.getChannelData(0));
        const ch1=channels===2?new Float32Array(audioBuffer.getChannelData(1)):undefined;
        worker!.postMessage({kind:"ENGINEERING_DIAGNOSTICS",sampleRate:audioBuffer.sampleRate,
          numChannels:channels,ch0:ch0.buffer,ch1:ch1?.buffer,
          ...(includeReferenceMeters?{includeReferenceMeters:true as const}:{}),
          ...(encodedIdentity?{captureIdentity:true as const}:{})},
          ch1?[ch0.buffer,ch1.buffer]:[ch0.buffer]);
      };
      void send().catch(()=>finish({status:"UNAVAILABLE",reason:"WORKER_SETUP_FAILED"}));
    }catch{
      finish({status:"UNAVAILABLE",reason:"WORKER_SETUP_FAILED"});
    }
  });
}
