## Checkpoint (backup)

- **Git commit:** `checkpoint: island scene, water shader, shadows, lighting (before character)`
- **Tag:** `checkpoint-before-character` — restore with: `git checkout checkpoint-before-character` (detached) or `git reset --hard checkpoint-before-character` on branch `dev` (only if you want to discard later work)

## Next: character & camera

- Import `character-male-b.glb` (also in `assets/`, copy to `public/assets/` when used in app).
- Click-to-move in the scene (raycast ground → target position).
- Isometric-style camera follow (fixed angle, tracks character).

\##File format

3D models exported from Blender using GLTF/.glb format.
GL Transmission Format

* Made by Khronos Group (OpenGl, WebGl, Vulkan, etc.)
* Supports diffrent sets of data like geometry, materials, cameras, lights, scene graph, animations, skeletons, morphing, etc.
* Various formats like json, binary, embed textures
* Quickly becming the standard when it comes to real-time 3D





YouTube:



"Three.js character controller tutorial"

"Three.js 3D website walking scene"

"React Three Fiber character movement"






