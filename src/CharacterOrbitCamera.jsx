import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE, TOUCH, Vector3 } from 'three'

/**
 * Orbits around the character with a fixed radius.
 * - Desktop: middle mouse = rotate; left click stays free for click-to-move.
 * - Touch: one finger = move only (tap/drag passes through to click-to-move);
 *   two-finger drag = rotate (DOLLY_ROTATE with zoom off → rotate only).
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
    // Mouse: left = no-op (4), middle = orbit — keep click-to-move on left button
    c.mouseButtons = { LEFT: 4, MIDDLE: MOUSE.ROTATE, RIGHT: 4 }
    // Touch: ONE=PAN with enablePan=false → early return, no steal from taps
    // TWO=DOLLY_ROTATE with enableZoom=false → two-finger rotate only
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }
  }, [])

  // Rough isometric starting view (same direction as before: 10,12,10)
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
