import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

/**
 * React context for the HTML side popup window ( separate from the WebGL scene).
 *
 * The click handler is inside the Canvas (useClickToMove), but the panel
 * itself is a normal DOM component next to `<Canvas>` in App.jsx. Context lets both layers
 * share “which windowis open” without props through every parent.
 */
const PanelContext = createContext(null)

export function PanelProvider({ children }) {
  const [openPanelId, setOpenPanelId] = useState(null)
  const openPanel = useCallback((id) => setOpenPanelId(id), [])
  const closePanel = useCallback(() => setOpenPanelId(null), [])

  const value = useMemo(
    () => ({ openPanelId, openPanel, closePanel }),
    [openPanelId, openPanel, closePanel],
  )

  return (
    <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
  )
}

export function usePanel() {
  const ctx = useContext(PanelContext)
  if (!ctx) {
    throw new Error('usePanel must be used within PanelProvider')
  }
  return ctx
}
