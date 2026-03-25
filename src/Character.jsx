import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, useAnimations, useGLTF } from '@react-three/drei'
import { Box3, LoopRepeat, Raycaster, Vector3 } from 'three'

/** How fast the character slides on XZ axis toward the click target (world units/second). */
const MOVE_SPEED = 0.56
/** Shrinks the raw GLB so the figure matches the island scale. */
const CHARACTER_SCALE_FACTOR = 0.04
/**
 * Fake box radius for collision 
 */
const CHARACTER_RADIUS = 0.048
/** Height for collision detection. */
const COLLISION_HEIGHT = 0.128

function findAction(actions, names, regex) {
  const key = names.find((n) => regex.test(n))
  return key ? actions[key] : null
}

/**
 * Ray hits the topmost surface first. Palm fronds / leaves are often separate meshes and not always
 * tagged as obstacles, so skip vegetation and prop geometry and use the next hit (sand/terrain).
 */
function isNonWalkableGroundSurface(object) {
  if (object.userData.obstacle) return true
  const n = (object.name || '').toLowerCase()
  if (/water|terrain|sand|ground|grass|sea|ocean|beach|island|path/i.test(n)) return false
  /* Terrain rock chunks are walkable; do not match plain "rock" or it hits rocks-sand / rocks-a. */
  if (/rocks-sand|rocks-a|rocks-b|rocks-c/i.test(n)) return false
  return /tree|palm|trunk|leaf|leaves|frond|branch|canopy|bark|vine|pine|fir|bush|hedge|house|home|cottage|cannon|mast|sail|ship|boat|rowboat|wreck|rock|crate|barrel|fence|pier|dock|lamp|plank|campfire|fire|deck|rail|wheel|anchor|book|github|linkedin|giraffe/i.test(
    n,
  )
}

/**
 * True for meshes that are actual island ground / water in our GLBs (not porch props, rocks as props, etc.).
 * New exports often add extra geometry above the sand; we prefer these names when raycasting down.
 */
function isTerrainGroundMesh(object) {
  const n = (object.name || '').toLowerCase()
  if (/water|terrain|sand|beach|ocean|sea|island|path|ground\b/i.test(n)) return true
  if (/patch-|foliage|grass-patch|grass-plant|grass\.|rocks-sand|rocks-a|rocks-b|rocks-c|patch-sand|patch-grass|patch-sand-foliage/i.test(n))
    return true
  if (/^plane\.00|^mesh\.002$/i.test(n)) return true
  return false
}

/**
 * Shoot a ray straight down from high above (x,z) to find ground height.
 * Skips vegetation/props, then prefers terrain-like mesh names so porch props / floating geometry
 * above the sand do not set the character Y. This should prevent the character from climbing trees. 
 */
function getGroundHit(x, z, sceneRoot, raycaster, origin, down) {
  origin.set(x, 80, z)
  down.set(0, -1, 0)
  raycaster.set(origin, down)
  const hits = raycaster.intersectObjects(sceneRoot.children, true)
  const candidates = []
  for (const h of hits) {
    const o = h.object
    if (o.userData.isCharacter) continue
    if (isNonWalkableGroundSurface(o)) continue
    candidates.push(h)
  }
  if (!candidates.length) return null

  const terrainHit = candidates.find((h) => isTerrainGroundMesh(h.object))
  const hit = terrainHit ?? candidates[0]

  const isWater = hit.object.name === 'water' || hit.object.isWater === true
  return { y: hit.point.y, isWater }
}

function snapYToLand(position, sceneRoot, raycaster, origin, down) {
  const g = getGroundHit(position.x, position.z, sceneRoot, raycaster, origin, down)
  if (g && !g.isWater) position.y = g.y
}

/** more mesh collision tests */
function isBlockedAt(x, y, z, obstacleMeshes, tmpBox) {
  const p = new Vector3(x, y + COLLISION_HEIGHT, z)
  for (const mesh of obstacleMeshes) {
    const box = mesh.userData.obstacleBox
    if (!box) continue
    tmpBox.copy(box).expandByScalar(CHARACTER_RADIUS)
    if (tmpBox.containsPoint(p)) return true
  }
  return false
}

/**
* This function shoots a straight line along the path you`re about to walk; if it hits an obstacle mesh before
 * reaching the end, it blocks the move. I had to add this in addition to the collision boxes to prevent the character moving to places it should not.
 */
function segmentHitsObstacle(
  fromX,
  fromY,
  fromZ,
  toX,
  toZ,
  raycaster,
  obstacleMeshes,
) {
  const from = new Vector3(fromX, fromY + COLLISION_HEIGHT, fromZ)
  const to = new Vector3(toX, fromY + COLLISION_HEIGHT, toZ)
  const seg = new Vector3().subVectors(to, from)
  const len = seg.length()
  if (len < 1e-6) return false
  const dir = seg.normalize()
  raycaster.set(from, dir)
  const hits = raycaster.intersectObjects(obstacleMeshes, true)
  if (!hits.length) return false
  return hits[0].distance < len + 0.035
}

/**
 * Loads the  character GLB, scales it, and each frame moves the group toward
 * `moveTargetRef` while staying on land and respecting obstacle boxes from the island props/objects and water.
 */
