import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { DoubleFbo } from "./double-fbo";
import type { RenderTargetOptions, Texture } from "three";

/**
 * Parameters for the useDoubleFbo hook.
 */
export interface UseDoubleFboParams extends RenderTargetOptions {
  /** Width of the render targets. Defaults to viewport width if not specified. */
  width?: number;
  /** Height of the render targets. Defaults to viewport height if not specified. */
  height?: number;
}

/**
 * Creates a double-buffered FBO (ping-pong buffer) for GPU computations.
 *
 * Uses WebGPU's RenderTarget for compatibility with TSL and WebGPURenderer.
 * Useful for simulations, particle systems, or any effect that needs to
 * read from the previous frame while writing to the current frame.
 *
 * Automatically resizes when dimensions change and disposes on unmount.
 *
 * @typeParam TTexture - The texture type for the render targets
 * @param params - Configuration options including width, height, and render target options
 * @returns A DoubleFbo instance with swap(), read, and write properties
 *
 * @example
 * ```tsx
 * // Basic usage for a simulation
 * const doubleFbo = useDoubleFbo({ width: 512, height: 512 });
 *
 * useFrame(({ gl, scene, camera }) => {
 *   // Read from previous frame
 *   material.uniforms.uPrevious.value = doubleFbo.read.texture;
 *   // Render to current frame
 *   gl.setRenderTarget(doubleFbo.write);
 *   gl.render(scene, camera);
 *   gl.setRenderTarget(null);
 *   // Swap buffers
 *   doubleFbo.swap();
 * });
 * ```
 *
 * @example
 * ```tsx
 * // With custom render target options
 * import { FloatType, NearestFilter } from "three";
 *
 * const doubleFbo = useDoubleFbo({
 *   width: 256,
 *   height: 256,
 *   minFilter: NearestFilter,
 *   magFilter: NearestFilter,
 *   type: FloatType,
 * });
 * ```
 */
export function useDoubleFbo<TTexture extends Texture | Texture[] = Texture>({
  width,
  height,
  ...options
}: UseDoubleFboParams = {}): DoubleFbo<TTexture> {
  const w = useThree((s) => {
    if (typeof width === "number") {
      return width;
    }
    return s.size.width;
  });

  const h = useThree((s) => {
    if (typeof height === "number") {
      return height;
    }
    return s.size.height;
  });

  const doubleFbo = useMemo(() => {
    return new DoubleFbo<TTexture>(w, h, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize when dimensions change
  useEffect(() => {
    doubleFbo.setSize(w, h);
  }, [doubleFbo, w, h]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      doubleFbo.dispose();
    };
  }, [doubleFbo]);

  return doubleFbo;
}

