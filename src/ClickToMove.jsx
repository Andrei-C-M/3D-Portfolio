import { useClickToMove } from './hooks/useClickToMove'

/** Registers click-to-move on the canvas (must be inside Canvas). */
export default function ClickToMove({ targetRef }) {
  useClickToMove(targetRef)
  return null
}
