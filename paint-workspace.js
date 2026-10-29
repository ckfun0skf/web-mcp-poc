const sessionFor=id=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('INVALID_WORKSPACE_ID');return 'web-mcp-workspace-'+id;};
export function removePaintBackup(id){localStorage.removeItem('image#'+sessionFor(id));}
export function createPaintFrame(host,id,{onStatus=()=>{}}={}){
  const session=sessionFor(id),frame=document.createElement('iframe');
  frame.title='JS Paint workspace';frame.style.cssText='display:block;width:100%;height:72vh;border:0;background:white';
  let disposed=false,timer,deadline;const controller=new AbortController();
  function status(message){if(!disposed)onStatus(message);}
  function check(){if(disposed)return;try{const doc=frame.contentDocument,canvas=doc?.querySelector('canvas.main-canvas');const key='image#'+session;
    if(canvas?.width>0&&canvas?.height>0&&frame.contentWindow.location.hash==='#local:'+session&&localStorage.getItem(key)!==null){clearInterval(timer);status('Paint editor loaded with workspace-specific local backup. Use File > Save for an external copy.');return;}
    if(Date.now()>deadline){clearInterval(timer);status('Editor loaded, but workspace backup readiness could not be confirmed. Save an external copy before leaving. Check Console for errors.');}
  }catch(e){clearInterval(timer);status('Paint readiness check failed: '+e.message);}}
  async function start(){try{const response=await fetch('./vendor/jspaint/UPSTREAM.txt',{signal:controller.signal});if(!response.ok)throw new Error('Vendored JS Paint engine unavailable');const info=await response.text();if(!info.includes('53be67ab8c47cc0d2168899e7481bc04839c4c81'))throw new Error('Unexpected JS Paint revision');if(disposed)return;frame.src='./vendor/jspaint/index.html#local:'+session;deadline=Date.now()+30000;timer=setInterval(check,300);status('Loading Paint workspace…');}catch(e){status(e.message);}}
  host.append(frame);start();
  return Object.freeze({show(visible){frame.hidden=!visible;},dispose(){disposed=true;controller.abort();clearInterval(timer);frame.remove();}});
}
