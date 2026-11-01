import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "vite";

// Synthetic-only browser-worker smoke test. No API calls, user files or scoring.
const chromeBin=[process.env.CHROME_BIN,"/usr/bin/google-chrome","/usr/bin/chromium","/usr/bin/chromium-browser"]
  .filter(Boolean).find(x=>spawnSync("test",["-x",x]).status===0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitJson(url){
  for(let i=0;i<80;i++){try{const r=await fetch(url);if(r.ok)return r.json()}catch{}await sleep(125)}
  throw Error("Chromium debugging endpoint unavailable");
}
async function browserTest(){
  const NativeWorker=Worker;
  globalThis.Worker=class extends NativeWorker { constructor(...args){globalThis.__auralisWorkerURL=String(args[0]);super(...args);this.addEventListener("error",e=>{globalThis.__auralisWorkerError={message:e.message,filename:e.filename,lineno:e.lineno}})}postMessage(...args){globalThis.__auralisHandoffAt=performance.now();return super.postMessage(...args)}};
  const {analyzeEngineeringDiagnosticsInWorker:analyze}=await import("/src/lib/batchAudioWorker.ts");
  const records=[];
  for(const sr of [44100,48000])for(const seconds of [60,300]){
    const n=sr*seconds;
    const pcm=new AudioBuffer({sampleRate:sr,numberOfChannels:2,length:n});
    const a=pcm.getChannelData(0),b=pcm.getChannelData(1);
    for(let i=0;i<n;i++){a[i]=0.03*Math.sin(2*Math.PI*93*i/sr);b[i]=-a[i]*0.8}
    const bytes=a.byteLength,original=a[17];
    const before=performance.now(),promise=analyze(pcm),handoffMs=globalThis.__auralisHandoffAt-before;
    const out=await promise,elapsedMs=performance.now()-before;
    if(out.status!=="AVAILABLE"||out.evidence?.scoringImpact!=="NONE")throw Error("worker failed "+sr+" "+seconds+" "+out.reason+" "+JSON.stringify(globalThis.__auralisWorkerError)+" URL="+globalThis.__auralisWorkerURL+" RESPONSE="+await fetch(globalThis.__auralisWorkerURL).then(async r=>r.status+":"+(await r.text()).slice(0,250)).catch(e=>e.message));
    if(a.byteLength!==bytes||a[17]!==original)throw Error("original audio buffer detached or modified");
    records.push({sr,seconds,elapsedMs:Math.round(elapsedMs),mainThreadSetupToPostMessageMs:Math.round(handoffMs),pcmBytes:bytes*2});
  }
  // Stage 2C2B-1C: active cancellation after transfer, repeated-run heap snapshots
  // and event-loop responsiveness. All inputs are synthetic, never uploaded.
  const lifecycle=[];
  for(const sr of [44100,48000]){
    const seconds=300,n=sr*seconds;
    const pcm=new AudioBuffer({sampleRate:sr,numberOfChannels:2,length:n});
    const a=pcm.getChannelData(0),b=pcm.getChannelData(1);
    for(let i=0;i<n;i++){a[i]=0.025*Math.sin(2*Math.PI*85*i/sr);b[i]=a[i]*0.9}
    const ctl=new AbortController();
    let ticks=0,maxDrift=0,previous=performance.now();
    const heartbeat=setInterval(()=>{const now=performance.now();maxDrift=Math.max(maxDrift,now-previous-20);previous=now;ticks++},20);
    const before=performance.now(),promise=analyze(pcm,ctl.signal);
    const setupMs=performance.now()-before;
    // Aborting after a posted message tests the active-worker termination path.
    await new Promise(resolve=>setTimeout(resolve,60));
    ctl.abort();
    const result=await promise;
    clearInterval(heartbeat);
    if(result.status!=="CANCELLED")throw Error("active cancellation failed: "+result.status);
    if(a.byteLength!==n*4)throw Error("active abort detached original PCM");
    lifecycle.push({sr,activeAbort:result.status,setupMs:Math.round(setupMs),heartbeatTicks:ticks,maxHeartbeatDriftMs:Math.round(maxDrift)});
  }
  const samples=[];
  for(let repeat=0;repeat<3;repeat++){
    const sr=44100,seconds=60,n=sr*seconds;
    const pcm=new AudioBuffer({sampleRate:sr,numberOfChannels:2,length:n});
    const a=pcm.getChannelData(0),b=pcm.getChannelData(1);
    for(let i=0;i<n;i++){a[i]=0.02*Math.sin(2*Math.PI*97*i/sr);b[i]=a[i]*0.75}
    const heapBefore=performance.memory?.usedJSHeapSize??null;
    let ticks=0,maxDrift=0,previous=performance.now();
    const hb=setInterval(()=>{const now=performance.now();maxDrift=Math.max(maxDrift,now-previous-20);previous=now;ticks++},20);
    const start=performance.now(),result=await analyze(pcm);
    clearInterval(hb);
    if(result.status!=="AVAILABLE")throw Error("repeat diagnostic unavailable "+result.reason);
    samples.push({repeat,elapsedMs:Math.round(performance.now()-start),heapBefore,heapAfter:performance.memory?.usedJSHeapSize??null,ticks,maxHeartbeatDriftMs:Math.round(maxDrift)});
  }
  await new Promise(resolve=>setTimeout(resolve,200));
  let reads=0;
  const oversize=await analyze({numberOfChannels:2,sampleRate:48000,length:48000*600,getChannelData(){reads++;throw Error("must not read")}});
  if(oversize.reason!=="INPUT_BUDGET_EXCEEDED"||reads!==0)throw Error("oversize budget failed");
  const c=new AbortController();c.abort();
  const abort=await analyze({numberOfChannels:1,sampleRate:44100,length:4096,getChannelData(){throw Error("aborted")} },c.signal);
  if(abort.status!=="CANCELLED")throw Error("abort failed");
  const invalidRate=await analyze({numberOfChannels:1,length:4096,sampleRate:7000,getChannelData:()=>new Float32Array(4096)});
  if(invalidRate.status!=="UNAVAILABLE")throw Error("worker diagnostic failure isolation failed");
  const timeout=await analyze(new AudioBuffer({numberOfChannels:1,length:4096,sampleRate:44100}),undefined,128*1024*1024,1);
  if(!["AVAILABLE","UNAVAILABLE"].includes(timeout.status))throw Error("invalid timeout result");
  return {userAgent:navigator.userAgent,records,oversize:oversize.reason,abort:abort.status,invalidRate:invalidRate.status,timeout:timeout.status,
    heapBytes:performance.memory?.usedJSHeapSize??null,lifecycle,repeatedSamples:samples,memoryNote:"renderer JS heap snapshots only; not browser/worker process peak RSS"};
}
test("Auralis real Chromium worker: synthetic 60/300 sec, PCM ownership, budget and abort",{
  timeout:180000,skip:!chromeBin?"No installed Chrome/Chromium":false},async()=>{
  const vite=await createServer({configFile:false,root:process.cwd(),logLevel:"error",
    optimizeDeps:{noDiscovery:true,include:["fft.js"]},
    plugins:[{name:"auralis-synthetic-page",configureServer(server){server.middlewares.use("/__auralis_test__",(_req,res)=>{res.setHeader("Content-Type","text/html");res.end("<!doctype html><title>Auralis synthetic worker test</title>")})}}],
    server:{host:"127.0.0.1",port:0}});
  let chrome,ws;
  try{
    await vite.listen();
    const appPort=vite.httpServer.address().port,debugPort=19487;
    chrome=spawn(chromeBin,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
      "--remote-allow-origins=*","--remote-debugging-port="+debugPort,
      "--user-data-dir=/tmp/auralis-chrome-"+process.pid,"about:blank"],{stdio:"ignore"});
    const version=await waitJson("http://127.0.0.1:"+debugPort+"/json/version");
    assert.match(version.Browser,/Chrome|Chromium/);
    const page=await(await fetch("http://127.0.0.1:"+debugPort+"/json/new?http%3A%2F%2F127.0.0.1%3A"+appPort+"%2F__auralis_test__",{method:"PUT"})).json();
    ws=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true})});
    let seq=0;const pending=new Map();
    ws.addEventListener("message",evt=>{const v=JSON.parse(evt.data),cb=pending.get(v.id);if(cb){pending.delete(v.id);cb(v)}});
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++seq;pending.set(id,v=>v.error?reject(Error(JSON.stringify(v.error))):resolve(v.result));
      ws.send(JSON.stringify({id,method,params}));
    });
    await cdp("Runtime.enable");await sleep(500);
    const data=await cdp("Runtime.evaluate",{expression:"("+browserTest.toString()+")()",awaitPromise:true,returnByValue:true});
    if(data.exceptionDetails)throw Error("Browser test threw: "+JSON.stringify(data.exceptionDetails).slice(0,1000));
    const result=data.result.value;
    assert.equal(result.records.length,4);
    for(const r of result.records){assert.ok(r.elapsedMs<30000);assert.ok(r.pcmBytes<128*1024*1024)}
    assert.equal(result.lifecycle.length,2);
    assert.equal(result.repeatedSamples.length,3);
    for(const item of result.lifecycle)assert.equal(item.activeAbort,"CANCELLED");
    console.log("AURALIS_REAL_BROWSER "+JSON.stringify(result));
  }finally{ws?.close();chrome?.kill("SIGKILL");await vite.close()}
});
