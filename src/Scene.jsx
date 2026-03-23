import { useEffect, useRef } from 'react'
import { Environment, OrbitControls } from '@react-three/drei'
import Island from './Island'

/**
 * Scene: lights, ground plane, island model, and orbit controls.
 */
export default function Scene() {
  const sunRef = useRef(null)

  // Widen the directional light’s shadow frustum + sharper map (defaults are tiny / low-res)
  useEffect(() => {
    const L = sunRef.current
    if (!L?.shadow) return
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
  }, [])

  return (
    <>
      {/* Ground receives shadows from the island */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#3b7d2a" />
      </mesh>

      {/* Low fill — high ambient + IBL hides shadow contrast */}
      <ambientLight intensity={0.18} />
      <hemisphereLight
        skyColor="#87ceeb"
        groundColor="#2a1f14"
        intensity={0.28}
      />
      {/* Target must be in the scene graph or directional shadows won’t update correctly */}
      <directionalLight
        ref={sunRef}
        position={[18, 28, 14]}
        intensity={1.1}
        color="#fff8ed"
        castShadow
      >
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

      <Environment preset="sunset" environmentIntensity={0.38} />

      <Island />

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
      />
    </>
  )
}
