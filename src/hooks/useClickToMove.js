import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import { usePanel } from '../context/PanelContext.jsx'

/**
 * Raycasts often hit a child mesh (e.g. a cube) while the “real” data lives on a parent Group.
 * We walk up the scene graph until we find `userData.externalUrl` — that’s how Blender empties
 * with URL metadata still work without tagging every child.
 */
function findExternalUrl(object) {
  let o = object
  while (o) {
    if (typeof o.userData?.externalUrl === 'string') {
      return o.userData.externalUrl
    }
    o = o.parent
  }
  return null
}

/** Same idea as findExternalUrl, but for our slide-out panel id (see interactionConfig). */
function findInteractionPanel(object) {
  let o = object
  while (o) {
    if (
      typeof o.userData?.interactionPanel === 'string' &&
      o.userData.interactionPanel.length > 0
    ) {
      return o.userData.interactionPanel
    }
    o = o.parent
  }
  return null
}

/**
 * Canvas click handler: figure out what you clicked, then either open a panel, open a tab,
 * or treat it as “walk here”.
 *
 * A **Raycaster** is Three’s way of shooting a ray from the camera through the mouse/finger
 * and collecting every mesh that intersects it, sorted by distance. That’s how we know if
 * you clicked the ground, the book, or the character.
 */
export function useClickToMove(targetRef) {
  const { camera, gl, scene } = useThree()
  const { openPanel } = usePanel()
  const raycaster = useMemo(() => new Raycaster(), [])
  // Normalized device coordinates (-1..1): required by Raycaster.setFromCamera
  const pointer = useMemo(() => new Vector2(), [])

  useEffect(() => {
    const el = gl.domElement

    const onClick = (e) => {
      const rect = el.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      // `true` = recurse into children (deep island hierarchy)
      const hits = raycaster.intersectObjects(scene.children, true)

      // First hit wins: if something interactive is in front, don’t move the character.
      for (const h of hits) {
        if (!h.object.visible) continue
        const panelId = findInteractionPanel(h.object)
        if (panelId) {
          openPanel(panelId)
          return
        }
        const url = findExternalUrl(h.object)
        if (url && url.length > 0) {
          window.open(url, '_blank', 'noopener,noreferrer')
          return
        }
      }

      const hit = hits.find(
        (h) =>
          h.object.visible &&
          !h.object.userData.isCharacter &&
          h.object.name !== 'water' &&
          !h.object.isWater,
      )
      if (hit) {
        targetRef.current.set(hit.point.x, hit.point.y, hit.point.z)
      }
    }

    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [camera, gl, scene, raycaster, pointer, targetRef, openPanel])
}
