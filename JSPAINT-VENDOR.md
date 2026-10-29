# Pinned JS Paint engine

Upstream: 1j01/jspaint

Pinned commit: 53be67ab8c47cc0d2168899e7481bc04839c4c81

## Import process

The Vendor pinned JS Paint workflow runs when its workflow file changes on main, or through workflow_dispatch. It fetches the exact revision, verifies basic entry points and the root license, rejects unresolved Git LFS pointer files, and copies upstream files to vendor/jspaint. Upstream .github, .vscode and CNAME are excluded. The import preserves other files, including bundled libraries, assets and license notices. No upstream npm install or project scripts are executed.

The workflow uses contents:write to create a separate bot commit on main. It does not force-push. Branch protection or repository Actions permissions may reject that push; in that case the import is not complete and must not be reported as successful. Actions may consume the repository's runner allowance.

A .nojekyll marker is added for static publication. This workflow does not change GitHub Pages settings or deploy the site. A push made with GITHUB_TOKEN may not trigger a subsequent Pages build; if Pages remains stale, a separate approved deployment or regular authenticated push may be needed. Do not treat a successful vendor job as proof that the public site updated.

## Engine check

After the import and Pages publication, open paint-engine-smoke.html. It checks the vendor revision and loads the local engine in a same-origin iframe. Verify tools, drawing, menus, undo/redo and missing resources manually. An iframe load event alone is not an engine health check.

The standalone check may use upstream browser storage. It is not the final per-workspace storage design; use test drawings only. It does not create a Paint workspace, publish paint tools, or connect jspaint-adapter.js yet.

## Licensing and remaining work

The upstream root license is MIT. Its full LICENSE.txt and bundled dependency notices are retained in the imported tree. Automated file presence checks are not a legal audit of every bundled resource.

Remaining: isolate each workspace's document/session state, connect the engine's tool/history functions to the coordinate adapter, add persistence and built-in tool settings, and verify multi-stage tools and coordinate gestures in a real browser. Existing text workspaces, original Playground and homepage are unchanged by this stage.