export default function Character({ groupRef, moveTargetRef }) {
  const { scene, animations } = useGLTF('/assets/character-male-b.glb')
  const { scene: threeScene } = useThree()
  const raycaster = useMemo(() => new Raycaster(), [])
  const origin = useMemo(() => new Vector3(), [])
  const down = useMemo(() => new Vector3(), [])
  const tmpBox = useMemo(() => new Box3(), [])

  const { actions, names } = useAnimations(animations, scene)
  const movingRef = useRef(false)
  const walkRef = useRef(null)
  const idleRef = useRef(null)
  const walkOnlyRef = useRef(false)
  const stuckTimeRef = useRef(0)

  useLayoutEffect(() => {
    if (scene.userData.characterRigged) return
    scene.userData.characterRigged = true

    scene.traverse((o) => {
      if (o.isMesh) {
        o.userData.isCharacter = true
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const mat of mats) {
          if (mat && 'envMapIntensity' in mat) {
            mat.envMapIntensity = Math.min(mat.envMapIntensity ?? 1, 0.55)
          }
        }
      }
    })

    const box = new Box3().setFromObject(scene)
    const center = new Vector3()
    const size = new Vector3()
    box.getCenter(center)
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    const s = (1.15 / maxDim) * CHARACTER_SCALE_FACTOR
    scene.scale.setScalar(s)
    scene.position.sub(center)
    const box2 = new Box3().setFromObject(scene)
    scene.position.y -= box2.min.y
  }, [scene])

  // Keep shadow flags in sync (SkinnedMesh + hot reload; scale does not affect castShadow).
  useLayoutEffect(() => {
    scene.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.receiveShadow = true
    })
  }, [scene])

  useLayoutEffect(() => {
    if (!groupRef.current) return
    const pos = groupRef.current.position
    const spawn = threeScene.userData.characterSpawn
    if (spawn) {
      pos.copy(spawn)
    } else {
      pos.set(0, 0, 0)
    }
    snapYToLand(pos, threeScene, raycaster, origin, down)
    moveTargetRef.current.copy(pos)
  }, [groupRef, threeScene, raycaster, origin, down, moveTargetRef])

  useEffect(() => {
    if (!names.length) return
    walkRef.current =
      findAction(actions, names, /walk|jog|stride|move/i) ||
      findAction(actions, names, /mixamo/i)
    idleRef.current =
      findAction(actions, names, /idle|stand|rest|breath|t-?pose|default/i) ||
      findAction(actions, names, /^idle$/i)

    const idle = idleRef.current
    const walk = walkRef.current
    walkOnlyRef.current = Boolean(walk && !idle)

    if (idle) {
      idle.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.25).play()
    } else if (walk) {
      walk.reset().setLoop(LoopRepeat, Infinity).play()
      walk.timeScale = 0
    }

    return () => {
      idle?.fadeOut(0.15)
      walk?.fadeOut(0.15)
    }
  }, [actions, names])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const obstacleMeshes = threeScene.userData.obstacleMeshes || []

    const pos = group.position
    const target = moveTargetRef.current
    const dx = target.x - pos.x
    const dz = target.z - pos.z
    const dist = Math.hypot(dx, dz)

    const moving = dist > 0.04
    if (moving !== movingRef.current) {
      movingRef.current = moving
      const walk = walkRef.current
      const idle = idleRef.current
      const walkOnly = walkOnlyRef.current
      if (walk || idle) {
        if (moving) {
          idle?.fadeOut(0.2)
          if (walk) {
            walk.timeScale = 1
            walk.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.2).play()
          }
        } else {
          if (walkOnly && walk) {
            walk.timeScale = 0
          } else {
            walk?.fadeOut(0.2)
          }
          if (idle) {
            idle.reset().setLoop(LoopRepeat, Infinity).fadeIn(0.2).play()
          }
        }
      }
    }

    if (dist > 0.04) {
      const prevX = pos.x
      const prevZ = pos.z

      const step = Math.min(MOVE_SPEED * delta, dist)
      const tryX = pos.x + (dx / dist) * step
      const tryZ = pos.z + (dz / dist) * step

      const g = getGroundHit(tryX, tryZ, threeScene, raycaster, origin, down)
      if (g && !g.isWater) {
        const blocked =
          obstacleMeshes.length > 0 &&
          (isBlockedAt(tryX, g.y, tryZ, obstacleMeshes, tmpBox) ||
            segmentHitsObstacle(pos.x, pos.y, pos.z, tryX, tryZ, raycaster, obstacleMeshes))

        if (!blocked) {
          pos.x = tryX
          pos.z = tryZ
          pos.y = g.y
          group.rotation.y = Math.atan2(dx, dz)
        }
      }

      const moved =
        Math.abs(pos.x - prevX) > 1e-5 || Math.abs(pos.z - prevZ) > 1e-5
      if (moved) {
        stuckTimeRef.current = 0
      } else {
        stuckTimeRef.current += delta
        if (stuckTimeRef.current > 0.45) {
          target.copy(pos)
          stuckTimeRef.current = 0
        }
      }
    } else {
      stuckTimeRef.current = 0
      snapYToLand(pos, threeScene, raycaster, origin, down)
    }
  })

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
      {/*
        Directional shadow maps often dissapear under the ground plane. ContactShadows
        renders a local depth pass from above the feet so a soft shadow stays visible on terrain.
      */}
      <ContactShadows
        position={[0, 0.008, 0]}
        opacity={0.58}
        scale={0.95}
        blur={2.1}
        far={1.35}
        resolution={512}
        color="#1e1812"
      />
    </group>
  )
}

useGLTF.preload('/assets/character-male-b.glb')
