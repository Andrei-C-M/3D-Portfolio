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
 * Island.jsx — loads the GLB, replaces Blender’s water mesh with Three’s animated water,
 * tags meshes for click panels + collision, and adds yellow edge outlines on interactive props.
 *
 * `userData` is the usual place to stash game logic on Three objects: we set `interactionPanel`,
 * `obstacle`, `obstacleBox`, etc., so Character.jsx and useClickToMove can stay dumb.
 */

// Max size (world units) for a mesh that’s allowed to receive a click panel. Stops huge
// accidental planes under a “Book” empty from stealing every raycast.
const MAX_INTERACTIVE_MESH_EXTENT = 2.5

const _interactiveMeshSize = new Vector3()

/**
 * Walks the GLB and stamps `userData.interactionPanel` on meshes that match names in
 * interactionConfig. We only tag **actual Mesh** geometry (not empty parents) so raycasts
 * hit the visible surface — see the long comment in the repo history if you’re debugging
 * “why does clicking sand open the book?”
 */
function tagInteractiveMeshes(scene) {
  scene.traverse((o) => {
    delete o.userData.externalUrl
    delete o.userData.interactionPanel
  })

  // World matrices must be current before measuring bounding boxes.
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

/** Used so we don’t add duplicate outlines for every nested mesh under an interactive root. */
function hasInteractiveParent(o, root) {
  let p = o.parent
  while (p && p !== root) {
    if (p.userData?.isInteractive) return true
    p = p.parent
  }
  return false
}

/**
 * Builds `EdgesGeometry` line segments around each interactive mesh — cheap “highlight”
 * without post-processing. Materials are stored on `scene.userData` so useFrame can pulse opacity.
 */
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

/** Water plane size in world units — should cover the green ground + a little margin. */
export const WATER_WORLD_EXTENT = 42

/** Hidden objects in Blender still export sometimes — skip them for collision. */
function isMeshVisibleInHierarchy(mesh) {
  let o = mesh
  while (o) {
    if (o.visible === false) return false
    o = o.parent
  }
  return true
}

/**
 * Heuristic: mesh name contains “tree” or “house” etc. → solid obstacle. Ground-ish names
 * are excluded. We deliberately skip `leaf` meshes — their bounding boxes are huge and noisy.
 */
function isObstacleMesh(mesh) {
  const n = mesh.name || ''
  if (/water|terrain|sand|ground|grass|sea|ocean|beach/i.test(n)) return false
  if (mesh.isWater) return false
  return /tree|palm|trunk|house|home|cottage|cannon|mast|sail|ship|boat|rowboat|wreck|rock|crate|barrel|fence|pier|dock|lamp|plank|campfire|fire|deck|rail|wheel|anchor/i.test(
    n,
  )
}

const PALM_COLLISION_MAX_FOOTPRINT = 0.52
const PALM_COLLISION_MAX_HEIGHT = 2.8
const HOUSE_COLLISION_SCALE = 0.8

/**
 * `Box3` is an axis-aligned bounding box — the simplest collision volume for static scenery.
 * Palms get a short cylinder-ish box; houses shrink slightly so you don’t feel stuck on corners.
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

/** Builds a list of obstacle meshes + their `Box3` for Character.jsx. */
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

/** Wood/metal props look dull if we clamp env reflections too hard — skip those by name. */
function shouldSkipEnvMapClamp(mesh) {
  const n = (mesh.name || '').toLowerCase()
  return /barrel|cannon|crate|ship|pirate|mast|dock|rope|anchor|helm|rudder|deck|plank|wood/i.test(n)
}

/** Sets cast/receive shadow + slightly tones PBR env on generic meshes. */
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
 * Main island component: GLTF scene, scaling, water swap, tagging, outlines.
 */
export default function Island() {
  const { scene } = useGLTF(ISLAND_GLB_URL)
  const groupRef = useRef()
  const rootScene = useThree((s) => s.scene)

  const waterNormals = useLoader(TextureLoader, '/textures/waternormals.jpg')

  // Center the model on the origin, sit it on y=0, then scale so its largest dimension ≈ 8 units.
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

  // Swap the mesh named `water` for the Three.js Water example (animated normals + reflection).
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

  // After the island group has its final scale, compute obstacles + UI tags + spawn point.
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

  // useGLTF can resolve after first paint — re-apply shadow/env tweaks when the scene is ready.
  useEffect(() => {
    applyShadowFlags(scene)
  }, [scene])

  // Water shader needs a time uniform; outline materials breathe so props feel “alive”.
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
      {/* `primitive` mounts an existing Three object (the GLTF scene) into the R3F tree. */}
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(ISLAND_GLB_URL)
