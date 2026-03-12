import { useEffect, useRef, useMemo } from 'react'
import { Environment, OrbitControls, useGLTF } from '@react-three/drei'
import { Box3, Vector3 } from 'three'

/**
 * House: loads the GLB model, recenters it at the origin, scales it to a
 * reasonable size, and rests its base on the grid.
 */
function House() {
  const { scene } = useGLTF('/assets/house.glb')
  const groupRef = useRef()

  // Compute bounding box once: re-center horizontally and keep base on grid
  const { scale } = useMemo(() => {
    const box = new Box3().setFromObject(scene)
    const center = new Vector3()
    const size = new Vector3()
    box.getCenter(center)
    box.getSize(size)

    // Move model so its bottom sits at y = 0 and it's centered in X/Z
    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y -= box.min.y

    // Scale model so its largest dimension is about 4 units
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const desiredSize = 4
    const s = desiredSize / maxDim

    return { scale: s }
  }, [scene])

  // Apply the computed scale to the whole group
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.scale.set(scale, scale, scale)
    }
  }, [scale])

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <primitive object={scene} />
    </group>
  )
}

/**
 * Scene: lights, ground plane, house, and orbit controls.
 */
export default function Scene() {
  return (
    <>
      {/* Simple green ground plane that looks like grass */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#3b7d2a" />
      </mesh>

      {/* Soft sky fill light */}
      <ambientLight intensity={0.5} />
      {/* Sunlight: warm directional light from above/right */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={1.5}
        color="#ffe9c4"
        castShadow
      />

      <Environment preset="sunset" />

      <House />

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
