import { useLayoutEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { Environment } from '@react-three/drei'
import Island from './Island'
import Character from './Character'
import ClickToMove from './ClickToMove'
import CharacterOrbitCamera from './CharacterOrbitCamera'

/**
 * Everything that exists in the 3D world for this portfolio: lights, ground plane, GLTF island model, water shader,
 * animated character, click-to-move, and the orbit camera.
 *
 * `moveTargetRef` is for character movement, the character walks toward whatever point the
 * raycast in `useClickToMove` writes there. Refs are used so it won’t rerender the whole
 * scene every frame when the target moves. That would be annoying.
 */
export default function Scene() {
  const sunRef = useRef(null)
  const characterRef = useRef(null)
  const moveTargetRef = useRef(new Vector3())

  // Directional lights with shadows need their shadow camera frustum tuned( frustum is the 3D volume the camera can see, basically a pyramid) tuned
  useLayoutEffect(() => {
    let id
    const apply = () => {
      const L = sunRef.current
      if (!L?.shadow) return false
      L.shadow.mapSize.set(4096, 4096)
      L.shadow.bias = -0.00025
      L.shadow.normalBias = 0.03
      const cam = L.shadow.camera
      cam.near = 0.5
      cam.far = 120
      /* Tighter box than ±50: same map resolution covers less ground → sharper shadows */
      cam.left = -32
      cam.right = 32
      cam.top = 32
      cam.bottom = -32
      cam.updateProjectionMatrix()
      L.shadow.needsUpdate = true
      return true
    }
    if (!apply()) {
      id = requestAnimationFrame(() => apply())
    }
    return () => id && cancelAnimationFrame(id)
  }, [])

  return (
    <>
      {/* Made a huge plane under the island which catches shadows from models/props */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#3b7d2a" envMapIntensity={0.35} />
      </mesh>

      {/* Ambient + hemispheric fill so nothing is pure black; its kept low so sun shadows show */}
      <ambientLight intensity={0.06} />
      <hemisphereLight
        skyColor="#a8c8e8"
        groundColor="#2a1f14"
        intensity={0.14}
      />
      {/* Main sun: orthographic/isometric shadow camera for crisp contact shadows on the island */}
      <directionalLight
        ref={sunRef}
        position={[18, 28, 14]}
        intensity={1.45}
        color="#fff8ed"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.03}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-32, 32, 32, -32, 0.5, 120]}
        />
        <object3D position={[0, 0, 0]} attach="target" />
      </directionalLight>
      <directionalLight
        position={[-8, 6, -6]}
        intensity={0.12}
        color="#b8d4f0"
        castShadow={false}
      />
      <directionalLight
        position={[-4, 10, -12]}
        intensity={0.1}
        color="#ffe8c8"
        castShadow={false}
      />

      {/* HDR environment map: lights the scene and draws the sky; intensity kept moderate. I might change this later, but this hdri map was the best I could find that fit the island scene */}
      <Environment
        files="/assets/qwantani_sunset_puresky_1k.hdr"
        background
        environmentIntensity={0.22}
        backgroundIntensity={0.88}
      />

      <Island />

      <Character groupRef={characterRef} moveTargetRef={moveTargetRef} />
      <ClickToMove targetRef={moveTargetRef} />
      <CharacterOrbitCamera followRef={characterRef} heightOffset={0.07} distance={0.546} />
    </>
  )
}
