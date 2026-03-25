import { useClickToMove } from './hooks/useClickToMove'

/**
 * I had to put the click code in a separate componentbecause React hooks (like 
 *  * useClickToMove hook) only work *inside* the 3D Canvas, not in the App.jsx above it. This file
 * doesn’t draw anything on screen; it just hooks up “when you click the canvas, do <something>.”
 */
export default function ClickToMove({ targetRef }) {
  useClickToMove(targetRef)
  return null
}
