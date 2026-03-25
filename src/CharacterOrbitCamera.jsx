import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE, TOUCH, Vector3 } from 'three'

/**
 * Camera follows the character at a fixed distance (third-person or isometricstyle). Left click is for
 * walking, not rotating. Only middle mouse (or two fingers on touch) spins the view.
 */
export default function CharacterOrbitCamera({
  followRef,
  heightOffset = 0.85,
  distance = 1.7,
}) {
  const orbitRef = useRef(null)
  const didInit = useRef(false)

  useEffect(() => {
    const c = orbitRef.current
    if (!c) return
    c.mouseButtons = { LEFT: 4, MIDDLE: MOUSE.ROTATE, RIGHT: 4 }
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }
  }, [])

  useEffect(() => {
    const ctrl = orbitRef.current
    if (!ctrl || didInit.current) return
    const look = new Vector3(0, heightOffset, 0)
    const dir = new Vector3(10, 12, 10).normalize().multiplyScalar(distance)
    ctrl.target.copy(look)
    ctrl.object.position.copy(look).add(dir)
    ctrl.update()
    didInit.current = true
  }, [distance, heightOffset])

  // Every frame, keep the orbit target glued to the character (slightly above ground).
  // I need to adjust this later because the camera sometimes acts very weird
  useFrame(() => {
    const ctrl = orbitRef.current
    const t = followRef?.current
    if (!ctrl || !t) return
    ctrl.target.set(t.position.x, t.position.y + heightOffset, t.position.z)
  }, -2)

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enableZoom={false}
      enablePan={false}
      enableRotate
      enableDamping
      dampingFactor={0.08}
      minDistance={distance}
      maxDistance={distance}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.08}
    />
  )
}
