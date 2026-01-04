 
 
"use client";

/**
 * Raymarching on a mesh surface
 */

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { ComponentRef, Suspense, useRef } from "react";
import { MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";
import { getRayMarchedMaterial } from "./raymarched-material";

export default function SimpleRaymarchingPage() {
  return (
    <div className="w-screen h-screen bg-zinc-950">
      <Canvas
        camera={{position: [1,0,0]}}
        gl={async (props) => {
          const renderer = new WebGPURenderer(props as never);
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

const m = getRayMarchedMaterial()

const m2 = new MeshBasicNodeMaterial({
  color: 'blue',
  wireframe: true
})

function Scene() {

  const cameraRef = useRef<ComponentRef<typeof PerspectiveCamera> | null>(null)

  return (
    <>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0,0,7]} />
      <mesh material={m}>
        <boxGeometry args={[3, 3, 3]} />
      </mesh>
      <mesh material={m2}>
        <boxGeometry args={[3, 3, 3]} />
      </mesh>
    </>
  );
}