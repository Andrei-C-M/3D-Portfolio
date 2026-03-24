import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  Box3,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  PlaneGeometry,
  RepeatWrapping,
  TextureLoader,
  Vector3,
} from 'three'
import { ISLAND_GLB_URL } from './islandConfig.js'
import { getPanelIdForMeshName } from './interactionConfig.js'
import { getSpawnNearSmallBoat } from './spawnPoint.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

/**
 * Book / LinkedIn / GitHub / Profile — name must match interactionConfig (any Object3D, not only meshes:
 * Blender often uses Groups/empties named "Book" with mesh children named "Cube.001").
 *
 * Links must live on actual mesh geometry only — never on the parent Group. Otherwise raycasts that
 * hit terrain or huge helper planes under the same empty still walk up and open the URL. Huge
 * child meshes (world AABB max edge) are skipped so stray planes/colliders don’t get the link.
 */
const MAX_INTERACTIVE_MESH_EXTENT = 2.5

const _interactiveMeshSize = new Vector3()

function tagInteractiveMeshes(scene) {
  scene.traverse((o) => {
    delete o.userData.externalUrl
    delete o.userData.interactionPanel
  })

  scene.updateMatrixWorld(true)

  function tryAssignInteractiveMesh(mesh, { externalUrl, interactionPanel }) {
    if (!mesh.isMesh || !mesh.geometry) return
    const box = new Box3().setFromObject(mesh)
    if (box.isEmpty()) return
    box.getSize(_interactiveMeshSize)
    if (
      Math.max(
        _interactiveMeshSize.x,
        _interactiveMeshSize.y,
        _interactiveMeshSize.z,
      ) > MAX_INTERACTIVE_MESH_EXTENT
    ) {
      return
    }
    mesh.userData.isInteractive = true
    if (typeof externalUrl === 'string' && externalUrl.length > 0) {
      mesh.userData.externalUrl = externalUrl
    }
    if (typeof interactionPanel === 'string' && interactionPanel.length > 0) {
      mesh.userData.interactionPanel = interactionPanel
    }
  }

  scene.traverse((o) => {
    if (!o.name) return
    const panelId = getPanelIdForMeshName(o.name)
    if (panelId === null) return
    o.userData.isInteractive = true

    if (o.isMesh && o.geometry) {
      tryAssignInteractiveMesh(o, { interactionPanel: panelId })
      return
    }

    o.traverse((child) => {
      if (child === o) return
      tryAssignInteractiveMesh(child, { interactionPanel: panelId })
    })
  })
}

function hasInteractiveParent(o, root) {
  let p = o.parent
  while (p && p !== root) {
    if (p.userData?.isInteractive) return true
    p = p.parent
  }
  return false
}

/** Pulsing yellow edge outlines on interactive props (Book, LinkedIn, GitHub, Profile) */
function addInteractionOutlines(scene) {
  if (scene.userData.interactionOutlinesAdded) return
  scene.userData.interactionOutlinesAdded = true

  const outlineMaterials = []

  scene.updateMatrixWorld(true)

  const roots = []
  scene.traverse((o) => {
    if (!o.userData.isInteractive) return
    if (hasInteractiveParent(o, scene)) return
    roots.push(o)
  })

  for (const root of roots) {
    root.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.userData.interactionOutlineAttached) return
      o.userData.interactionOutlineAttached = true

      const edges = new EdgesGeometry(o.geometry, 22)
      const mat = new LineBasicMaterial({
        color: 0xffcc33,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
      })
      outlineMaterials.push(mat)

      const lines = new LineSegments(edges, mat)
      lines.name = 'interaction-outline'
      lines.userData.isInteractionOutline = true
      lines.renderOrder = 10
      o.add(lines)
    })
  }

  scene.userData.interactionOutlineMaterials = outlineMaterials
}

/** World-space width/depth for water; keep in sync with Scene ground plane (~40) + small margin */
export const WATER_WORLD_EXTENT = 42

/** True if mesh and ancestors are visible (hidden Blender objects must not leave ghost collision). */
function isMeshVisibleInHierarchy(mesh) {
  let o = mesh
  while (o) {
    if (o.visible === false) return false
    o = o.parent
  }
  return true
}

/**
 * Mark trees, buildings, props — not terrain/water/grass (walkable ground).
 * Omit `leaf`: foliage submeshes often have loose AABBs and duplicate old positions after moving trees.
 */
