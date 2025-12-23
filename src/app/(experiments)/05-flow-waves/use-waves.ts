/* eslint-disable react-hooks/immutability */
import {
  useDoubleFbo,
  useMaterial,
  useQuadShader,
  useUniforms,
} from "@/lib/tsl";
import type { DoubleFbo } from "@/lib/tsl/double-fbo";
import { HalfFloatType, NoColorSpace, Vector2, type Texture } from "three";
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
import { NodeMaterial, type UniformNode } from "three/webgpu";

// Wave equation parameters
// α² = (c * dt / dx)² - Courant number squared
// For stability in 2D: α² ≤ 0.5
// Higher = faster waves, lower = slower waves
const ALPHA_SQ = 0.5;
const DAMPING = 0.99; // Energy loss per frame (1.0 = no damping)

export interface UseWavesParams {
  /** Width of the simulation. Defaults to viewport width. */
  width?: number;
  /** Height of the simulation. Defaults to viewport height. */
  height?: number;
}

export interface WaveUniforms {
  /** Mouse position in NDC coordinates (-1 to 1) */
  mouseUv: UniformNode<Vector2>;
  /** Mouse velocity (speed of movement) */
  mouseVelocity: UniformNode<number>;
}

export interface UseWavesResult {
  /** Exposed uniforms to control the simulation */
  uniforms: WaveUniforms;
  /** Callback to trigger a render pass */
  render: (delta: number, frame?: XRFrame) => void;
  /** Double FBO with the simulation result */
  result: DoubleFbo<Texture>;
}

/**
 * Hook for creating a wave simulation using the wave equation.
 * 
 * Uses a double-buffered FBO for ping-pong rendering and implements
 * a discrete wave equation with mouse interaction and noise-based disturbance.
 * 
 * @example
 * ```tsx
 * const { uniforms, render, result } = useWaves({ width: 512, height: 512 });
 * 
 * useFrame((state, delta) => {
 *   uniforms.mouseUv.value.set(state.pointer.x, -state.pointer.y);
 *   uniforms.mouseVelocity.value = calculateVelocity();
 *   render(delta);
 * });
 * 
 * // Use result.texture for visualization
 * ```
 */
export function useWaves({
  width,
  height,
}: UseWavesParams = {}): UseWavesResult {
  const drawFbo = useDoubleFbo({
    width,
    height,
    type: HalfFloatType,
    colorSpace: NoColorSpace,
  });

  const uniforms = useUniforms(() => ({
    feedbackMap: uniformTexture(drawFbo.read.texture),
    mouseUv: uniform(new Vector2(0, 0)),
    mouseVelocity: uniform(0),
  }));

  const drawMaterial = useMaterial(
    NodeMaterial,
    (mat) => {
      const simulateFn = Fn(() => {
        const alphaSq = float(ALPHA_SQ);
        const damping = float(DAMPING);

        // Texel size for sampling neighbors (screenSize = current render target dimensions)
        const texelSize = vec2(1.0).div(screenSize);
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

        // Aspect ratio correction for circular mouse influence
        const aspect = screenSize.x.div(screenSize.y);
        
        // Scale UV coordinates by aspect ratio for distance calculation
        const aspectCorrectedUv = vec2(q.x.mul(aspect), q.y);
        const aspectCorrectedMouse = vec2(mouseUvPos.x.mul(aspect), mouseUvPos.y);
        
        // Distance from current pixel to mouse (aspect-corrected)
        const toMouse = aspectCorrectedUv.sub(aspectCorrectedMouse);
        const dist = length(toMouse);

        // Mouse influence radius (in vertical UV units, so it's consistent)
        const mouseRadius = float(0.06);

        // === Add noise to the influence ===
        // High frequency noise for surface variation (aspect-corrected)
        const noiseScale = float(40.0);
        const noiseSpeed = float(1.0);
        const noiseCoord = vec3(
          q.x.mul(aspect).mul(noiseScale),
          q.y.mul(noiseScale),
          time.mul(noiseSpeed)
        );
        const surfaceNoise = mx_noise_float(noiseCoord);

        // Low frequency noise for organic shape distortion (aspect-corrected)
        const shapeNoiseScale = float(8.0);
        const shapeCoord = vec3(
          q.x.mul(aspect).mul(shapeNoiseScale),
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
        const result = vec4(u_final, u, screenSize.x.greaterThan(500).select(1,0), float(1));

        return result;
      });

      mat.outputNode = simulateFn();
      mat.toneMapped = false;
    },
    [uniforms]
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

  return {
    uniforms: {
      mouseUv: uniforms.mouseUv,
      mouseVelocity: uniforms.mouseVelocity,
    },
    render: drawApi.render,
    result: drawFbo,
  };
}

