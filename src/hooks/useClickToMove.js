import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Vector2 } from 'three'
import { usePanel } from '../context/PanelContext.jsx'

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
 * On canvas click, raycast into the scene and write the hit point into targetRef (Vector3).
 * `interactionPanel` opens the side drawer; `externalUrl` opens a new tab.
 */
export function useClickToMove(targetRef) {
  const { camera, gl, scene } = useThree()
  const { openPanel } = usePanel()
  const raycaster = useMemo(() => new Raycaster(), [])
  const pointer = useMemo(() => new Vector2(), [])

  useEffect(() => {
    const el = gl.domElement

    const onClick = (e) => {
      const rect = el.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)

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
