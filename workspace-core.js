const clone = value => structuredClone(value);
export function createWorkspaceStore({initial = [], persist = () => {}} = {}) {
  let items = clone(initial);
  const listeners = new Set();
  function get(id) { const w = items.find(x => x.id === id); if (!w) throw new Error('WORKSPACE_NOT_FOUND'); return w; }
  function commit(next) { persist(clone(next)); items = next; for (const fn of listeners) fn(); }
  const store = Object.freeze({
    list: () => items.map(({id,name,type}) => ({id,name,type})),
    read: id => clone(get(id)),
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    add({type,name} = {}) {
      if (type !== 'text') throw new Error('TYPE_NOT_AVAILABLE: Paint and Canvas are not implemented in this preview.');
      if (name !== undefined && (typeof name !== 'string' || name.trim().length > 100)) throw new Error('INVALID_NAME');
      const w = {id: crypto.randomUUID(),name: name?.trim() || `Untitled Text ${items.length + 1}`,type,revision:0,text:''};
      commit([...items,w]); return clone(w);
    },
    rename(id,name) { get(id); if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('INVALID_NAME'); commit(items.map(w => w.id === id ? {...w,name:name.trim()} : w)); },
    remove(id) { get(id); commit(items.filter(w => w.id !== id)); },
    write(id,text,expectedRevision) {
      const w = get(id);
      if (w.type !== 'text') throw new Error('WORKSPACE_TYPE_MISMATCH');
      if (expectedRevision !== undefined && expectedRevision !== w.revision) throw new Error('REVISION_CONFLICT');
      if (typeof text !== 'string' || text.length > 100000) throw new Error('INVALID_TEXT: Maximum 100000 UTF-16 code units.');
      const next = {...w,text,revision:w.revision+1}; commit(items.map(x => x.id === id ? next : x)); return clone(next);
    }
  });
  if (!Array.isArray(items) || items.some(w => !w || typeof w.id !== 'string' || typeof w.name !== 'string' || w.type !== 'text' || typeof w.text !== 'string' || w.text.length > 100000 || !Number.isInteger(w.revision) || w.revision < 0) || new Set(items.map(w=>w.id)).size !== items.length) throw new Error('INVALID_SAVED_WORKSPACES');
  return store;
}
export function createWorkspaceTools(store) {
  const object = properties => ({type:'object',properties,additionalProperties:false});
  const id = {type:'string',description:'Stable workspace ID returned by list_workspace or add_workspace.'};
  const target = {...object({workspace_id:id,expected_revision:{type:'integer',minimum:0}}),required:['workspace_id']};
  const textInput = {...object({...target.properties,text:{type:'string',maxLength:100000}}),required:['workspace_id','text']};
  const specs = [
    {name:'list_workspace',description:'List workspace IDs, names and types. Returns an empty array when none exist.',inputSchema:object({}),readOnly:true,run:()=>({workspaces:store.list()})},
    {name:'add_workspace',description:'Create a workspace. The agent may choose a concise descriptive name. Only text is available in this preview; paint and canvas will follow.',inputSchema:{...object({type:{type:'string',enum:['text']},name:{type:'string',maxLength:100}}),required:['type']},run:a=>({workspace:store.add(a)})},
    {name:'read_text',description:'Read a specific text workspace.',inputSchema:{...object({workspace_id:id}),required:['workspace_id']},readOnly:true,run:a=>store.read(a.workspace_id)},
    {name:'write_text',description:'Replace the full content of a text workspace.',inputSchema:textInput,run:a=>store.write(a.workspace_id,a.text,a.expected_revision)},
    {name:'append_text',description:'Append text without adding a newline.',inputSchema:textInput,run:a=>store.write(a.workspace_id,store.read(a.workspace_id).text+a.text,a.expected_revision)},
    {name:'clear_text',description:'Clear a text workspace.',inputSchema:target,run:a=>store.write(a.workspace_id,'',a.expected_revision)}
  ];
  const definitions = specs.map(({run,readOnly,...d})=>({...d,annotations:{readOnlyHint:!!readOnly},protected:['list_workspace','add_workspace'].includes(d.name)}));
  return Object.freeze({
    list:()=>clone(definitions),
    async run(name,args) {
      const spec = specs.find(t=>t.name===name); if (!spec) throw new Error('TOOL_NOT_FOUND');
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('INVALID_ARGUMENTS');
      for (const k of Object.keys(args)) if (!(k in spec.inputSchema.properties)) throw new Error('UNKNOWN_ARGUMENT: '+k);
      for (const k of spec.inputSchema.required || []) if (!(k in args)) throw new Error('MISSING_ARGUMENT: '+k);
      if ('workspace_id' in args && typeof args.workspace_id !== 'string') throw new Error('INVALID_WORKSPACE_ID');
      if ('expected_revision' in args && (!Number.isInteger(args.expected_revision) || args.expected_revision < 0)) throw new Error('INVALID_REVISION');
      return spec.run(clone(args));
    }
  });
}
