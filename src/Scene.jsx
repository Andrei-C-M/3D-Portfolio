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
      L.shadow.bias = -0.00012
      L.shadow.normalBias = 0.008
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
      <ambientLight intensity={0.075} />
      <hemisphereLight
        skyColor="#d2ddf0"
        groundColor="#3a2818"
        intensity={0.17}
      />
      {/* Main sun: orthographic/isometric shadow camera for crisp contact shadows on the island */}
      <directionalLight
        ref={sunRef}
        position={[18, 28, 14]}
        intensity={1.78}
        color="#fff0d4"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.00012}
        shadow-normalBias={0.008}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-32, 32, 32, -32, 0.5, 120]}
        />
        <object3D position={[0, 0, 0]} attach="target" />
      </directionalLight>
      <directionalLight
        position={[-8, 6, -6]}
        intensity={0.08}
        color="#c8d8e8"
        castShadow={false}
      />
      <directionalLight
        position={[-4, 10, -12]}
        intensity={0.08}
        color="#f0e0c8"
        castShadow={false}
      />
      {/* Top-down fill: parallel rays along -Y across the island (no extra shadow map for this light, only main sun handles shadows). */}
      <directionalLight
        position={[0, 48, 0]}
        intensity={0.38}
        color="#fff6ec"
        castShadow={false}
      >
        <object3D position={[0, 0, 0]} attach="target" />
      </directionalLight>

      {/* HDR environment map: lights the scene and draws the sky; intensity kept moderate. I might change this later, but this hdri map was the best I could find that fit the island scene */}
      <Environment
        files="/assets/qwantani_sunset_puresky_1k.hdr"
        background
        environmentIntensity={0.3}
        backgroundIntensity={0.78}
      />

      <Island />

      <Character groupRef={characterRef} moveTargetRef={moveTargetRef} />
      <ClickToMove targetRef={moveTargetRef} />
      <CharacterOrbitCamera followRef={characterRef} heightOffset={0.07} distance={0.546} />
    </>
  )
}
