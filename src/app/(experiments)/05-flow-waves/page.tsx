/* eslint-disable react-hooks/immutability */
 
"use client";

import { Environment, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Vector2 } from "three";
import { useWaves } from "./use-waves";
import { WaterMesh } from "./water-mesh";

export default function FlowWavesPage() {
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
  const {
    uniforms: wavesUniforms,
    render: renderWaves,
    result: wavesResult,
  } = useWaves({
    width: 500,
    height: 500,
  });

  // Mouse tracking refs
  const currentMouseUv = useRef(new Vector2(0, 0));
  const prevMouseUv = useRef(new Vector2(0, 0));
  const mouseVelocity = useRef(0);

  // Run simulation each frame
  useFrame((state, delta) => {
    // Calculate velocity from UV delta
    const dx = currentMouseUv.current.x - prevMouseUv.current.x;
    const dy = currentMouseUv.current.y - prevMouseUv.current.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    // Update velocity with smoothing
    if (speed > mouseVelocity.current) {
      mouseVelocity.current = speed;
    } else {
      mouseVelocity.current *= 0.95;
    }

    // Convert UV (0-1) to NDC (-1 to 1)
    const ndcX = currentMouseUv.current.x * 2 - 1;
    const ndcY = -(currentMouseUv.current.y * 2 - 1); // Flip Y

    // Update wave uniforms
    wavesUniforms.mouseUv.value.set(ndcX, ndcY);
    wavesUniforms.mouseVelocity.value = mouseVelocity.current;

    // Store current as prev for next frame
    prevMouseUv.current.copy(currentMouseUv.current);

    // Render wave simulation
    renderWaves(delta);
    state.gl.render(state.scene, state.camera)
  }, 1);

  const handleMouseMove = (uv: { x: number; y: number }) => {
    currentMouseUv.current.set(uv.x, uv.y);
  };

  return (
    <>
      <OrbitControls target={[0,0,2]} />
      <Environment preset="sunset" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <PerspectiveCamera makeDefault position={[0,5,7]} />

      <WaterMesh
        waveTextures={wavesResult}
        onMouseMove={handleMouseMove}
        width={20}
        height={20}
        scale={3}
      />
    </>
  );
}
