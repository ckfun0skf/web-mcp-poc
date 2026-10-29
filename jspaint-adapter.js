// Adapter boundary: host supplies references from a same-origin JS Paint instance.
// This module is not a replacement paint renderer or a complete JS Paint integration.
export function createJSPaintAdapter({canvas, $, selectTool, assertIdle, undo, redo, exportPNG}) {
  if (!canvas || typeof $ !== 'function' || typeof selectTool !== 'function' || typeof assertIdle !== 'function') throw new Error('INVALID_PAINT_HOST');
  let queue = Promise.resolve(), disposed = false;
  const win = canvas.ownerDocument.defaultView;
  function check(signal) { if (disposed) throw new Error('PAINT_DISPOSED'); signal?.throwIfAborted(); }
  function serial(fn, signal) {
    const task = queue.then(async () => { check(signal); await assertIdle(); check(signal); return fn(); });
    queue = task.catch(() => {}); return task;
  }
  function pointsOf(points) {
    if (!Array.isArray(points) || points.length < 1 || points.length > 10000) throw new Error('INVALID_POINTS: Expected 1 to 10000 image-space points.');
    return points.map(p => {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) throw new Error('INVALID_POINT');
      if (p[0] < 0 || p[1] < 0 || p[0] >= canvas.width || p[1] >= canvas.height) throw new Error('POINT_OUT_OF_BOUNDS');
      return [...p];
    });
  }
  function emit(type, point, {button,shiftKey}, pressed) {
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0 && rect.height > 0 && canvas.width > 0 && canvas.height > 0)) throw new Error('PAINT_NOT_VISIBLE');
    const clientX = rect.left + point[0] * rect.width / canvas.width;
    const clientY = rect.top + point[1] * rect.height / canvas.height;
    $(canvas).trigger(new $.Event(type, {
      view:win,bubbles:true,cancelable:true,clientX,clientY,
      screenX:clientX,screenY:clientY,offsetX:point[0],offsetY:point[1],
      button,buttons:pressed ? (button === 2 ? 2 : 1) : 0,shiftKey
    }));
  }
  return Object.freeze({
    getState() { check(); return {width:canvas.width,height:canvas.height,coordinateSpace:'image-pixels',origin:'top-left'}; },
    gesture({tool,points,button=0,shiftKey=false}={}, {signal}={}) {
      if (typeof tool !== 'string' || !tool) return Promise.reject(new Error('INVALID_TOOL'));
      if (![0,2].includes(button) || typeof shiftKey !== 'boolean') return Promise.reject(new Error('INVALID_MODIFIERS'));
      let path;try { path=pointsOf(points); } catch(e) { return Promise.reject(e); }
      return serial(async () => {
        // Revalidate at execution time in case a queued operation resized the image.
        pointsOf(path);
        await selectTool(tool); check(signal);
        const modifiers={button,shiftKey};let pressed=false,last=path[0];
        try {
          emit('pointerenter',last,modifiers,false);
          pressed=true;emit('pointerdown',last,modifiers,true);
          for (const point of path.slice(1)) {
            check(signal);last=point;emit('pointermove',point,modifiers,true);
            // Yield so the host can update previews and process cancellation.
            await new Promise(resolve=>win.setTimeout(resolve,0));
          }
          check(signal);emit('pointerup',last,modifiers,false);pressed=false;
          emit('pointerleave',last,modifiers,false);
          return {success:true,pointCount:path.length};
        } catch(error) {
          if (pressed) { try { emit('pointerup',last,modifiers,false); } catch {} }
          throw new Error('PAINT_GESTURE_FAILED: '+String(error.message || error)+'; side effects may have occurred. Do not automatically retry.');
        }
      },signal);
    },
    undo({signal}={}) { return serial(()=>{if(typeof undo!=='function')throw new Error('UNDO_NOT_AVAILABLE');return undo();},signal); },
    redo({signal}={}) { return serial(()=>{if(typeof redo!=='function')throw new Error('REDO_NOT_AVAILABLE');return redo();},signal); },
    exportPNG({signal}={}) { return serial(()=>{if(typeof exportPNG!=='function')throw new Error('EXPORT_NOT_AVAILABLE');return exportPNG();},signal); },
    dispose() { disposed=true; }
  });
}
