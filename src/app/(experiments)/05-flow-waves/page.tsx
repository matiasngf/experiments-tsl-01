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
import { HalfFloatType, NoColorSpace, Vector2 } from "three";
import {
  cos,
  float,
  Fn,
  length,
  mx_noise_float,
  screenSize,
  texture,
  time,
  uniform,
  uniformTexture,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { MeshBasicNodeMaterial, NodeMaterial, WebGPURenderer } from "three/webgpu";

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

// Wave equation parameters
// α² = (c * dt / dx)² - Courant number squared
// For stability in 2D: α² ≤ 0.5
// Higher = faster waves, lower = slower waves
const ALPHA_SQ = 0.5;
const DAMPING = 0.99; // Energy loss per frame (1.0 = no damping)

function Scene() {
  const { size } = useThree();
  const drawFbo = useDoubleFbo({
    type: HalfFloatType,
    colorSpace: NoColorSpace,
  });
  const lastMousePosition = useRef(new Vector2(0, 0));
  const mouseVelocity = useRef(0);
  const frameCount = useRef(0);

  const uniforms = useUniforms(() => ({
    feedbackMap: uniformTexture(drawFbo.read.texture),
    mouseUv: uniform(vec2(0)),
    mouseVelocity: uniform(0),
    frame: uniform(0),
    resolution: uniform(vec2(size.width, size.height)),
  }));

  // Update resolution when size changes
  uniforms.resolution.value.set(size.width, size.height);

  const drawMaterial = useMaterial(
    NodeMaterial,
    (mat) => {
      const colorFn = Fn(() => {
        const resolution = uniforms.resolution;
        const alphaSq = float(ALPHA_SQ);
        const damping = float(DAMPING);

        // Texel size for sampling neighbors
        const texelSize = vec2(1.0).div(resolution);
        const q = uv();
        const sampleUv = q.flipY();

        // Sample current pixel
        // x = u(t) - current height
        // y = u(t-1) - previous height
        const current = texture(uniforms.feedbackMap, sampleUv);
        const u = current.x;
        const u_prev = current.y;

        // Sample 4 neighbors (current height = x channel)
        const u_north = texture(
          uniforms.feedbackMap,
          sampleUv.add(vec2(0, texelSize.y))
        ).x;
        const u_south = texture(
          uniforms.feedbackMap,
          sampleUv.sub(vec2(0, texelSize.y))
        ).x;
        const u_east = texture(
          uniforms.feedbackMap,
          sampleUv.add(vec2(texelSize.x, 0))
        ).x;
        const u_west = texture(
          uniforms.feedbackMap,
          sampleUv.sub(vec2(texelSize.x, 0))
        ).x;

        // Boundary: reflect at edges (Neumann boundary conditions)
        const atLeft = sampleUv.x.lessThan(texelSize.x);
        const atRight = sampleUv.x.greaterThan(float(1).sub(texelSize.x));
        const atBottom = sampleUv.y.lessThan(texelSize.y);
        const atTop = sampleUv.y.greaterThan(float(1).sub(texelSize.y));

        const west = atLeft.select(u_east, u_west);
        const east = atRight.select(u_west, u_east);
        const south = atBottom.select(u_north, u_south);
        const north = atTop.select(u_south, u_north);

        // Discrete Laplacian: ∇²u ≈ (u_n + u_s + u_e + u_w - 4*u)
        const laplacian = north.add(south).add(east).add(west).sub(u.mul(4));

        // Wave equation: u(t+1) = 2*u(t) - u(t-1) + α² * ∇²u
        // With damping: u(t+1) = damping * (2*u(t) - u(t-1) + α² * ∇²u)
        const u_new = damping.mul(
          u.mul(2).sub(u_prev).add(alphaSq.mul(laplacian))
        );

        // === Mouse interaction ===
        // Convert mouse NDC (-1,1) to UV (0,1)
        const mousePos = uniforms.mouseUv;
        const mouseUvPos = vec2(
          mousePos.x.add(1).mul(0.5),
          mousePos.y.add(1).mul(0.5)
        );

        // Distance from current pixel to mouse
        const toMouse = q.sub(mouseUvPos);
        const dist = length(toMouse);

        // Mouse influence radius
        const mouseRadius = float(0.06);

        // === Add noise to the influence ===
        // High frequency noise for surface variation
        const noiseScale = float(40.0);
        const noiseSpeed = float(1.0);
        const noiseCoord = vec3(
          q.x.mul(noiseScale),
          q.y.mul(noiseScale),
          time.mul(noiseSpeed)
        );
        const surfaceNoise = mx_noise_float(noiseCoord);

        // Low frequency noise for organic shape distortion
        const shapeNoiseScale = float(8.0);
        const shapeCoord = vec3(
          q.x.mul(shapeNoiseScale),
          q.y.mul(shapeNoiseScale),
          time.mul(1.5)
        );
        const shapeNoise = mx_noise_float(shapeCoord);

        // Combine: shape noise modulates the radius, surface noise adds texture
        const noiseAmount = float(1); // How much noise affects influence
        const radiusModulation = shapeNoise.mul(0.3).add(1.0); // 0.7 to 1.3
        const modulatedPhase = dist.div(mouseRadius.mul(radiusModulation)).mul(Math.PI);
        const shapedInfluence = dist.lessThan(mouseRadius.mul(radiusModulation)).select(
          cos(modulatedPhase).add(1).mul(0.5),
          float(0)
        );

        // Add surface texture noise within the influence area
        // Remap noise from [-1, 1] to [0, 1] so it only scales intensity, never reverses direction
        const noiseRemapped = surfaceNoise.add(1).mul(0.5); // Now 0 to 1
        // Mix between full intensity (1.0) and noise-scaled based on noiseAmount
        const textureVariation = noiseRemapped.mul(noiseAmount).add(float(1).sub(noiseAmount));
        const mouseInfluence = shapedInfluence.mul(textureVariation);

        // Add displacement when mouse is moving - always push DOWN (negative)
        const mouseStrength = float(0.3);
        const isMoving = uniforms.mouseVelocity.greaterThan(0.01);
        const mouseDisplacement = isMoving.select(
          mouseInfluence.mul(mouseStrength).negate(), // Always push down
          float(0)
        );

        // Apply mouse to current height
        const u_final = u_new.add(mouseDisplacement);

        // Store: x = new height (becomes u next frame), y = current height (becomes u_prev), z = noise debug
        const result = vec4(u_final, u, surfaceNoise, float(1));

        return result
      });

      mat.outputNode = colorFn()

      mat.toneMapped = false
    },
    [uniforms]
  );

  // Screen display material
  const screenUniforms = useUniforms(() => ({
    map: uniformTexture(drawFbo.texture),
  }));

  const screenMaterial = useMaterial(
    MeshBasicNodeMaterial,
    (mat) => {
      const colorFn = Fn(() => {
        const sample = texture(screenUniforms.map, uv());
        const height = sample.x;
        const noiseDebug = sample.z; // Noise stored in z channel

        // Visualize: Red = positive (peak), Green = negative (trough), Blue = noise
        const scale = float(5.0);
        const positive = height.max(0).mul(scale);
        const negative = height.negate().max(0).mul(scale);

        // Noise visualization: map from [-1, 1] to [0, 1]
        const noiseVis = noiseDebug.add(1).mul(0.5);

        return vec4(vec3(positive, negative, 0), float(1));
      });

      mat.colorNode = colorFn();
    },
    [screenUniforms]
  );

  const drawApi = useQuadShader({
    material: drawMaterial,
    renderTarget: drawFbo,
    autoRender: false,
    autoSwap: true,
    beforeRender: () => {
      uniforms.feedbackMap.value = drawFbo.read.texture;
    },
  });

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
    uniforms.frame.value = frameCount.current;
    uniforms.mouseUv.value.set(pointer.x, -pointer.y);

    // Run simulation
    drawApi.render(delta);

    // Update tracking
    lastMousePosition.current.set(pointer.x, pointer.y);
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
