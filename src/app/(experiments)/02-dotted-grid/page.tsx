/* eslint-disable react-hooks/immutability */
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { WebGPURenderer, MeshBasicNodeMaterial, Node } from "three/webgpu";
import { uv, float, smoothstep, mix, renderOutput, vec3, mx_worley_noise_float, uniform } from "three/tsl";
import { usePostProcessing } from "@/lib/gpu/use-postprocessing";
import { useAnime } from "@/lib/anime/use-anime";
import { animate, cubicBezier } from "animejs";
import { useControls } from "leva";
import { useBloomPass } from "@/lib/gpu/use-bloom-pass";
import { useUniforms, useMaterial, cellSampling } from "@/lib/tsl";

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
    threshold: 0.2,
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
  const { viewport } = useThree();

  const aspect = viewport.width / viewport.height;

  // TSL uniforms using useUniforms hook
  const uniforms = useUniforms({
    time: uniform(0),
    reveal: uniform(1),
    dotSize: uniform(0.38),
    gridScale: uniform(50),
    debugBackground: uniform(0),
    aspect: uniform(aspect),
  });

  // Leva controls with onChange for direct uniform updates
  useControls({
    debugBackground: {
      value: false,
      label: "Debug Background",
      onChange: (v: boolean) => {
        uniforms.debugBackground.value = v ? 1 : 0;
      },
    },
    dotSize: {
      value: 0.38,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Dot Size",
      onChange: (v: number) => {
        uniforms.dotSize.value = v;
      },
    },
    gridScale: {
      value: 50,
      min: 2,
      max: 50,
      step: 1,
      label: "Grid Scale",
      onChange: (v: number) => {
        uniforms.gridScale.value = v;
      },
    },
  });

  // Anime.js for smooth animations
  const scope = useAnime({
    methods: {
      reveal: () => {
        return 
        animate(uniforms.reveal, {
          value: 1,
          duration: 2000,
          ease: cubicBezier(0.25, 0.1, 0.25, 1),
        });
        animate(uniforms.gridScale, {
          value: 20,
          duration: 2500,
          ease: cubicBezier(0.25, 0.1, 0.25, 1),
        });
      },
    },
  });

  // Update time and aspect uniforms each frame
  useFrame((state) => {
    uniforms.time.value = state.clock.elapsedTime;
    uniforms.aspect.value = state.viewport.width / state.viewport.height;
  });

  // Create dotted grid material with TSL using useMaterial hook
  const material = useMaterial(
    MeshBasicNodeMaterial,
    (mat) => {
      // Background with small noise for debugging
       
      const backgroundFn = (uvCoord: Node) => {
        // 2D hash: combine x and y with a prime to break correlation
        const scaledUv = uvCoord.mul(100);
        const noise2d = mx_worley_noise_float(scaledUv)
        return vec3(0.1).add(noise2d); // neutral gray + noise
      };

      // Cell sampling for pixelated grid with perfectly square cells
      const { cellCenterUV, localUV } = cellSampling(
        uniforms.gridScale,
        uniforms.aspect
      );

      // Sample background at cell center (pixelation effect)
      const cellColor = backgroundFn(cellCenterUV);

      // Dot SDF with animated size
      const radius = uniforms.dotSize.mul(0.5);
      const dist = localUV.length();
      const dot = smoothstep(radius, radius.sub(0.05), dist);

      // Conditional output: debug shows raw background, normal shows dots
      const dotOutput = cellColor.mul(dot).mul(uniforms.reveal);
      const debugOutput = backgroundFn(uv()).mul(uniforms.reveal);
      const finalColor = mix(dotOutput, debugOutput, uniforms.debugBackground);

      mat.colorNode = finalColor;
      mat.transparent = true;
      mat.opacityNode = mix(dot, float(1), uniforms.debugBackground).mul(
        uniforms.reveal
      );
    },
    [uniforms]
  );

  return (
    <mesh material={material}>
      <planeGeometry args={[viewport.width, viewport.height]} />
    </mesh>
  );
}
