/* eslint-disable react-hooks/immutability */
"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useEffect } from "react";
import { WebGPURenderer, MeshBasicNodeMaterial } from "three/webgpu";
import {
  uv,
  float,
  fract,
  smoothstep,
  uniform,
  color,
  mix,
  renderOutput,
} from "three/tsl";
import { usePostProcessing } from "@/lib/gpu/use-postprocessing";
import { useAnime } from "@/lib/anime/use-anime";
import { animate, cubicBezier } from "animejs";
import { useControls } from "leva";
import { useBloomPass } from "@/lib/gpu/use-bloom-pass";

export default function DottedGridPage() {
  return (
    <div className="w-screen h-screen bg-black">
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
  const { postEnabled } = useControls({
    postEnabled: {
      value: true,
      label: "PostProcessing",
    },
  });
  const { postProcessing, scenePass } = usePostProcessing({
    enabled: postEnabled,
  });

  const { bloomNode } = useBloomPass(scenePass, {
    strength: 0.7,
    threshold: 0.5,
    radius: 0.2,
  });


  // Chain postprocessing passes
  useEffect(() => {
    const sceneColor = scenePass.getTextureNode("output");
    postProcessing.outputNode = renderOutput(sceneColor.add(bloomNode));
  }, [postProcessing, scenePass, bloomNode]);

  return (
    <>
      <DottedGrid />
    </>
  );
}

function DottedGrid() {
  // TSL uniforms for animation
  const dotSize = useMemo(() => uniform(0.3), []);
  const gridScale = useMemo(() => uniform(20), []);
  const time = useMemo(() => uniform(0), []);
  const reveal = useMemo(() => uniform(0), []);

  // Anime.js for smooth animations
  const scope = useAnime({
    methods: {
      reveal: () => {
        animate(reveal, {
          value: 1,
          duration: 2000,
          ease: cubicBezier(0.25, 0.1, 0.25, 1),
        });
        animate(gridScale, {
          value: 20,
          duration: 2500,
          ease: cubicBezier(0.25, 0.1, 0.25, 1),
        });
      },
      pulse: () => {
        animate(dotSize, {
          value: [0.3, 0.5, 0.3],
          duration: 1000,
          ease: "easeInOutQuad",
        });
      },
    },
  });

  // Trigger reveal on mount
  useEffect(() => {
    gridScale.value = 5;
    scope.methods.reveal();
  }, [scope, gridScale]);

  // Update time uniform each frame
  useFrame((state) => {
    time.value = state.clock.elapsedTime;
  });

  // Create dotted grid material with TSL
  const material = useMemo(() => {
    const mat = new MeshBasicNodeMaterial();

    // Grid UV coordinates
    const scaledUv = uv().mul(gridScale);
    const gridUv = fract(scaledUv).sub(0.5);

    // Distance from center of each cell
    const dist = gridUv.length();

    // Animated dot size with subtle time-based pulse
    const pulse = float(1).add(time.mul(2).sin().mul(0.1));
    const animatedDotSize = dotSize.mul(pulse);

    // Create dot with smooth edges
    const dot = smoothstep(animatedDotSize, animatedDotSize.sub(0.05), dist);

    // Color gradient based on position
    const baseColor = color(0x8b5cf6); // violet-500
    const glowColor = color(0xd946ef); // fuchsia-500

    // Mix colors based on UV position for variation
    const colorMix = uv().x.add(uv().y).mul(0.5);
    const finalColor = mix(baseColor, glowColor, colorMix);

    // Apply dot pattern with reveal animation
    mat.colorNode = finalColor.mul(dot).mul(reveal);

    // Transparent background
    mat.transparent = true;
    mat.opacityNode = dot.mul(reveal);

    return mat;
  }, [dotSize, gridScale, time, reveal]);

  return (
    <mesh material={material} onClick={() => scope.methods.pulse()}>
      <planeGeometry args={[10, 10]} />
    </mesh>
  );
}

