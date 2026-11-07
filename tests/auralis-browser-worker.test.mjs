import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "vite";
import { readFile } from "node:fs/promises";

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
// Stage 2N-2: this hook is appended only to the in-memory test response.
// The repository harness, comparator, renderer and change listener are unmodified.
function installSelectorFixture() {
  const edges=[20,60,250,500,2000,6000,11000,20000];
  const summary={schemaVersion:"stage2i2-local-song-summary-v1",scoringImpact:"NONE",
    sourceProvenance:{methods:["stage2a-hann-fft-power-v1","stage2b1-low-frame-power-v1","stage2b2-band-stereo-v1"],
      sampleRate:48000,channelCount:2,fftSize:4096,hopSize:2048,window:"periodic-hann",
      spectralNormalization:"one-sided-parseval-sum-window-squared",numericBandPowerFloor:1e-12,
      cancellationRelativePowerTolerance:1e-12,inputSampleCount:8192,representedSampleCount:8192,
      omittedTrailingSampleCount:0,zeroPaddedSampleCount:0},
    spectralProfile:{schemaVersion:"stage2j1-spectral-profile-v1",method:"stage2a-hann-fft-power-v1",
      units:"mean-square-full-scale-pcm",sampleRate:48000,channelCount:2,fftSize:4096,hopSize:2048,
      frames:3,representedSampleCount:8192,omittedTrailingSampleCount:0,zeroPaddedSampleCount:0,
      bands:edges.slice(0,-1).map((low,i)=>({bandHz:[low,edges[i+1]],status:"AVAILABLE",channelPower:[.01,.02]}))},
    referenceMeters:{schemaVersion:"stage2k-meter-summary-v1",method:"stage1a-reference-v1",
      sampleRate:48000,channelCount:2,sampleCount:8192,lraAvailability:"TOO_SHORT",
      truePeakAccuracyStatus:"ANNEX2_48KHZ_REFERENCE_NOT_CERTIFIED",
      measurements:{samplePeakDbfs:-3,truePeakDbtp4x:-2,rmsDbfs:-12,midRmsDbfs:-13,
        crestFactorDb:9,midCrestFactorDb:10,integratedLufs:null,loudnessRangeLu:null}}};
  let trustedChanges=0;
  pilotReference.addEventListener("change",event=>{if(event.isTrusted)trustedChanges++;});
  globalThis.__selectorAdd=()=>{
    if(pilotReports.length>=4)throw Error("Synthetic fixture is bounded to four summaries");
    const i=pilotReports.length,s=structuredClone(summary);
    s.referenceMeters.measurements.rmsDbfs-=i;
    s.spectralProfile.bands.forEach((band,k)=>{if(k>=4)band.channelPower=band.channelPower.map(v=>v*4**(-i));});
    pilotReports.push({name:i===0?"Synthetic <b>reference</b>":"Synthetic "+(i+1),summary:s});
    renderPilotComparisons();
  };
  globalThis.__selectorState=()=>({value:pilotReference.value,disabled:pilotReference.disabled,
    options:Array.from(pilotReference.options,o=>({value:o.value,text:o.textContent})),
    output:pilotComparison.textContent,history:JSON.stringify(pilotReports),count:pilotReports.length,
    trustedChanges,work:globalThis.__selectorWork,rawOutput:out.textContent,
    markupCount:pilotReference.querySelectorAll("b").length+pilotComparison.querySelectorAll("b").length});
  globalThis.__selectorReady=true;
}

