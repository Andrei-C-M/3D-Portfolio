import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Box3, RepeatWrapping, TextureLoader, Vector3 } from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'

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
  })
}

/**
 * Loads island.glb and swaps the mesh named "water" for Three.js Water
 * (reflections + animated normals). Requires /textures/waternormals.jpg in public.
 */
export default function Island() {
  const { scene } = useGLTF('/assets/island.glb')
  const groupRef = useRef()

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

  useEffect(() => {
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

    const geom = waterMesh.geometry.clone()
    waterMesh.geometry.dispose()
    const sunDir = new Vector3(18, 28, 14).normalize()

    const water = new Water(geom, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: sunDir,
      // Warm highlight on waves; water reads as blue via waterColor
      sunColor: 0xe8f4ff,
      waterColor: 0x1565c0,
      distortionScale: 2.8,
      fog: false,
    })

    water.position.copy(waterMesh.position)
    water.rotation.copy(waterMesh.rotation)
    water.scale.copy(waterMesh.scale)
    water.name = 'water'

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
  }, [scene, waterNormals])

  // GLTF meshes default to castShadow/receiveShadow = false — run again after async load
  useEffect(() => {
    applyShadowFlags(scene)
  }, [scene])

  // Animate water shader — multiply delta so ripples move slowly
  const WATER_TIME_SCALE = 0.12
  useFrame((_, delta) => {
    const w = scene.userData.waterInstance ?? scene.getObjectByName('water')
    if (w?.material?.uniforms?.time) {
      w.material.uniforms.time.value += delta * WATER_TIME_SCALE
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
}
