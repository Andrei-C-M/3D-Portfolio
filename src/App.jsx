import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap, SRGBColorSpace } from 'three'
import Scene from './Scene'

/** Shown while the GLB and other async assets are loading (Suspense fallback) */
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
 * App: root UI. We wrap Canvas in Suspense because useGLTF loads the model asynchronously;
 * until it's ready, React shows the Loader. Canvas is the React Three Fiber root that
 * creates the WebGL context and runs the 3D scene (Scene.jsx) inside it.
 */
export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0f' }}>
      <Suspense fallback={<Loader />}>
        <Canvas
          shadows
          camera={{ position: [4, 3, 6], fov: 45 }}
          gl={{
            antialias: true,
            outputColorSpace: SRGBColorSpace,
            toneMappingExposure: 0.72,
          }}
          onCreated={({ gl }) => {
            gl.shadowMap.type = PCFSoftShadowMap
          }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  )
}