async function checkPilotSelector(cdp,appPort) {
  const evaluate=async expression=>{
    const result=await cdp("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
    if(result.exceptionDetails)throw Error("Selector browser check: "+JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await cdp("Page.navigate",{url:`http://127.0.0.1:${appPort}/__auralis_selector__`});
  let ready=false;
  for(let i=0;i<80;i++){if(await evaluate("globalThis.__selectorReady===true")){ready=true;break;}await sleep(125);}
  assert.ok(ready,"Actual harness module must initialize in the browser");
  const state=()=>evaluate("globalThis.__selectorState()");
  const add=()=>evaluate("globalThis.__selectorAdd()");
  // Native Chromium keyboard input, never select.value assignment or dispatched change events.
  const key=async(key,code)=>{
    await cdp("Input.dispatchKeyEvent",{type:"keyDown",key,code,windowsVirtualKeyCode:{Home:36,ArrowDown:40,Enter:13,Tab:9}[key]});
    await cdp("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:{Home:36,ArrowDown:40,Enter:13,Tab:9}[key]});
  };
  const choose=async steps=>{
    await evaluate('document.querySelector("#pilotReference").focus()');
    await key("Home","Home");for(let i=0;i<steps;i++)await key("ArrowDown","ArrowDown");
    await key("Tab","Tab");return state();
  };
  let s=await state();assert.equal(s.disabled,true);assert.equal(s.value,"");
  await add();s=await state();assert.equal(s.disabled,true);assert.equal(s.value,"");
  await add();s=await state();assert.equal(s.disabled,false);assert.equal(s.value,"");
  assert.match(s.output,/Choose a reference/);assert.equal(s.options.length,3);
  const initialHistory=s.history;
  s=await choose(1);let paired=JSON.parse(s.output);
  assert.equal(s.value,"0");assert.equal(paired.reference.run,1);assert.equal(paired.comparisons[0].candidate.run,2);
  assert.equal(paired.comparisons[0].status,"AVAILABLE");
  assert.equal(paired.comparisons[0].meters.rmsDbfs.delta,-1);
  const spectral=paired.comparisons[0].spectralBands[4].relativeTo60_250Hz.value;
  assert.ok(Math.abs(spectral+6.020599913279624)<1e-10);
  assert.equal(s.history,initialHistory);assert.ok(s.trustedChanges>0,"Native input must generate trusted changes");
  s=await choose(2);paired=JSON.parse(s.output);
  assert.equal(s.value,"1");assert.equal(paired.reference.run,2);assert.equal(paired.comparisons[0].candidate.run,1);
  assert.equal(paired.comparisons[0].meters.rmsDbfs.delta,1);
  assert.ok(Math.abs(paired.comparisons[0].spectralBands[4].relativeTo60_250Hz.value+spectral)<1e-10);
  assert.equal(s.history,initialHistory);
  await add();s=await state();assert.equal(s.value,"1");assert.equal(JSON.parse(s.output).comparisons.length,2);
  await add();s=await state();assert.equal(s.value,"1");assert.equal(s.disabled,false);
  assert.equal(s.options.length,5);assert.equal(JSON.parse(s.output).comparisons.length,3);
  const fullHistory=s.history;
  s=await choose(4);paired=JSON.parse(s.output);
  assert.equal(paired.reference.run,4);assert.deepEqual(paired.comparisons.map(c=>c.candidate.run),[1,2,3]);
  assert.equal(s.history,fullHistory);assert.equal(s.markupCount,0);
  s=await choose(0);assert.equal(s.value,"");assert.match(s.output,/Choose a reference/);
  assert.equal(s.history,fullHistory);assert.equal(s.count,4);assert.equal(s.rawOutput,"Not run.");
  assert.deepEqual(s.work,{worker:0,audio:0,decode:0});
  console.log("AURALIS_SELECTOR_BROWSER "+JSON.stringify({status:"PASS",completedSummaries:s.count,
    trustedChanges:s.trustedChanges,work:s.work,source:"actual harness with test-only synthetic summaries"}));
}

test("Auralis real Chromium worker: synthetic 60/300 sec, PCM ownership, budget and abort",{
  timeout:180000,skip:!chromeBin?"No installed Chrome/Chromium":false},async()=>{
  const harness=await readFile(new URL("./auralis-stage2g1-browser-harness.html",import.meta.url),"utf8");
  assert.equal(harness.split('</script>').length,2,"Append only to the one actual harness module");
  const guards='<script>globalThis.__selectorWork={worker:0,audio:0,decode:0};'+
    'globalThis.Worker=class {constructor(){__selectorWork.worker++;throw Error("Unexpected Worker");}};'+
    'for(const name of ["AudioContext","webkitAudioContext","OfflineAudioContext","AudioBuffer"]){'+
    'const Native=globalThis[name];if(Native?.prototype?.decodeAudioData)Native.prototype.decodeAudioData=function(){__selectorWork.decode++;throw Error("Unexpected decode");};'+
    'globalThis[name]=class {constructor(){__selectorWork.audio++;throw Error("Unexpected audio");}};}</script>';
  const selectorPage=harness.replace('<script type="module">',guards+'<script type="module">')
    .replace('</script>\n</body>',`(${installSelectorFixture.toString()})();</script>\n</body>`);
  assert.ok(selectorPage.includes('globalThis.__selectorReady=true'),"Fixture hook must be installed");
  const vite=await createServer({configFile:false,root:process.cwd(),logLevel:"error",
    optimizeDeps:{noDiscovery:true,include:["fft.js"]},
    plugins:[{name:"auralis-synthetic-page",configureServer(server){server.middlewares.use("/__auralis_selector__",(_req,res)=>{res.setHeader("Content-Type","text/html");res.end(selectorPage)});server.middlewares.use("/__auralis_test__",(_req,res)=>{res.setHeader("Content-Type","text/html");res.end("<!doctype html><title>Auralis synthetic worker test</title>")})}}],
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
    await checkPilotSelector(cdp,appPort);
  }finally{ws?.close();chrome?.kill("SIGKILL");await vite.close()}
});
