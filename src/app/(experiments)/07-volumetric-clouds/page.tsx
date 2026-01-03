/* eslint-disable react-hooks/immutability */
"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { renderOutput } from "three/tsl";
import { usePostProcessing } from "@/lib/gpu/use-postprocessing";
import { useBloomPass } from "@/lib/gpu/use-bloom-pass";
import { City } from "./city";
import { LightningSystem } from "./lightning";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export default function VolumetricFogPage() {
  return (
    <div className="w-screen h-screen bg-zinc-950 relative">
      <Canvas
        gl={async (props) => {
          const { WebGPURenderer } = await import("three/webgpu");
          const renderer = new WebGPURenderer(props as never);
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <CopyButton />
    </div>
  );
}

function CopyButton() {
  const handleCopy = () => {
    const data = (window as unknown as { __cameraDebugData: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } }).__cameraDebugData;
    if (!data) {
      console.log("No camera data available yet");
      return;
    }

    const { position: pos, target } = data;
    const output = `Camera Position: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]
Target: [${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)}]`;

    navigator.clipboard.writeText(output);
    console.log(output);
    console.log("\n✓ Copied to clipboard!");
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-4 right-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-sm font-medium transition-colors"
    >
      Copy to Console
    </button>
  );
}

function Scene() {
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Update camera position on every frame
  useFrame(({ camera }) => {
    if (controlsRef.current) {
      const pos = camera.position;
      const target = controlsRef.current.target;
      
      // Update global reference object for the button to access
      (window as unknown as { __cameraDebugData: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } } }).__cameraDebugData = {
        position: { x: pos.x, y: pos.y, z: pos.z },
        target: { x: target.x, y: target.y, z: target.z },
      };
    }
  });

  // Setup postprocessing with bloom
  const { postProcessing, scenePass } = usePostProcessing({ enabled: true });
  const { bloomNode } = useBloomPass(scenePass, {
    strength: 1.5,
    threshold: 0.2,
    radius: 0.6,
  });

  // Configure the postprocessing output with bloom
  useEffect(() => {
    const sceneColor = scenePass.getTextureNode("output");
    postProcessing.outputNode = renderOutput(sceneColor.add(bloomNode));
  }, [postProcessing, scenePass, bloomNode]);

  return (
    <>
      {/* Camera and Controls */}
      <PerspectiveCamera makeDefault position={[6.2, 0.7, 7.7]} fov={40} />
      <OrbitControls
        ref={controlsRef}
        target={[-2.8, 2.0, 3.6]}
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={100}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} color="#334466" />
      <directionalLight
        position={[20, 30, 10]}
        intensity={0.5}
        color="#aabbff"
        castShadow
      />
      <directionalLight
        position={[-10, 20, -20]}
        intensity={0.3}
        color="#ffaa88"
      />

      {/* Add some point lights for city atmosphere */}
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#ff6644" distance={20} />
      <pointLight position={[-5, 3, 5]} intensity={0.3} color="#4466ff" distance={15} />
      <pointLight position={[5, 3, -5]} intensity={0.3} color="#44ff66" distance={15} />

      {/* City Model */}
      <City scale={0.5} />

      {/* Lightning System */}
      <LightningSystem count={10} />

      {/* Black floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#000000" roughness={1} />
      </mesh>
    </>
  );
}

