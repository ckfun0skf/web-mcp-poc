const clone=value=>structuredClone(value),types=['text','paint','canvas'];
function valid(w){return w&&typeof w.id==='string'&&w.id&&typeof w.name==='string'&&w.name&&types.includes(w.type)&&Number.isInteger(w.revision)&&w.revision>=0&&(w.type!=='text'||(typeof w.text==='string'&&w.text.length<=100000))&&(w.type!=='canvas'||w.snapshot===undefined||(w.snapshot&&typeof w.snapshot==='object'));}
export function createWorkspaceStore({initial=[],persist=()=>{}}={}){
let items=clone(initial);if(!Array.isArray(items)||items.some(w=>!valid(w))||new Set(items.map(w=>w.id)).size!==items.length)throw new Error('INVALID_SAVED_WORKSPACES');const listeners=new Set();
function get(id){const w=items.find(x=>x.id===id);if(!w)throw new Error('WORKSPACE_NOT_FOUND');return w;}
function commit(next){persist(clone(next));items=next;for(const fn of listeners)fn();}
function replace(next){commit(items.map(w=>w.id===next.id?next:w));return clone(next);}
return Object.freeze({list:()=>items.map(({id,name,type})=>({id,name,type})),read:id=>clone(get(id)),subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
add({type,name}={}){if(!types.includes(type))throw new Error('TYPE_NOT_AVAILABLE');if(name!==undefined&&(typeof name!=='string'||name.trim().length>100))throw new Error('INVALID_NAME');const w={id:crypto.randomUUID(),name:name?.trim()||`Untitled ${type[0].toUpperCase()+type.slice(1)} ${items.filter(x=>x.type===type).length+1}`,type,revision:0,...(type==='text'?{text:''}:{})};commit([...items,w]);return clone(w);},
rename(id,name){const w=get(id);if(typeof name!=='string'||!name.trim()||name.length>100)throw new Error('INVALID_NAME');return replace({...w,name:name.trim()});},remove(id){get(id);commit(items.filter(w=>w.id!==id));},
write(id,text,expectedRevision){const w=get(id);if(w.type!=='text')throw new Error('WORKSPACE_TYPE_MISMATCH');if(expectedRevision!==undefined&&expectedRevision!==w.revision)throw new Error('REVISION_CONFLICT');if(typeof text!=='string'||text.length>100000)throw new Error('INVALID_TEXT');return replace({...w,text,revision:w.revision+1});},
saveCanvas(id,snapshot){const w=get(id);if(w.type!=='canvas')throw new Error('WORKSPACE_TYPE_MISMATCH');const data=JSON.stringify(snapshot);if(data.length>1000000)throw new Error('CANVAS_SNAPSHOT_TOO_LARGE: Maximum 1000000 characters.');return replace({...w,snapshot:JSON.parse(data),revision:w.revision+1});}
});}
export function createWorkspaceTools(store){
const object=properties=>({type:'object',properties,additionalProperties:false}),id={type:'string'},target={...object({workspace_id:id,expected_revision:{type:'integer',minimum:0}}),required:['workspace_id']},textInput={...object({...target.properties,text:{type:'string',maxLength:100000}}),required:['workspace_id','text']};
function text(id){const w=store.read(id);if(w.type!=='text')throw new Error('WORKSPACE_TYPE_MISMATCH');return w;}
const specs=[
{name:'list_workspace',description:'List workspace IDs, names and types; empty when none exist.',inputSchema:object({}),readOnly:true,run:()=>({workspaces:store.list()})},
{name:'add_workspace',description:'Create a text, paint or canvas workspace. The agent may choose a concise descriptive name.',inputSchema:{...object({type:{type:'string',enum:types},name:{type:'string',maxLength:100}}),required:['type']},run:a=>({workspace:store.add(a)})},
{name:'read_text',description:'Read a specific text workspace.',inputSchema:{...object({workspace_id:id}),required:['workspace_id']},readOnly:true,run:a=>text(a.workspace_id)},
{name:'write_text',description:'Replace a text workspace content.',inputSchema:textInput,run:a=>store.write(a.workspace_id,a.text,a.expected_revision)},
{name:'append_text',description:'Append text without adding a newline.',inputSchema:textInput,run:a=>{if(typeof a.text!=='string')throw new Error('INVALID_TEXT');return store.write(a.workspace_id,text(a.workspace_id).text+a.text,a.expected_revision);}},
{name:'clear_text',description:'Clear a text workspace.',inputSchema:target,run:a=>store.write(a.workspace_id,'',a.expected_revision)}];
return Object.freeze({list:()=>specs.map(({run,readOnly,...d})=>({...clone(d),protected:true,annotations:{readOnlyHint:!!readOnly}})),async run(name,args){const spec=specs.find(t=>t.name===name);if(!spec)throw new Error('TOOL_NOT_FOUND');if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('INVALID_ARGUMENTS');for(const key of Object.keys(args))if(!Object.hasOwn(spec.inputSchema.properties,key))throw new Error('UNKNOWN_ARGUMENT: '+key);for(const key of spec.inputSchema.required||[])if(!Object.hasOwn(args,key))throw new Error('MISSING_ARGUMENT: '+key);if('workspace_id'in args&&typeof args.workspace_id!=='string')throw new Error('INVALID_WORKSPACE_ID');if('expected_revision'in args&&(!Number.isInteger(args.expected_revision)||args.expected_revision<0))throw new Error('INVALID_REVISION');return spec.run(clone(args));}});
}
