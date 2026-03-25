/**
 * Single place to point at your exported island GLB.
 *
 * Anything in the `public/` folder is served from the site root, so `/assets/island.glb`
 * maps to `public/assets/island.glb`. After you re-export from Blender, drop the new file
 * there (or copy from your `assets/` folder) and refresh — no import path changes needed.
 *
 * Naming in Blender still matters: e.g. a mesh named `water` gets swapped for animated
 * water in Island.jsx; spawn and clickable props rely on names listed in interactionConfig.
 */
export const ISLAND_GLB_URL = '/assets/island.glb'
