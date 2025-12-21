import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { RenderTarget } from "three/webgpu";
import type { RenderTargetOptions, Texture } from "three";

/**
 * Parameters for the useRenderTarget hook.
 */
export interface UseRenderTargetParams extends RenderTargetOptions {
  /** Width of the render target. Defaults to viewport width if not specified. */
  width?: number;
  /** Height of the render target. Defaults to viewport height if not specified. */
  height?: number;
}

/**
 * Creates a WebGPU-compatible RenderTarget with automatic resizing.
 *
 * Uses Three.js's WebGPU `RenderTarget` class instead of `WebGLRenderTarget`.
 * The render target automatically resizes when width/height change.
 * If no dimensions are provided, it matches the viewport size.
 *
 * @typeParam TTexture - The texture type for the render target
 * @param params - Configuration options including width, height, and render target options
 * @returns A RenderTarget instance compatible with WebGPU
 *
 * @example
 * ```tsx
 * // Basic usage - matches viewport size
 * const renderTarget = useRenderTarget({});
 *
 * useFrame(({ gl, scene, camera }) => {
 *   gl.setRenderTarget(renderTarget);
 *   gl.render(scene, camera);
 *   gl.setRenderTarget(null);
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Fixed size with custom options
 * const renderTarget = useRenderTarget({
 *   width: 1024,
 *   height: 1024,
 *   samples: 4,
 *   depthBuffer: true,
 * });
 * ```
 */
export function useRenderTarget<
  TTexture extends Texture | Texture[] = Texture,
>({
  width,
  height,
  ...options
}: UseRenderTargetParams = {}): RenderTarget<TTexture> {
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

  const renderTarget = useMemo(() => {
    return new RenderTarget<TTexture>(w, h, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize when dimensions change
  useEffect(() => {
    renderTarget.setSize(w, h);
  }, [renderTarget, w, h]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      renderTarget.dispose();
    };
  }, [renderTarget]);

  return renderTarget;
}

