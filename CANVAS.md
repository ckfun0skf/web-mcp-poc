# Canvas Playground preview

## Available

Create a Canvas Playground workspace from the existing preview UI or add_workspace with type canvas. New scenes contain no sample objects. Each workspace has its own scene, camera, renderer and in-memory animation callback. Three.js is dynamically loaded from https://esm.sh/three@0.180.0 when the first Canvas workspace is used; CDN or WebGL failure is reported rather than silently emulated.

Tools: canvas_get_scene, canvas_run_code and canvas_clear. Definitions are built-in, non-editable and non-deletable; each can be disabled in WebMCP Tool Settings. No global execution checkbox. Canvas tools target explicit IDs and may operate on background Canvas workspaces without switching the UI. Paint tools retain their visible-workspace requirement.

## Example canvas_run_code body

```js
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshNormalMaterial());
cube.name = 'Cube';
scene.add(cube);
app.setAnimation(({delta}) => { cube.rotation.y += delta; });
return { name: cube.name, uuid: cube.uuid };
```

Function arguments: THREE, scene, camera, renderer, app. app.setTarget(x,y,z) changes orbit target; app.setAnimation(fn) runs an in-memory per-frame callback. Code can await and return JSON-compatible results. Camera controls: drag to orbit, wheel to zoom, Reset camera. Save snapshot stores current scene/camera/target; Export PNG downloads the current image. A successful code call also saves a snapshot. Clear removes scene objects with no undo.

## Execution limits

Developer mode: code executes in the page realm, is not sandboxed, and can access DOM, origin storage and network. No timeout can terminate arbitrary same-thread code, so infinite loops can freeze the page. Cancellation cannot reliably stop a started code body or roll back side effects. Only trusted code and test data should be used. Errors may leave in-memory scene changes; no automatic retry.

Snapshots are stored with existing workspace data in localStorage, with a 1000000-character per-Canvas snapshot limit plus browser-origin quota. Only serializable Three.js scene data, camera and target are restored. Program closures, animation callbacks, runtime listeners and arbitrary custom rendering behavior are not persisted or auto-executed after refresh. External assets in scenes may require network access during restore. Custom shaders or unsupported resources may not round-trip. Use explicit snapshot saving for camera changes and animated poses.

Inactive Canvas animation/rendering pauses; switching back resumes. No scene tree, properties inspector, pan, scene JSON import/export UI, undo history or WebSocket integration yet. Renderer cleanup handles normal scene geometry/material/texture resources; arbitrary user-created render targets or external resources remain the code author's responsibility.

Paint regression CI is now workflow_dispatch only and does not run automatically on push. Browser test pages remain available for manual checks. Existing in-progress CI jobs are not cancelled by this configuration change. No new auto-test workflow is added, and no browser verification is claimed for this commit.
