/* eslint-disable react-hooks/immutability */
 
"use client";

/**
 * Raymarching as a postprocessign step
 * 
 * Disadvantage: cannot interact with transparent objects (enable the second mesh to test)
 */

import { usePostProcessing } from "@/lib/gpu/use-postprocessing";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { ComponentRef, Suspense, useEffect, useRef } from "react";
import { Camera, MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";
import { useRaymarchingPass } from "./raymarching-pass";

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

const m = new MeshBasicNodeMaterial({
  color: 'red',
  wireframe: true,
})

const m2 = new MeshBasicNodeMaterial({
  transparent: true,
  opacity: 0.5,
  color: 'blue'
})

function Scene() {

  const { postProcessing, scenePass } = usePostProcessing({ enabled: true });

  const [raymarchingPass] = useRaymarchingPass(scenePass.getTextureNode('output'), scenePass.getTextureNode('depth'))

  useEffect(() => {
    postProcessing.outputNode = raymarchingPass()
    postProcessing.needsUpdate = true;
  }, [postProcessing, raymarchingPass]);

  const cameraRef = useRef<ComponentRef<typeof PerspectiveCamera> | null>(null)

  return (
    <>
      <OrbitControls camera={cameraRef.current as Camera} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[5,5,5]} />
      <mesh material={m}>
        <sphereGeometry args={[2.015, 64, 32]} />
      </mesh>
      <mesh material={m2} visible={false}>
        <sphereGeometry args={[3]} />
      </mesh>
    </>
  );
}