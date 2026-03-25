import { Box3, Vector3 } from 'three'

const _box = /* @__PURE__ */ new Box3()
const _size = /* @__PURE__ */ new Vector3()
const _toward = /* @__PURE__ */ new Vector3()

/**
 * Picks a starting position for the character in the GLB scene.
 *
 * `Box3().setFromObject(mesh)` is Threejs helper for an axis-aligned bounding box around
 * anything in the scene 
 * Moved the spawn point slightly toward the island center so youthe character does not spawn inside a prop.
 */
export function getSpawnNearSmallBoat(islandScene) {
  if (!islandScene) return null

  islandScene.updateMatrixWorld(true)

  /** Prefer the mesh Blender named exactly `boat-row-large` if it exists, we use it to aproximate the spawn point*/
  let mesh = islandScene.getObjectByName('boat-row-large')
  if (!mesh || !mesh.isMesh) {
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
    _toward.normalize().multiplyScalar(1.6)
  } else {
    _toward.set(1.6, 0, 0)
  }
  spawn.add(_toward)

  return spawn
}
