// One JS Paint iframe per workspace. The vendor's own origin storage is namespace-scoped
// within its iframe before vendor scripts run. This is a preview, not durable document export.
const VENDOR='./vendor/jspaint/index.html';
const prefix=id=>'web-mcp-poc.paint.'+id+'.';
const injected=String.raw`<script>(function(){
const params=new URLSearchParams(location.search),id=params.get('workspace');
if(!/^[0-9a-f-]{36}$/i.test(id||''))throw new Error('INVALID_WORKSPACE_ID');
const p='web-mcp-poc.paint.'+id+'.';
for(const kind of ['localStorage','sessionStorage']){
  const original=window[kind];
  const proxy={getItem:key=>original.getItem(p+String(key)),setItem:(key,value)=>original.setItem(p+String(key),String(value)),removeItem:key=>original.removeItem(p+String(key)),clear:()=>{for(let i=original.length-1;i>=0;i--){const key=original.key(i);if(key&&key.startsWith(p))original.removeItem(key)}},key:index=>{let n=0;for(let i=0;i<original.length;i++){const key=original.key(i);if(key&&key.startsWith(p)){if(n++===index)return key.slice(p.length)}}return null},get length(){let n=0;for(let i=0;i<original.length;i++)if(original.key(i)?.startsWith(p))n++;return n}};
  Object.defineProperty(window,kind,{configurable:true,value:proxy});
}
window.addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='WORKSPACE_PAINT_DISPOSE')return;for(const kind of ['localStorage','sessionStorage'])window[kind].clear();parent.postMessage({type:'WORKSPACE_PAINT_DISPOSED',workspace:id},location.origin)});
})();</script>`;
export function createPaintFrame(host,id,{onStatus=()=>{}}={}){
  if(!host||!host.ownerDocument||!/^[0-9a-f-]{36}$/i.test(id))throw new Error('INVALID_PAINT_HOST');
  const frame=host.ownerDocument.createElement('iframe');frame.title='JS Paint workspace';frame.style.cssText='display:block;width:100%;height:70vh;border:1px solid #3c4964;background:#fff';
  // srcdoc needs a stable base for relative assets, and the injected namespace script precedes vendor scripts.
  let disposed=false;const controller=new AbortController();
  async function start(){try{const response=await fetch(VENDOR,{signal:controller.signal});if(!response.ok)throw new Error('JS Paint engine unavailable: '+response.status);const html=await response.text();if(disposed)return;const base=new URL('./vendor/jspaint/',location.href).href;const patch='<base href="'+base+'">'+injected.replace('location.search','new URL(document.referrer).search');
    // srcdoc cannot receive a unique query string; pass workspace ID using an isolated blob URL instead.
    // Refuse to run an unverified injection rather than presenting a shared-state engine.
    throw new Error('PAINT_FRAME_BOOTSTRAP_NOT_READY: workspace-specific preload injection requires a verified entry point.');
  }catch(e){if(!disposed)onStatus(e.message)}}
  // Disabled until upstream persistence/session hooks are wired; never silently share JS Paint state.
  start();host.replaceChildren(frame);
  return Object.freeze({dispose(){disposed=true;controller.abort();frame.remove()}});
}
