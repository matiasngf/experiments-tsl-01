/* eslint-disable react-hooks/immutability */
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { WebGPURenderer, MeshBasicNodeMaterial, Node } from "three/webgpu";
import { uv, float, smoothstep, mix, renderOutput, hash, vec2, vec3, mx_worley_noise_float, abs, fract, floor, Fn, cos, sin } from "three/tsl";
import { usePostProcessing } from "@/lib/gpu/use-postprocessing";
import { useAnime } from "@/lib/anime/use-anime";
import { animate, cubicBezier } from "animejs";
import { useControls, button } from "leva";
import { useBloomPass } from "@/lib/gpu/use-bloom-pass";
import { useUniforms, useMaterial, cellSampling, rotateUV } from "@/lib/tsl";
import MathNode from "three/src/nodes/math/MathNode.js";
import OperatorNode from "three/src/nodes/math/OperatorNode.js";

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULTS = {
  dotSize: 0.48,
  gridScale: 50,
  lineCount: 4,
  lineAngle: 50, // degrees
  lineWidth: 1.1,
  debugBackground: false,
};

// ============================================================================
// Diagonal Line Sampling - Local to this experiment
// ============================================================================

interface DiagonalLineSamplingResult {
  sampledUV: Node;
  cellIndex: MathNode;
  localUV: Node;
  rotatedUV: OperatorNode;
}

/**
 * Creates diagonal line sampling by rotating UV and compressing Y axis.
 * Rotates UV, compresses Y to 0, and samples a grid for stripe patterns like /////
 */
function diagonalLineSampling(
  angle: number | Node,
  divisions: Node,
  aspect: Node
): DiagonalLineSamplingResult {
  // Rotate UV around center
  const rotatedUV = rotateUV(uv(), angle);

  // Compress Y to 0 - creates uniform vertical stripes in rotated space
  // which appear as diagonal stripes in screen space
  const compressedUV = vec2(rotatedUV.x, float(0.5));

  // Scale by divisions (account for aspect ratio for uniform spacing)
  const xDivisions = divisions.mul(aspect);
  const scaledX = compressedUV.x.mul(xDivisions);

  // Cell index (which stripe we're in)
  const cellIndex = floor(scaledX);

  // Local UV within stripe (-0.5 to 0.5)
  const localX = fract(scaledX).sub(0.5);
  const localUV = vec2(localX, float(0));

  // Sampled UV (center of each stripe)
  const sampledUV = cellIndex.add(0.5).div(xDivisions);

  return {
    sampledUV,
    cellIndex,
    localUV,
    rotatedUV,
  };
}

