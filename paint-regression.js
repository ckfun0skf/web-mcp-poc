import {createPaintTools} from './paint-tools.js';
const result=document.getElementById('result'),host=document.getElementById('frames'),button=document.getElementById('run');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function assert(value,message){if(!value)throw new Error(message);}
async function until(fn,label,timeout=30000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=fn();if(value)return value;}catch(e){last=e;}await pause(100);}throw new Error('Timed out: '+label+(last?' / '+last.message:''));}
function pixels(frame){const canvas=frame.contentDocument.querySelector('canvas.main-canvas');return canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.slice();}
const same=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
window.paintRegressionResult={done:false,passed:false,tests:[]};
button.onclick=async()=>{
button.disabled=true;host.replaceChildren();const tests=[],frames=[],sessions=[];const errors=[];
const report=()=>{result.textContent=JSON.stringify({done:false,tests,errors},null,2);};
async function test(name,fn){try{await fn();tests.push({name,passed:true});}catch(e){tests.push({name,passed:false,error:String(e.message||e)});throw e;}finally{report();}}
async function open(session){const frame=document.createElement('iframe');frame.title='Temporary Paint regression session';frame.src='./vendor/jspaint/index.html#local:'+session;host.append(frame);frames.push(frame);await until(()=>frame.contentDocument?.readyState==='complete'&&frame.contentDocument.querySelector('canvas.main-canvas')?.width>0&&localStorage.getItem('image#'+session)!==null,'engine and local session backup');await pause(400);return frame;}
async function bridge(frame){if(frame.contentWindow.workspacePaintBridge)return frame.contentWindow.workspacePaintBridge;await new Promise((resolve,reject)=>{const script=frame.contentDocument.createElement('script');script.type='module';script.src=new URL('./paint-engine-bridge.js',location.href).href;script.onload=resolve;script.onerror=()=>reject(new Error('Bridge module failed to load'));frame.contentDocument.body.append(script);});return until(()=>frame.contentWindow.workspacePaintBridge,'bridge initialization',5000);}
let failed=false;
try{
const sessionA='web-mcp-test-'+crypto.randomUUID(),sessionB='web-mcp-test-'+crypto.randomUUID();sessions.push(sessionA,sessionB);let a,b,api;
await test('Engine instances and native local sessions initialize',async()=>{a=await open(sessionA);b=await open(sessionB);api=await bridge(a);assert(api.state().width>100&&api.state().height>100,'Canvas too small');});
let baseline,drawn,untouched;
await test('Line gesture changes actual canvas pixels',async()=>{baseline=pixels(a);untouched=pixels(b);await api.setStyle({foreground:'#e32636',size:1});await api.gesture({tool:'line',points:[[0,0],[100,100]]});drawn=pixels(a);assert(!same(baseline,drawn),'Line gesture did not alter pixels');});
await test('Native undo restores the previous image',async()=>{await api.undo();assert(same(pixels(a),baseline),'Undo did not restore the previous image');});
await test('Native redo restores the drawn image',async()=>{await api.redo();assert(same(pixels(a),drawn),'Redo did not restore the line');});
await test('Pencil coordinate path changes pixels',async()=>{const before=pixels(a);await api.setStyle({foreground:'#0066ff',size:2});await api.gesture({tool:'pencil',points:[[150,30],[155,50],[170,65],[190,45]]});assert(!same(pixels(a),before),'Pencil path did not alter pixels');drawn=pixels(a);});
await test('Other workspace image is unchanged',async()=>{assert(same(pixels(b),untouched),'Workspace B was modified by workspace A');});
await test('Out-of-bounds gesture is rejected without drawing',async()=>{const before=pixels(a);let rejected=false;try{await api.gesture({tool:'line',points:[[-1,0],[20,20]]});}catch{rejected=true;}assert(rejected,'Invalid coordinates were accepted');assert(same(before,pixels(a)),'Invalid coordinates modified pixels');});
await test('Tool dispatcher rejects unsupported tools and invalid point count',async()=>{const tools=createPaintTools({list:()=>[],run:()=>{throw new Error('UNEXPECTED_BASE_CALL');}},{getPaint:async()=>api});for(const args of [{workspace_id:'a',tool:'curve',points:[[1,1],[2,2]]},{workspace_id:'a',tool:'line',points:[[1,1]]}]){let rejected=false;try{await tools.run('paint_gesture',args);}catch{rejected=true;}assert(rejected,'Invalid tool request accepted');}});
await test('Local session image is saved and restored after reload',async()=>{const expected=drawn;await until(()=>{const raw=localStorage.getItem('image#'+sessionA);return raw&&JSON.parse(raw)===a.contentDocument.querySelector('canvas.main-canvas').toDataURL('image/png');},'latest image autosave');a.remove();a=await open(sessionA);await until(()=>same(pixels(a),expected),'restored image pixels');assert(same(pixels(b),untouched),'Reload affected workspace B');});
}catch(e){failed=true;errors.push(String(e.stack||e));}
finally{for(const frame of frames)frame.remove();await pause(200);for(const session of sessions)localStorage.removeItem('image#'+session);window.paintRegressionResult={done:true,passed:!failed&&tests.length===9,tests,errors};result.textContent=JSON.stringify(window.paintRegressionResult,null,2);button.disabled=false;}
};