function isObstacleMesh(mesh) {
  const n = mesh.name || ''
  if (/water|terrain|sand|ground|grass|sea|ocean|beach/i.test(n)) return false
  if (mesh.isWater) return false
  return /tree|palm|trunk|house|home|cottage|cannon|mast|sail|ship|boat|rowboat|wreck|rock|crate|barrel|fence|pier|dock|lamp|plank|campfire|fire|deck|rail|wheel|anchor/i.test(
    n,
  )
}

/** Palm meshes: tight trunk box so canopy doesn’t block a huge area (world units after island scale). */
const PALM_COLLISION_MAX_FOOTPRINT = 0.52
const PALM_COLLISION_MAX_HEIGHT = 2.8

/** House / cottage: shrink full AABB by 20% (×0.8) around center so walls feel less “puffy”. */
const HOUSE_COLLISION_SCALE = 0.8

/**
 * World-space AABB for character collision.
 * Palm: small trunk box; house/home/cottage: 20% tighter than bounds; else full bounds.
 */
function computeObstacleBox(mesh) {
  const full = new Box3().setFromObject(mesh)
  const n = mesh.name || ''
  if (/palm/i.test(n)) {
    const center = new Vector3()
    const size = new Vector3()
    full.getCenter(center)
    full.getSize(size)

    const halfFoot = Math.min(size.x, size.z, PALM_COLLISION_MAX_FOOTPRINT) * 0.5
    const h = Math.min(size.y, PALM_COLLISION_MAX_HEIGHT)
    const min = new Vector3(center.x - halfFoot, full.min.y, center.z - halfFoot)
    const max = new Vector3(center.x + halfFoot, full.min.y + h, center.z + halfFoot)
    return new Box3(min, max)
  }

  if (/house|home|cottage/i.test(n)) {
    const center = new Vector3()
    const size = new Vector3()
    full.getCenter(center)
    full.getSize(size)
    size.multiplyScalar(HOUSE_COLLISION_SCALE)
    const hx = size.x * 0.5
    const hy = size.y * 0.5
    const hz = size.z * 0.5
    return new Box3(
      new Vector3(center.x - hx, center.y - hy, center.z - hz),
      new Vector3(center.x + hx, center.y + hy, center.z + hz),
    )
  }

  return full
}

const _obstacleSizeCheck = new Vector3()

/** World-space AABB per mesh for character collision (static island). */
function tagObstacles(scene) {
  scene.updateMatrixWorld(true)
  // Clear previous tags so renamed/removed meshes don’t keep stale collision after GLB updates.
  scene.traverse((o) => {
    if (!o.isMesh) return
    delete o.userData.obstacle
    delete o.userData.obstacleBox
  })

  const list = []
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry || !isMeshVisibleInHierarchy(o)) return
    if (!isObstacleMesh(o)) return
    const box = computeObstacleBox(o)
    if (box.isEmpty()) return
    box.getSize(_obstacleSizeCheck)
    if (Math.max(_obstacleSizeCheck.x, _obstacleSizeCheck.y, _obstacleSizeCheck.z) < 1e-4) return
    o.userData.obstacle = true
    o.userData.obstacleBox = box
    list.push(o)
  })
  scene.userData.obstacleMeshes = list
}

/** Props / ship pieces: keep GLB envMapIntensity so HDRI doesn’t flatten wood & metal (barrels, ship, etc.) */
function shouldSkipEnvMapClamp(mesh) {
  const n = (mesh.name || '').toLowerCase()
  return /barrel|cannon|crate|ship|pirate|mast|dock|rope|anchor|helm|rudder|deck|plank|wood/i.test(n)
}

function applyShadowFlags(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return
    if (obj.isWater === true) {
      obj.castShadow = false
      obj.receiveShadow = true
    } else {
      obj.castShadow = true
      obj.receiveShadow = true
    }

    if (shouldSkipEnvMapClamp(obj)) return

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
    const newMats = mats.map((mat) => {
      if (!mat || !('envMapIntensity' in mat)) return mat
      const tuned = mat.clone()
      tuned.envMapIntensity = Math.min(mat.envMapIntensity ?? 1, 0.55)
      return tuned
    })
    obj.material = Array.isArray(obj.material) ? newMats : newMats[0]
  })
}

