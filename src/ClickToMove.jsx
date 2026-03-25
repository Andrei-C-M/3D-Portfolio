import { useClickToMove } from './hooks/useClickToMove'

/**
 * Tiny wrapper so Scene.jsx stays declarative. Hooks must run inside the R3F `<Canvas>` tree,
 * so we can’t put useClickToMove in App.jsx — this component renders nothing but registers the
 * listener on the WebGL canvas.
 */
export default function ClickToMove({ targetRef }) {
  useClickToMove(targetRef)
  return null
}
