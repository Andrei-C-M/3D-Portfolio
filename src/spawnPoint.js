import { Box3, Vector3 } from 'three'

const _box = /* @__PURE__ */ new Box3()
const _size = /* @__PURE__ */ new Vector3()
const _toward = /* @__PURE__ */ new Vector3()

/**
 * World-space spawn point beside the small rowboat (`boat-row-large` if present in the GLB).
 * Pushes the point toward island center so the character isn’t inside obstacle bounds.
 */
export function getSpawnNearSmallBoat(islandScene) {
  if (!islandScene) return null

  islandScene.updateMatrixWorld(true)

  /** Prefer the named rowboat from this asset */
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
