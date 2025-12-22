/* eslint-disable react-hooks/immutability */
"use client";

import {
  useDoubleFbo,
  useMaterial,
  useQuadShader,
  useUniforms,
} from "@/lib/tsl";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Vector2 } from "three";
import {
  abs,
  clamp,
  float,
  Fn,
  length,
  mix,
  screenSize,
  smoothstep,
  texture,
  uniform,
  uniformTexture,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";

export default function FlowWavesPage() {
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

const RENDERS_PER_FRAME = 4;
const PI = Math.PI;

function Scene() {
  const { size } = useThree();
  const drawFbo = useDoubleFbo();
  const lastMousePosition = useRef(new Vector2(0, 0));
  const mouseVelocity = useRef(0);
  const mouseDirection = useRef(new Vector2(0, 0));
  const frameCount = useRef(0);

  const uniforms = useUniforms(() => ({
    feedbackMap: uniformTexture(drawFbo.read.texture),
    mouseUv: uniform(vec2(0)),
    mouseVelocity: uniform(0),
    mouseDirection: uniform(vec2(0, 1)),
    frame: uniform(0),
    resolution: uniform(vec2(size.width, size.height)),
  }));

  // Update resolution when size changes
  uniforms.resolution.value.set(size.width, size.height);

  const drawMaterial = useMaterial(
    MeshBasicNodeMaterial,
    (mat) => {
      const colorFn = Fn(() => {
        const frame = uniforms.frame;
        const resolution = uniforms.resolution;

        // Texel size
        const e = vec3(vec2(1.0).div(resolution), float(0));
        const q = uv();

        // Sample current and neighbors from feedback texture (flipY for correct orientation)
        const c = texture(uniforms.feedbackMap, q.flipY());

        const p11 = c.y; // Previous height stored in y channel

        // Sample neighbors
        const p10 = texture(uniforms.feedbackMap, q.flipY().sub(e.zy)).x;
        const p01 = texture(uniforms.feedbackMap, q.flipY().sub(e.xz)).x;
        const p21 = texture(uniforms.feedbackMap, q.flipY().add(e.xz)).x;
        const p12 = texture(uniforms.feedbackMap, q.flipY().add(e.zy)).x;

        // Wave propagation equation
        // d = -(p11 - 0.5) * 2.0 + (p10 + p01 + p21 + p12 - 2.0)
        const waveBase = p11
          .sub(0.5)
          .mul(-2.0)
          .add(p10.add(p01).add(p21).add(p12).sub(2.0));

        // === Mouse Wave Calculation ===
        const mousePos = uniforms.mouseUv;
        const mouseDir = uniforms.mouseDirection;
        const mouseInfluence = smoothstep(
          float(0.01),
          float(1.7),
          uniforms.mouseVelocity
        );
        const clampedMouseInfluence = clamp(mouseInfluence, float(0.1), float(1.0));

        const mouseRadius = mix(float(0.02), float(0.1), clampedMouseInfluence);
        const invertedRadius = float(1.0).div(mouseRadius);

        // Adjust UV for aspect ratio
        const aspectFix = screenSize.x.div(screenSize.y);
        const adjustedUv = vec2(q.x.mul(aspectFix), q.y);
        const adjustedMousePos = vec2(
          mousePos.x.add(1).mul(0.5).mul(aspectFix),
          mousePos.y.negate().add(1).mul(0.5)
        );

        // Distance to mouse (chained operations)
        const mouseDistRaw = length(adjustedUv.sub(adjustedMousePos))
          .div(mouseRadius)
          .clamp(0, 1);
        const mouseDist = float(1).sub(mouseDistRaw);

        const stepMouse = smoothstep(float(0), float(0.6), mouseDist);

        // Directional distance for wave shape (negate X to match screen space)
        const adjustedMouseDir = vec2(mouseDir.x.negate().mul(aspectFix), mouseDir.y);
        const dirMouseDistRaw = adjustedMouseDir
          .dot(adjustedUv.sub(adjustedMousePos))
          .mul(invertedRadius)
          .mul(PI)
          .clamp(-PI, PI);
        const dirMouseDist = dirMouseDistRaw.sin();

        const mouseWave = dirMouseDist.mul(stepMouse);

        // Mouse mixer
        const mouseMixer = clamp(
          uniforms.mouseVelocity.mul(2.0),
          float(0),
          float(1)
        ).mul(mix(stepMouse, mouseDist, float(0.5)));

        // Add mouse wave (only negative waves for pushing down)
        const mouseContribution = mouseWave.mul(0.1).mul(mouseMixer);
        const waveWithMouse = waveBase.add(
          mouseWave.lessThan(0).select(mouseContribution, float(0))
        );

        // Damping
        const waveDamped = waveWithMouse.mul(0.99);

        // Edge damping (chained)
        const flowEdge = 0.1;
        const edgeX1 = smoothstep(float(0), float(flowEdge), q.x);
        const edgeX2 = smoothstep(float(1), float(1.0 - flowEdge), q.x);
        const edgeY1 = smoothstep(float(1), float(1.0 - flowEdge), q.y);
        const edgeY2 = smoothstep(float(0), float(flowEdge), q.y);
        const edge = float(1).sub(edgeX1.mul(edgeX2).mul(edgeY1).mul(edgeY2));
        const waveEdgeDamped = mix(waveDamped, float(0), edge);

        // Clamp minimum to avoid too much noise
        const waveClamped = waveEdgeDamped

        // Remap from -1..1 to 0..1
        const waveRemapped = waveClamped.mul(0.5).add(0.5);

        // Store current value in x, previous in y (for wave propagation)
        const result = vec4(waveRemapped, c.x, float(0), float(1));

        // Initialize to neutral on first frames
        const initColor = vec4(0.5, 0.5, 0, 1);
        return frame.lessThan(3).select(initColor, result);
      });

      mat.colorNode = colorFn();
    },
    [uniforms]
  );

  // Screen display material with coloring
  const screenUniforms = useUniforms(() => ({
    map: uniformTexture(drawFbo.texture),
  }));

  const screenMaterial = useMaterial(
    MeshBasicNodeMaterial,
    (mat) => {
      const colorFn = Fn(() => {
        const sample = texture(screenUniforms.map, uv());

        // Convert height to visual representation
        // Height is stored in x channel, centered around 0.5
        const height = sample.x.sub(0.5).mul(2.0); // -1 to 1 range

        // Create gradient based on height
        // Deep teal for valleys, bright cyan for peaks
        const deepColor = vec3(0.02, 0.08, 0.15);
        const midColor = vec3(0.05, 0.2, 0.35);
        const highColor = vec3(0.1, 0.85, 0.95);
        const peakColor = vec3(0.95, 0.98, 1.0);

        // Smooth interpolation between colors
        const normalizedHeight = height.mul(0.5).add(0.5); // 0 to 1

        const belowMid = smoothstep(float(0), float(0.5), normalizedHeight);
        const aboveMid = smoothstep(float(0.5), float(0.8), normalizedHeight);
        const peak = smoothstep(float(0.8), float(1.0), normalizedHeight);

        const col1 = mix(deepColor, midColor, belowMid);
        const col2 = mix(col1, highColor, aboveMid);
        const col3 = mix(col2, peakColor, peak);

        // Add subtle gradient based on wave derivative (approximated from height)
        const intensity = abs(height).mul(0.5).add(0.5);
        const finalCol = col3.mul(intensity.add(0.5));

        return vec4(finalCol, float(1));
      });

      mat.colorNode = colorFn();
    },
    [screenUniforms]
  );

  const drawApi = useQuadShader({
    material: drawMaterial,
    renderTarget: drawFbo,
    autoRender: true,
    autoSwap: true,
    beforeRender: () => {
      uniforms.feedbackMap.value = drawFbo.read.texture;
    },
  });

  useFrame((state, delta) => {
    const currentMousePosition = state.pointer;
    const lastPos = lastMousePosition.current;

    // Calculate velocity (distance moved this frame)
    const dx = currentMousePosition.x - lastPos.x;
    const dy = currentMousePosition.y - lastPos.y;
    const velocity = Math.sqrt(dx * dx + dy * dy) / delta;

    // Smooth velocity
    mouseVelocity.current = mouseVelocity.current * 0.9 + velocity * 0.1;

    // Update direction (normalized)
    if (velocity > 0.001) {
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        mouseDirection.current.set(dx / len, dy / len);
      }
    }

    // Update uniforms
    uniforms.mouseVelocity.value = mouseVelocity.current;
    uniforms.mouseDirection.value.set(
      mouseDirection.current.x,
      mouseDirection.current.y
    );
    uniforms.frame.value = frameCount.current;

    // Render multiple times per frame for smooth mouse trails
    for (let i = 0; i < RENDERS_PER_FRAME; i++) {
      const t = (i + 1) / RENDERS_PER_FRAME;
      const interpolatedX = lastPos.x + (currentMousePosition.x - lastPos.x) * t;
      const interpolatedY = lastPos.y + (currentMousePosition.y - lastPos.y) * t;

      uniforms.mouseUv.value.set(interpolatedX, interpolatedY);
      drawApi.render(delta);
    }

    // Update last mouse position
    lastMousePosition.current.set(currentMousePosition.x, currentMousePosition.y);
    frameCount.current++;
  }, 1);

  // Render to screen
  useQuadShader({
    material: screenMaterial,
    renderTarget: null,
    beforeRender: () => {
      screenUniforms.map.value = drawFbo.read.texture;
    },
    priority: 2,
  });

  return null;
}
