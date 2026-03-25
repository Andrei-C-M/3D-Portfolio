import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import {
  Box3,
  PlaneGeometry,
  PointLight,
  RepeatWrapping,
  TextureLoader,
  Vector3,
} from 'three'
import { ISLAND_GLB_URL } from './islandConfig.js'
import { getPanelIdForMeshName } from './interactionConfig.js'
import { getSpawnNearSmallBoat } from './spawnPoint.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

/**
 * Island.jsx-  loads the GLB, replaces Blender’s water mesh with Three’js animated water,
 * tags meshes for click panels + collision, and adds a small accent light on interactive props.

 */

// Max size (world units) for a mesh that’s allowed to receive a click panel. 
//I had issues when clicking far from an object, it would still open panels as if the user clicked on the object itself

const MAX_INTERACTIVE_MESH_EXTENT = 2.5

const _interactiveMeshSize = new Vector3()

/**
 * Goes through the island model and marks clickable meshes so clicks know which popup to open.
 * The mark is stored on `userData.interactionPanel`. We only put it on real mesh geometry
 * (not empty parent objects), so clicks land on what you actually see.
 */
function tagInteractiveMeshes(scene) {
  scene.traverse((o) => {
    delete o.userData.externalUrl
    delete o.userData.interactionPanel
  })

  // World matrices - in ThreeJS every object has a matrix that defines/stores its position, rotation, and scale in the world
  //this prevents issues when reloading the scene or importing a newly exported version of the scene from Blender. 
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

/** Skip children when the parent is already the interactive root (one light per prop). */
function hasInteractiveParent(o, root) {
  let p = o.parent
  while (p && p !== root) {
    if (p.userData?.isInteractive) return true
    p = p.parent
  }
  return false
}

/** ~40% of previous strength (60% lower). */
const ACCENT_LIGHT_INTENSITY_SCALE = 0.4

function isGiraffeInteractiveRoot(root) {
  const n = (root.name || '').toLowerCase()
  return /(^|[^a-z0-9])giraffe([^a-z0-9]|$)/.test(n)
}

/** Book / GitHub / LinkedIn props: dimmer accent (see `accentGlowMul`). */
function isBookGithubLinkedInRoot(root) {
  const n = (root.name || '').toLowerCase()
  if (/(^|[^a-z0-9])book([^a-z0-9]|$)/.test(n)) return true
  if (/github/.test(n)) return true
  if (/linkedin/.test(n)) return true
  return false
}

/** One warm point light per interactive root (book, github, linkedin) */
function addInteractionLights(scene) {
  if (scene.userData.interactionLightsAdded) return
  scene.userData.interactionLightsAdded = true

  const accentLights = []

  scene.updateMatrixWorld(true)

  const roots = []
  scene.traverse((o) => {
    if (!o.userData.isInteractive) return
    if (hasInteractiveParent(o, scene)) return
    roots.push(o)
  })

  for (const root of roots) {
    if (isGiraffeInteractiveRoot(root)) continue

    const glowMul = isBookGithubLinkedInRoot(root) ? 0.5 : 1
    const light = new PointLight(0xffe8b8, 0.45 * glowMul, 5.5, 2)
    light.position.set(0, 0.25, 0)
    light.name = 'interaction-accent-light'
    light.userData.isInteractionAccentLight = true
    light.userData.accentGlowMul = glowMul
    root.add(light)
    accentLights.push(light)
  }

  scene.userData.interactionAccentLights = accentLights
}

/** Water plane size in world units + a little margin. */
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
 * If the mesh name contains "palm" or "house" etc. → solid obstacle.
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
 * `Box3` is an axis-aligned bounding box - simple collision volume for static scenery.
 * Palms get a short cylinder shaped box; houses shrink slightly so I don’t get stuck on corners again.
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

/** Wood/metal props had issues with shaders exported from blender — skip those by name. */
function shouldSkipEnvMapClamp(mesh) {
  const n = (mesh.name || '').toLowerCase()
  return /barrel|cannon|crate|ship|pirate|mast|dock|rope|anchor|helm|rudder|deck|plank|wood/i.test(n)
}

/** Turn on shadows for meshes, lower HDRI reflections on normal surfaces, except where we want stronger reflections */
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
 * Main island component: GLTF scene, scaling, water shader swap, tagging, accent lights.
 */
export default function Island() {
  const { scene } = useGLTF(ISLAND_GLB_URL)
  const groupRef = useRef()
  const rootScene = useThree((s) => s.scene)

  const waterNormals = useLoader(TextureLoader, '/textures/waternormals.jpg')

  // Center the model on the origin, sit it on y=0 axis, then scale so its largest dimension ≈ 8 units.
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
  // I used this water shader because it was the only one that worked with the island model, the original water shader exported from blender was crashing everything.
  useLayoutEffect(() => {
    if (scene.userData.waterEffectInstalled) return

    const waterMesh = scene.getObjectByName('water')
    if (!waterMesh || !waterMesh.isMesh) return

    waterNormals.wrapS = waterNormals.wrapT = RepeatWrapping

    waterMesh.geometry.dispose()

    // Large plane in local space so after island group scale it fills the scene
    const extentLocal = WATER_WORLD_EXTENT / scale
    const geom = new PlaneGeometry(extentLocal, extentLocal, 128, 128)
    const sunDir = new Vector3(18, 28, 14).normalize()

    const water = new Water(geom, {
      textureWidth: 1024,
      textureHeight: 1024,
      waterNormals,
      sunDirection: sunDir,
      // Warm highlight on waves; water shader is colored blue by waterColor property
      sunColor: 0xe8f4ff,
      waterColor: 0x1565c0,
      // Slightly stronger ripples
      distortionScale: 3.4,
      fog: false,
    })

    water.position.copy(waterMesh.position)
    // PlaneGeometry lies in XY; rotate -90° on X so it lies flat on XZ (horizontal water).
    // Do not reuse the old mesh
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
    addInteractionLights(scene)
    rootScene.userData.obstacleMeshes = scene.userData.obstacleMeshes || []
    const spawn = getSpawnNearSmallBoat(scene)
    rootScene.userData.characterSpawn = spawn ? spawn.clone() : null
  }, [scene, scale, rootScene])

  // re-apply shadow/env tweaks when the scene is ready, had issues with the shadows not showing up properly when the scene was reloaded.
  useEffect(() => {
    applyShadowFlags(scene)
  }, [scene])

  // Water animation + soft pulse on interactive accent lights
  const WATER_TIME_SCALE = 0.144
  useFrame((state, delta) => {
    const w = scene.userData.waterInstance ?? scene.getObjectByName('water')
    if (w?.material?.uniforms?.time) {
      w.material.uniforms.time.value += delta * WATER_TIME_SCALE
    }

    const accentLights = scene.userData.interactionAccentLights
    if (!accentLights?.length) return
    const t = state.clock.elapsedTime
    accentLights.forEach((light, i) => {
      const pulse =
        0.75 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.65))
      const mul = light.userData.accentGlowMul ?? 1
      light.intensity = pulse * ACCENT_LIGHT_INTENSITY_SCALE * mul
    })
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* we plug the ThreeJS scene into a react component tree instead of listing every mesh manually */}
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(ISLAND_GLB_URL)
