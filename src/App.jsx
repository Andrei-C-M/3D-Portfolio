import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFShadowMap, SRGBColorSpace } from 'three'
import { PanelProvider } from './context/PanelContext.jsx'
import SidePanel from './SidePanel.jsx'
import Scene from './Scene'

/** Full-screen message while `useGLTF` and textures are still downloading. */
function Loader() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: '#fff',
        fontSize: 18,
        fontFamily: 'system-ui, sans-serif',
        zIndex: 10,
      }}
    >
      Loading 3D scene…
    </div>
  )
}

/**
 * Root of the app: normal React DOM wraps everything.
 *
 * - `PanelProvider` must wrap both `<Canvas>` and `<SidePanel>` so hooks inside the 3D tree
 *   can open the HTML drawer/window thingy.
 * - `<Canvas>` from React Three Fiber creates the WebGL context; everything 3D lives under
 *   `<Scene />`. 
 */
export default function App() {
  return (
    <PanelProvider>
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#0a0a0f',
          position: 'relative',
          cursor: 'crosshair',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            color: '#fff',
            fontSize: 14,
            fontFamily: 'system-ui, sans-serif',
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          Tap / click land to move · Two-finger drag: rotate · Middle mouse: rotate (desktop)
        </div>
        <Suspense fallback={<Loader />}>
          <Canvas
            shadows
            camera={{ position: [4, 3, 6], fov: 45 }}
            gl={{
              antialias: true,
              outputColorSpace: SRGBColorSpace,
              toneMappingExposure: 0.82,
            }}
            onCreated={({ gl }) => {
              gl.shadowMap.type = PCFShadowMap
            }}
          >
            <Scene />
          </Canvas>
        </Suspense>
        <SidePanel />
      </div>
    </PanelProvider>
  )
}