/**
 * Loads the island GLB (see islandConfig.js) and swaps the mesh named "water" for Three.js Water
 * (reflections + animated normals). Requires /textures/waternormals.jpg in public.
 */
export default function Island() {
  const { scene } = useGLTF(ISLAND_GLB_URL)
  const groupRef = useRef()
  const rootScene = useThree((s) => s.scene)

  const waterNormals = useLoader(TextureLoader, '/textures/waternormals.jpg')

  // Same placement as before: center XZ, base on ground, scale to fit
  const { scale } = useMemo(() => {
    const box = new Box3().setFromObject(scene)
    const center = new Vector3()
    const size = new Vector3()
    box.getCenter(center)
    box.getSize(size)

    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y -= box.min.y

    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const desiredSize = 8
    const s = desiredSize / maxDim

    return { scale: s }
  }, [scene])

  useLayoutEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.set(scale, scale, scale)
    }
  }, [scale])

  // Replace Blender water mesh with Three.js Water shader (once)
  useLayoutEffect(() => {
    if (scene.userData.waterEffectInstalled) return

    const waterMesh = scene.getObjectByName('water')
    if (!waterMesh || !waterMesh.isMesh) return

    waterNormals.wrapS = waterNormals.wrapT = RepeatWrapping

    waterMesh.geometry.dispose()

    // Large plane in local space so after island group scale it fills the scene (see WATER_WORLD_EXTENT)
    const extentLocal = WATER_WORLD_EXTENT / scale
    const geom = new PlaneGeometry(extentLocal, extentLocal, 128, 128)
    const sunDir = new Vector3(18, 28, 14).normalize()

    const water = new Water(geom, {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals,
      sunDirection: sunDir,
      // Warm highlight on waves; water reads as blue via waterColor
      sunColor: 0xe8f4ff,
      waterColor: 0x1565c0,
      // Slightly stronger ripples on a bigger plane
      distortionScale: 3.4,
      fog: false,
    })

    water.position.copy(waterMesh.position)
    // PlaneGeometry lies in XY; rotate -90° on X so it lies flat on XZ (horizontal water).
    // Do not reuse the old mesh quaternion — it fights the new plane and reads as a vertical wall.
    water.rotation.set(-Math.PI / 2, 0, 0)
    water.scale.set(1, 1, 1)
    water.name = 'water'

    if (water.material?.uniforms?.size) {
      water.material.uniforms.size.value = extentLocal * 0.25
    }

    const parent = waterMesh.parent
    if (parent) {
      parent.remove(waterMesh)
      if (waterMesh.material) {
        const m = waterMesh.material
        if (Array.isArray(m)) m.forEach((mat) => mat.dispose?.())
        else m.dispose?.()
      }
      parent.add(water)
    }

    scene.userData.waterInstance = water
    scene.userData.waterEffectInstalled = true

    applyShadowFlags(scene)
  }, [scene, waterNormals, scale])

  // Obstacle bounds (after group scale) + spawn beside rowboat + expose for Character
  useLayoutEffect(() => {
    if (!groupRef.current) return
    groupRef.current.updateMatrixWorld(true)
    tagObstacles(scene)
    tagInteractiveMeshes(scene)
    addInteractionOutlines(scene)
    rootScene.userData.obstacleMeshes = scene.userData.obstacleMeshes || []
    const spawn = getSpawnNearSmallBoat(scene)
    rootScene.userData.characterSpawn = spawn ? spawn.clone() : null
  }, [scene, scale, rootScene])

  // GLTF meshes default to castShadow/receiveShadow = false — run again after async load
  useEffect(() => {
    applyShadowFlags(scene)
  }, [scene])

  // Animate water shader — multiply delta so ripples move slowly
  const WATER_TIME_SCALE = 0.12
  useFrame((state, delta) => {
    const w = scene.userData.waterInstance ?? scene.getObjectByName('water')
    if (w?.material?.uniforms?.time) {
      w.material.uniforms.time.value += delta * WATER_TIME_SCALE
    }

    const mats = scene.userData.interactionOutlineMaterials
    if (!mats?.length) return
    const t = state.clock.elapsedTime
    mats.forEach((mat, i) => {
      mat.opacity = 0.42 + 0.52 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 0.6))
    })
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(ISLAND_GLB_URL)
