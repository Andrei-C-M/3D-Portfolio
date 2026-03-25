import { Box3, Vector3 } from 'three'

const _box = /* @__PURE__ */ new Box3()
const _size = /* @__PURE__ */ new Vector3()
const _toward = /* @__PURE__ */ new Vector3()

const BOAT_ROW_LARGE = 'boat-row-large'
/** Horizontal nudge from the boat bbox center toward island center (sand beside the hull). */
const SHORE_OFFSET = 0.32

/**
 * Blender often exports `boat-row-large` as a Group (empty parent) with child meshes that are  not `isMesh`.
 */
function findBoatRowLargeRoot(islandScene) {
  if (!islandScene) return null

  let exact = null
  let fuzzy = null
  islandScene.traverse((o) => {
    const n = (o.name || '').trim().toLowerCase()
    if (n === BOAT_ROW_LARGE) exact = o
    else if (!fuzzy && n.includes(BOAT_ROW_LARGE)) fuzzy = o
  })
  if (exact) return exact
  if (fuzzy) return fuzzy

  const byName = islandScene.getObjectByName(BOAT_ROW_LARGE)
  if (byName) return byName

  return null
}

/**
 * Picks a starting position for the character in the GLB scene.
 *
 * Prefers the object named `boat-row-large` (Blender mesh name). Spawns near the boat, slightly toward the island center.
 */
export function getSpawnNearSmallBoat(islandScene) {
  if (!islandScene) return null

  islandScene.updateMatrixWorld(true)

  let mesh = findBoatRowLargeRoot(islandScene)

  if (!mesh) {
    let best = null
    let bestVol = Infinity
    islandScene.traverse((o) => {
      if (!o.isMesh) return
      const n = (o.name || '').toLowerCase()
      if (!/boat-row|rowboat|dinghy|canoe/.test(n)) return
      if (/paddle|ship-pirate|ship-wreck|ship_wreck|mast|sail/.test(n)) return
      _box.setFromObject(o)
      _box.getSize(_size)
      const vol = _size.x * _size.y * _size.z
      if (vol < bestVol && vol > 1e-6) {
        bestVol = vol
        best = o
      }
    })
    mesh = best
  }

  if (!mesh) return null

  _box.setFromObject(mesh)
  const spawn = new Vector3()
  _box.getCenter(spawn)

  _toward.set(-spawn.x, 0, -spawn.z)
  if (_toward.lengthSq() > 1e-4) {
    _toward.normalize().multiplyScalar(SHORE_OFFSET)
  } else {
    _toward.set(SHORE_OFFSET, 0, 0)
  }
  spawn.add(_toward)

  return spawn
}