// ============================================================================

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
    time: 0,
    reveal: 1,
    dotSize: DEFAULTS.dotSize,
    gridScale: DEFAULTS.gridScale,
    debugBackground: DEFAULTS.debugBackground ? 1 : 0,
    aspect: aspect,
    // Diagonal lines
    lineCount: DEFAULTS.lineCount,
    lineWidth: DEFAULTS.lineWidth,
    lineAngle: (DEFAULTS.lineAngle * Math.PI) / 180,
  });

  // Leva controls with onChange for direct uniform updates
  useControls(() => ({
    debugBackground: {
      value: DEFAULTS.debugBackground,
      label: "Debug Background",
      onChange: (v: boolean) => {
        uniforms.debugBackground.value = v ? 1 : 0;
      },
    },
    dotSize: {
      value: DEFAULTS.dotSize,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Dot Size",
      onChange: (v: number) => {
        uniforms.dotSize.value = v;
      },
    },
    gridScale: {
      value: DEFAULTS.gridScale,
      min: 2,
      max: 50,
      step: 1,
      label: "Grid Scale",
      onChange: (v: number) => {
        uniforms.gridScale.value = v;
      },
    },
    lineCount: {
      value: DEFAULTS.lineCount,
      min: 2,
      max: 40,
      step: 1,
      label: "Line Count",
      onChange: (v: number) => {
        uniforms.lineCount.value = v;
      },
    },
    lineAngle: {
      value: DEFAULTS.lineAngle,
      min: 0,
      max: 90,
      step: 1,
      label: "Line Angle (deg)",
      onChange: (v: number) => {
        uniforms.lineAngle.value = (v * Math.PI) / 180;
      },
    },
    "Copy Settings": button((get) => {
      const settings = {
        dotSize: get("dotSize"),
        gridScale: get("gridScale"),
        lineCount: get("lineCount"),
        lineAngle: get("lineAngle"),
      };
      navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
      console.log("Settings copied to clipboard:", settings);
    }),
  }));

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
      // === Background with diagonal stripes ===
      // This gets sampled at cell centers for the pixelation effect
      const backgroundFn = Fn(([uvCoord]: [Node]) => {
        // Correct UV to square coordinate space before rotation
        // This ensures the angle stays visually consistent regardless of aspect ratio
        const squareUV = vec2(
          uvCoord.x.sub(0.5).mul(uniforms.aspect),
          uvCoord.y.sub(0.5)
        );
        
        // Rotate in square space (angle is now visually accurate)
        const cosA = cos(uniforms.lineAngle);
        const sinA = sin(uniforms.lineAngle);
        const rotatedX = squareUV.x.mul(cosA).sub(squareUV.y.mul(sinA));
        const rotatedY = squareUV.x.mul(sinA).add(squareUV.y.mul(cosA));
        
        // Scale for line count (no need for additional aspect correction)
        const scaledX = rotatedX.mul(uniforms.lineCount);
        const lineLocalX = fract(scaledX).sub(0.5);
        const lineLocalY = rotatedY;
        const lineCellIndex = floor(scaledX);

        // Stripe SDF
        const halfWidth = uniforms.lineWidth.mul(0.5);
        const stripeDistance = abs(lineLocalX);
        const stripe = smoothstep(halfWidth, halfWidth.sub(0.02), stripeDistance);

        // Random brightness per stripe using line index
        // Use abs() since lineCellIndex can be negative in centered coordinate space
        const lineHash = hash(abs(lineCellIndex).add(1)).pow(1)

        // Base noise
        const scaledUv = uvCoord.mul(100);
        const noise2d = mx_worley_noise_float(scaledUv);

        // Combine: stripes with random hash brightness
        const stripeColor = vec3(1).mul(stripe).mul(lineHash);
        const baseColor = vec3(0.1).add(noise2d.mul(0.1));

        const diagonalLight = lineLocalY.remapClamp(1, 0, 1, 0).pow(3)
        stripeColor.mulAssign(diagonalLight);
        stripeColor.mulAssign(lineLocalX.mul(2).oneMinus())

        return vec3(stripeColor)

        return mix(baseColor, stripeColor.add(baseColor), stripe);
      });

      // Cell sampling for pixelated grid with perfectly square cells
      const { cellCenterUV, localUV } = cellSampling(
        uniforms.gridScale,
        uniforms.aspect
      );

      // Sample background at cell center (pixelation effect)
      // The diagonal stripes are now part of this sampled background
      const cellColor = backgroundFn(cellCenterUV);

      // Dot SDF with animated size
      const radius = uniforms.dotSize.mul(0.5);
      const dist = localUV.length();
      const dot = smoothstep(radius, radius.sub(0.05), dist);

      // Final output: dots sample the background (with stripes baked in)
      const dotOutput = cellColor.mul(dot);

      // Conditional output: debug shows raw background, normal shows dots
      const debugOutput = backgroundFn(uv()).mul(uniforms.reveal);
      const finalColor = mix(dotOutput.mul(uniforms.reveal), debugOutput, uniforms.debugBackground);

      mat.colorNode = finalColor;
      mat.transparent = true;
      mat.opacityNode = mix(dot, float(1), uniforms.debugBackground).mul(uniforms.reveal);
    },
    [uniforms]
  );

  return (
    <mesh material={material}>
      <planeGeometry args={[viewport.width, viewport.height]} />
    </mesh>
  );
}
