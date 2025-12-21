"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense } from "react";
import { WebGPURenderer, MeshPhysicalNodeMaterial } from "three/webgpu";
import {
  color,
  uv,
  mix,
  vec3,
  mx_fractal_noise_float,
  smoothstep,
  float,
} from "three/tsl";
import { useUniforms, useMaterial } from "@/lib/tsl";
import { Color } from "three";

export default function TSLMaterialPage() {
  return (
    <div className="w-screen h-screen bg-zinc-950">
      <Canvas
        gl={async (props) => {
          const renderer = new WebGPURenderer(props as never);
          await renderer.init();
          return renderer;
        }}
        camera={{ position: [0, 0, 5], fov: 45 }}
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
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <NoisySphere />
    </>
  );
}

/**
 * Demonstrates the useMaterial hook for TSL.
 * Creates a sphere with animated procedural noise on roughness and color.
 */
function NoisySphere() {
  // Create uniforms for animation
  const uniforms = useUniforms({
    time: 0,
    noiseScale: 3,
    baseColor: new Color(0x6c5ce7), // purple
    accentColor: new Color(0x00cec9), // cyan
  });

  // Use the useMaterial hook to create a NodeMaterial with setup callback
  const material = useMaterial(
    MeshPhysicalNodeMaterial,
    (mat) => {
      // Create 3D noise coordinates that animate over time
      const noiseCoord = vec3(
        uv().mul(uniforms.noiseScale),
        uniforms.time.mul(0.2)
      );

      // Generate fractal noise
      const noise = mx_fractal_noise_float(noiseCoord);

      // Normalize noise from [-1,1] to [0,1]
      const normalizedNoise = noise.mul(0.5).add(0.5);

      // Color: mix between base and accent based on noise
      mat.colorNode = mix(uniforms.baseColor, uniforms.accentColor, normalizedNoise);

      // Roughness: vary with noise for interesting reflections
      mat.roughnessNode = smoothstep(float(0.2), float(0.8), normalizedNoise);

      // Metalness: subtle variation
      mat.metalnessNode = normalizedNoise.mul(0.3);

      // Add some clearcoat for extra shine
      mat.clearcoat = 0.5;
      mat.clearcoatRoughness = 0.2;
    },
    [uniforms]
  );

  // Update time uniform each frame
  useFrame(({ clock }) => {
    uniforms.time.value = clock.elapsedTime;
  });

  return (
    <mesh material={material} rotation={[0.3, 0, 0]}>
      <sphereGeometry args={[1.5, 64, 64]} />
    </mesh>
  );
}

