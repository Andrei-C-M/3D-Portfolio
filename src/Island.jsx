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
import { getUrlForInteractiveMeshName } from './interactionConfig.js'
import { getSpawnNearSmallBoat } from './spawnPoint.js'
import { Water } from 'three/examples/jsm/objects/Water.js'

/**
 * Book / LinkedIn / GitHub / Profile — name must match interactionConfig (any Object3D, not only meshes:
 * Blender often uses Groups/empties named "Book" with mesh children named "Cube.001").
 */
function tagInteractiveMeshes(scene) {
  scene.traverse((o) => {
    if (!o.name) return
    const url = getUrlForInteractiveMeshName(o.name)
    if (url === null) return
    o.userData.isInteractive = true
    if (url.length > 0) o.userData.externalUrl = url
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

/** Soft point lights on interactive props (parented to scaled island group) */
function addInteractionHintLights(scene, islandGroup) {
  if (!islandGroup || scene.userData.interactionHintLightsAdded) return
  scene.userData.interactionHintLightsAdded = true

  const box = new Box3()
  const worldCenter = new Vector3()
  const localPos = new Vector3()
  const upLocal = new Vector3(0, 0.22, 0)
  const lights = []

  scene.updateMatrixWorld(true)
  islandGroup.updateMatrixWorld(true)

  scene.traverse((o) => {
    if (!o.userData.isInteractive) return
    // One light per prop: skip mesh if parent Group is already interactive (same glow)
    if (hasInteractiveParent(o, scene)) return

    box.setFromObject(o)
    if (box.isEmpty()) return
    box.getCenter(worldCenter)
    localPos.copy(worldCenter)
    islandGroup.worldToLocal(localPos)

    const light = new PointLight(0xffe8cc, 1.05, 3.4, 2)
    light.position.copy(localPos).add(upLocal)
    light.name = 'interaction-hint-light'
    light.userData.isInteractionHintLight = true
    islandGroup.add(light)
    lights.push(light)
  })

  scene.userData.interactionHintLights = lights
}

/** World-space width/depth for water; keep in sync with Scene ground plane (~40) + small margin */
export const WATER_WORLD_EXTENT = 42

/** Mark trees, buildings, props — not terrain/water/grass (walkable ground). */
function isObstacleMesh(mesh) {
  const n = mesh.name || ''
  if (/water|terrain|sand|ground|grass|sea|ocean|beach/i.test(n)) return false
  if (mesh.isWater) return false
  return /tree|palm|trunk|leaf|house|home|cottage|cannon|mast|sail|ship|boat|rowboat|wreck|rock|crate|barrel|fence|pier|dock|lamp|plank|campfire|fire|deck|rail|wheel|anchor/i.test(
    n,
  )
}

/** World-space AABB per mesh for character collision (static island). */
function tagObstacles(scene) {
  scene.updateMatrixWorld(true)
  const list = []
  scene.traverse((o) => {
    if (!o.isMesh || !isObstacleMesh(o)) return
    o.userData.obstacle = true
    const box = new Box3().setFromObject(o)
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
    addInteractionHintLights(scene, groupRef.current)
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
  // Subtle pulse on interactive prop lights
  useFrame((state, delta) => {
    const w = scene.userData.waterInstance ?? scene.getObjectByName('water')
    if (w?.material?.uniforms?.time) {
      w.material.uniforms.time.value += delta * WATER_TIME_SCALE
    }

    const lights = scene.userData.interactionHintLights
    if (!lights?.length) return
    const t = state.clock.elapsedTime
    lights.forEach((light, i) => {
      light.intensity = 0.75 + 0.45 * Math.sin(t * 2.1 + i * 0.85)
    })
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(ISLAND_GLB_URL)
