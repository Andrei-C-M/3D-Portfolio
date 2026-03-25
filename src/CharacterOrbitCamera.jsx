import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MOUSE, TOUCH, Vector3 } from 'three'

/** Wheel dolly vs default `distance`: min = zoom in closer, max = zoom out farther. */
const ZOOM_MIN_MULT = 0.48
const ZOOM_MAX_MULT = 2.75

/**
 * Camera follows the character at a fixed distance (third-person / isometric).
 * `heightOffset` and `distance` are in world units — they must match the scaled character
 * (~0.05 tall with CHARACTER_SCALE_FACTOR 0.04); values like 0.85 assume human-scale and look “miles away”.
 * Left click: walk. Middle mouse / two-finger: orbit. Wheel: dolly (desktop).
 */
export default function CharacterOrbitCamera({
  followRef,
  heightOffset = 0.07,
  distance = 0.546,
}) {
  const orbitRef = useRef(null)
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

  useLayoutEffect(() => {
    let raf = 0
    const apply = () => {
      const ctrl = orbitRef.current
      if (!ctrl) return
      const look = new Vector3(0, heightOffset, 0)
      const dir = new Vector3(10, 12, 10).normalize().multiplyScalar(distance)
      ctrl.target.copy(look)
      ctrl.object.position.copy(look).add(dir)
      ctrl.update()
    }
    apply()
    if (!orbitRef.current) {
      raf = requestAnimationFrame(apply)
    }
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [distance, heightOffset])

  const minD = wheelZoom ? distance * ZOOM_MIN_MULT : distance
  const maxD = wheelZoom ? distance * ZOOM_MAX_MULT : distance

  // After OrbitControls internal update (-1): glue target to character (same order as before camera tweaks).
  useFrame(() => {
    const ctrl = orbitRef.current
    const t = followRef?.current
    if (!ctrl || !t) return
    const tx = t.position.x
    const ty = t.position.y + heightOffset
    const tz = t.position.z
    if (!Number.isFinite(tx) || !Number.isFinite(ty) || !Number.isFinite(tz)) return
    ctrl.target.set(tx, ty, tz)
  }, -2)

  return (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enableZoom={wheelZoom}
      zoomToCursor={false}
      zoomSpeed={1.25}
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
