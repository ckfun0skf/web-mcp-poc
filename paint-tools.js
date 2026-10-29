const clone=x=>structuredClone(x);
const allowed=['pencil','line','brush','eraser','fill','rectangle','ellipse'];
export function createPaintTools(base,{getPaint}){
  const id={type:'string',description:'ID of the currently visible Paint workspace. Open it in the UI before calling.'};
  const schema=extra=>({type:'object',properties:{workspace_id:id,...extra},required:['workspace_id'],additionalProperties:false});
  const specs=[
    {name:'paint_get_state',description:'Read dimensions and tool settings of the visible Paint workspace. Coordinates use image pixels, not viewport pixels.',inputSchema:schema({}),readOnly:true},
    {name:'paint_set_style',description:'Set foreground/background CSS colors and shared pencil/brush/eraser/outline size (1-64). Changes persist as tool settings, not as undoable image edits.',inputSchema:schema({foreground:{type:'string',maxLength:100},background:{type:'string',maxLength:100},size:{type:'integer',minimum:1,maximum:64}})},
    {name:'paint_gesture',description:'Draw one complete pointer gesture with a JS Paint tool. Image coordinates have top-left origin. Line/rectangle/ellipse require two points; fill requires one; pencil/brush/eraser accept a path. May leave partial changes on failure; never automatically retry.',inputSchema:{...schema({tool:{type:'string',enum:allowed},points:{type:'array',minItems:1,maxItems:10000,items:{type:'array',items:{type:'number'},minItems:2,maxItems:2}},button:{type:'integer',enum:[0,2]},shiftKey:{type:'boolean'}}),required:['workspace_id','tool','points']}},
    {name:'paint_undo',description:'Undo using the visible Paint workspace native JS Paint history.',inputSchema:schema({})},
    {name:'paint_redo',description:'Redo using the visible Paint workspace native JS Paint history.',inputSchema:schema({})}
  ];
  const definitions=specs.map(({readOnly,...d})=>({...d,protected:true,annotations:{readOnlyHint:!!readOnly}}));
  return Object.freeze({list:()=>[...base.list(),...clone(definitions)],async run(name,args,options={}){
    const spec=specs.find(t=>t.name===name);if(!spec)return base.run(name,args);
    if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('INVALID_ARGUMENTS');
    for(const key of Object.keys(args))if(!Object.hasOwn(spec.inputSchema.properties,key))throw new Error('UNKNOWN_ARGUMENT: '+key);
    for(const key of spec.inputSchema.required)if(!Object.hasOwn(args,key))throw new Error('MISSING_ARGUMENT: '+key);
    if(typeof args.workspace_id!=='string')throw new Error('INVALID_WORKSPACE_ID');
    if(name==='paint_gesture'){
      if(!allowed.includes(args.tool))throw new Error('UNSUPPORTED_PAINT_TOOL');
      if(!Array.isArray(args.points)||args.points.length<1||args.points.length>10000||args.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw new Error('INVALID_POINTS');
      if(['line','rectangle','ellipse'].includes(args.tool)&&args.points.length!==2)throw new Error('EXPECTED_TWO_POINTS');
      if(args.tool==='fill'&&args.points.length!==1)throw new Error('EXPECTED_ONE_POINT');
      if('button'in args&&![0,2].includes(args.button))throw new Error('INVALID_BUTTON');if('shiftKey'in args&&typeof args.shiftKey!=='boolean')throw new Error('INVALID_SHIFT');
    }
    options.signal?.throwIfAborted();const bridge=await getPaint(args.workspace_id);options.signal?.throwIfAborted();
    if(name==='paint_get_state')return clone(bridge.state());
    if(name==='paint_set_style'){const {workspace_id,...style}=args;return clone(await bridge.setStyle(style));}
    if(name==='paint_undo')return clone(await bridge.undo());if(name==='paint_redo')return clone(await bridge.redo());
    const {workspace_id,...gesture}=args;return clone(await bridge.gesture(gesture,options.signal));
  }});
}
