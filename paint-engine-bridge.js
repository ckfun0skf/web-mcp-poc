// Loaded as a module inside the JS Paint iframe, not in the parent realm.
/* global main_canvas, pointer_active, selection, textbox, selected_tool, selected_colors, stroke_size, pencil_size, brush_size, eraser_size */
import {get_tool_by_id,select_tool,undo,redo} from './vendor/jspaint/src/functions.js';
import {createJSPaintAdapter} from './jspaint-adapter.js';
const allowed=['pencil','line','brush','eraser','fill','rectangle','ellipse'];
let busy=false,disposed=false;
function idle(){if(disposed)throw new Error('PAINT_DISPOSED');if(pointer_active||selection||textbox||document.querySelector('.menu-button.active, .dialog-window'))throw new Error('PAINT_BUSY: Finish the current user operation or close the dialog.');if(selected_tool?.points?.length)throw new Error('PAINT_BUSY: Finish the current multi-stage tool.');}
const adapter=createJSPaintAdapter({canvas:main_canvas,$:window.$,assertIdle:idle,selectTool(name){if(!allowed.includes(name))throw new Error('UNSUPPORTED_PAINT_TOOL');const tool=get_tool_by_id('TOOL_'+name.toUpperCase());if(!tool)throw new Error('PAINT_TOOL_NOT_FOUND');select_tool(tool);},undo,redo});
const block=e=>{if(busy&&e.isTrusted){e.preventDefault();e.stopImmediatePropagation();}};
for(const type of ['pointerdown','pointermove','pointerup','click','keydown','wheel'])window.addEventListener(type,block,{capture:true,passive:false});
async function locked(fn){if(busy)throw new Error('PAINT_BUSY');idle();busy=true;try{return await fn();}finally{busy=false;}}
function state(){return {...adapter.getState(),selectedTool:selected_tool?.id||null,foreground:selected_colors.foreground,background:selected_colors.background,tools:allowed,busy};}
window.workspacePaintBridge=Object.freeze({
  state,
  gesture(args,signal){return locked(()=>adapter.gesture(args,{signal}));},
  setStyle(args){return locked(()=>{for(const key of ['foreground','background'])if(key in args&&(typeof args[key]!=='string'||args[key].length>100||!CSS.supports('color',args[key])))throw new Error('INVALID_COLOR');if('size'in args&&(!Number.isInteger(args.size)||args.size<1||args.size>64))throw new Error('INVALID_SIZE');for(const key of ['foreground','background'])if(key in args)selected_colors[key]=args[key];if('size'in args)stroke_size=pencil_size=brush_size=eraser_size=args.size;window.$(window).trigger('option-changed');return state();});},
  undo(){return locked(async()=>{await adapter.undo();return state();});},
  redo(){return locked(async()=>{await adapter.redo();return state();});}
});
window.addEventListener('pagehide',()=>{disposed=true;adapter.dispose();});
