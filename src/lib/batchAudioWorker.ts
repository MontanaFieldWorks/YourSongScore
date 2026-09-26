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
