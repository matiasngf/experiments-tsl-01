"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { WebGPURenderer, MeshBasicNodeMaterial } from "three/webgpu";
import { color, uv, mix, sin, float } from "three/tsl";
import { useUniforms } from "@/lib/tsl";
import { Color } from "three";

export default function TSLUniformsPage() {
  return (
    <div className="w-screen h-screen bg-zinc-950">
      <Canvas
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

function Scene() {
  return (
    <>
      <AnimatedGradient />
    </>
  );
}

/**
 * Demonstrates the useUniforms hook for TSL.
 * Creates an animated gradient that shifts colors over time.
 */
function AnimatedGradient() {
  // Create typed TSL uniform nodes using the hook
  const uniforms = useUniforms({
    time: 0,
    colorA: new Color(0xff6b6b), // coral red
    colorB: new Color(0x4ecdc4), // teal
    colorC: new Color(0xffe66d), // yellow
    speed: 0.5,
  });

  // Update time uniform each frame
  useFrame(({ clock }) => {
    uniforms.time.value = clock.elapsedTime;
  });

  // Create material using the uniforms
  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();

    // Animated mix factor based on time
    const wave = sin(uniforms.time.mul(uniforms.speed)).mul(0.5).add(0.5);

    // First mix: colorA to colorB based on UV.x
    const horizontalGradient = mix(uniforms.colorA, uniforms.colorB, uv().x);

    // Second mix: blend with colorC based on time
    const animatedGradient = mix(horizontalGradient, uniforms.colorC, wave);

    // Add vertical variation
    const verticalInfluence = uv().y.mul(float(0.3));
    mat.colorNode = mix(
      animatedGradient,
      color(0x2d3436), // dark gray
      verticalInfluence
    );

    return mat;
  }, [uniforms]);

  return (
    <mesh material={material}>
      <planeGeometry args={[4, 4]} />
    </mesh>
  );
}

