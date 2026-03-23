import { useLayoutEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { Environment } from '@react-three/drei'
import Island from './Island'
import Character from './Character'
import ClickToMove from './ClickToMove'
import CharacterOrbitCamera from './CharacterOrbitCamera'

/**
 * Scene: lights, ground, island, character (click-to-move), orbit camera (MMB).
 */
export default function Scene() {
  const sunRef = useRef(null)
  const characterRef = useRef(null)
  const moveTargetRef = useRef(new Vector3())

  // Ref can be null on first useEffect tick — retry so shadow camera always configures
  useLayoutEffect(() => {
    let id
    const apply = () => {
      const L = sunRef.current
      if (!L?.shadow) return false
      L.shadow.mapSize.set(2048, 2048)
      L.shadow.bias = -0.00025
      L.shadow.normalBias = 0.045
      const cam = L.shadow.camera
      cam.near = 0.5
      cam.far = 120
      cam.left = -50
      cam.right = 50
      cam.top = 50
      cam.bottom = -50
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
      {/* Ground receives shadows from the island */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#3b7d2a" envMapIntensity={0.35} />
      </mesh>

      {/* Keep fill low so HDRI + sun shadows stay visible (IBL otherwise washes shadows) */}
      <ambientLight intensity={0.06} />
      <hemisphereLight
        skyColor="#a8c8e8"
        groundColor="#2a1f14"
        intensity={0.14}
      />
      {/* Explicit shadow frustum + target in scene graph (required for stable shadows) */}
      <directionalLight
        ref={sunRef}
        position={[18, 28, 14]}
        intensity={1.45}
        color="#fff8ed"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00025}
        shadow-normalBias={0.045}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-50, 50, 50, -50, 0.5, 120]}
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

      {/* HDRI: lower environmentIntensity so directional shadows read on PBR materials */}
      <Environment
        files="/assets/qwantani_sunset_puresky_1k.hdr"
        background
        environmentIntensity={0.22}
        backgroundIntensity={0.88}
      />

      <Island />

      <Character groupRef={characterRef} moveTargetRef={moveTargetRef} />
      <ClickToMove targetRef={moveTargetRef} />
      <CharacterOrbitCamera followRef={characterRef} heightOffset={0.85} distance={1.7} />
    </>
  )
}
