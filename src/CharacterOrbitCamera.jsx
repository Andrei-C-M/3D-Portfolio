import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE, TOUCH, Vector3 } from 'three'

/** Dolly (moving the camera forward or backward)range vs default distance (min = closer to character, max = slightly farther). */
const ZOOM_MIN_MULT = 0.48
const ZOOM_MAX_MULT = 1.12

/**
 * Camera follows the character at a fixed distance (third-person or isometricstyle). Left click is for
 * walking. Only middle mouse (or two fingers on touch) spins the view.
 * On desktop, scroll wheel zooms in/out a little (OrbitControls dolly).
 */
export default function CharacterOrbitCamera({
  followRef,
  heightOffset = 0.85,
  distance = 1.7,
}) {
  const orbitRef = useRef(null)
  const didInit = useRef(false)
  const [wheelZoom, setWheelZoom] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const sync = () => setWheelZoom(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const c = orbitRef.current
    if (!c) return
    c.mouseButtons = { LEFT: 4, MIDDLE: MOUSE.ROTATE, RIGHT: 4 }
    c.touches = { ONE: TOUCH.PAN, TWO: TOUCH.DOLLY_ROTATE }
    /* Wheel dolly along camera - orbit target (character) */
    c.zoomToCursor = false
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

  const minD = wheelZoom ? distance * ZOOM_MIN_MULT : distance
  const maxD = wheelZoom ? distance * ZOOM_MAX_MULT : distance

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
      enableZoom={wheelZoom}
      zoomToCursor={false}
      zoomSpeed={0.5}
      enablePan={false}
      enableRotate
      enableDamping
      dampingFactor={0.08}
      minDistance={minD}
      maxDistance={maxD}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.08}
    />
  )
}
