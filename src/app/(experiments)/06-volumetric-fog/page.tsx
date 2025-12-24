/* eslint-disable react-hooks/immutability */
"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { renderOutput } from "three/tsl";
import { usePostProcessing } from "@/lib/gpu/use-postprocessing";
import { useBloomPass } from "@/lib/gpu/use-bloom-pass";
import { City } from "./city";
import { LightningSystem } from "./lightning";

export default function VolumetricFogPage() {
  return (
    <div className="w-screen h-screen bg-zinc-950">
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
    </div>
  );
}

function Scene() {
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
      <PerspectiveCamera makeDefault position={[25, 15, 25]} fov={50} />
      <OrbitControls
        target={[0, 2, 0]}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
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

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#0a0a0f" roughness={0.9} />
      </mesh>
    </>
  );
}

