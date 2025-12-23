/* eslint-disable react-hooks/immutability */
"use client";

import { useMaterial, useQuadShader, useUniforms } from "@/lib/tsl";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Vector2 } from "three";
import {
  float,
  Fn,
  texture,
  uniformTexture,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import { MeshBasicNodeMaterial } from "three/webgpu";
import { useWaves } from "./use-waves";

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
  const lastMousePosition = useRef(new Vector2(0, 0));
  const mouseVelocity = useRef(0);

  const { uniforms, render, result } = useWaves({
    width: 500,
    height: 500,
  });

  // Screen display material
  const screenUniforms = useUniforms(() => ({
    map: uniformTexture(result.texture),
  }));

  const screenMaterial = useMaterial(
    MeshBasicNodeMaterial,
    (mat) => {
      const colorFn = Fn(() => {
        const sample = texture(screenUniforms.map, uv());
        const height = sample.x;

        // Visualize: Red = positive (peak), Green = negative (trough)
        const scale = float(5.0);
        const positive = height.max(0).mul(scale);
        const negative = height.negate().max(0).mul(scale);

        return vec4(vec3(positive, negative, sample.b), float(1));
      });

      mat.colorNode = colorFn();
    },
    [screenUniforms]
  );

  useFrame((state, delta) => {
    const pointer = state.pointer;
    const lastPos = lastMousePosition.current;

    // Calculate velocity
    const dx = pointer.x - lastPos.x;
    const dy = pointer.y - lastPos.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    // Smooth velocity with fast attack, slow decay
    if (speed > mouseVelocity.current) {
      mouseVelocity.current = speed;
    } else {
      mouseVelocity.current *= 0.95;
    }

    // Update uniforms
    uniforms.mouseVelocity.value = mouseVelocity.current;
    uniforms.mouseUv.value.set(pointer.x, -pointer.y);

    // Run simulation
    render(delta);

    // Update tracking
    lastMousePosition.current.set(pointer.x, pointer.y);
  }, 1);

  // Render to screen
  useQuadShader({
    material: screenMaterial,
    renderTarget: null,
    beforeRender: () => {
      screenUniforms.map.value = result.read.texture;
    },
    priority: 2,
  });

  return null;
}
