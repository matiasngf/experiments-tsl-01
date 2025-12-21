/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/refs */
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { RenderCallback } from "@react-three/fiber";
import { Mesh, Scene } from "three";
import type { RenderTarget } from "three/webgpu";
import type { NodeMaterial } from "three/webgpu";
import { quadGeometry, quadCamera } from "./quads";

/**
 * Options for the useQuadShader hook.
 */
export interface UseQuadShaderOptions {
  /**
   * The NodeMaterial to be applied to the quad.
   * This should be a TSL-based material (e.g., MeshBasicNodeMaterial).
   */
  material: NodeMaterial;

  /**
   * The RenderTarget or its ref to render to, or null to render to screen.
   */
  renderTarget: RenderTarget | RefObject<RenderTarget | null> | null;

  /**
   * Optional callback to run before rendering the quad.
   */
  beforeRender?: RenderCallback;

  /**
   * Optional callback to run after rendering the quad.
   */
  afterRender?: RenderCallback;

  /**
   * Whether the quad should automatically render each frame. Defaults to true.
   */
  autoRender?: boolean;

  /**
   * Priority of the render callback in the render loop.
   */
  priority?: number;

  /**
   * Whether to clear the render target before rendering. Defaults to true.
   */
  clear?: boolean;
}

/**
 * API returned by useQuadShader for manual rendering control.
 */
export interface QuadShaderApi {
  /**
   * Manually render the quad shader. Use this when autoRender is false.
   * @param delta - The time delta since the last frame.
   * @param frame - Optional XRFrame for VR/AR applications.
   */
  render: (delta: number, frame?: XRFrame) => void;

  /**
   * Reference to the internal mesh for advanced manipulation.
   */
  mesh: RefObject<Mesh | null>;
}

/**
 * Hook for rendering a fullscreen quad with a NodeMaterial, optionally to a render target.
 * This is commonly used for postprocessing, compute-like effects, or rendering to texture.
 *
 * Unlike the WebGL version, this uses TSL NodeMaterials and WebGPU RenderTargets.
 * WebGPU handles state management internally, so no GL state save/restore is needed.
 *
 * @param options - Configuration options for the quad shader
 * @returns API object with render function and mesh reference
 *
 * @example
 * ```tsx
 * // Auto-render to a render target
 * const renderTarget = useRenderTarget({ width: 512, height: 512 });
 *
 * const material = useMaterial(MeshBasicNodeMaterial, (mat) => {
 *   mat.colorNode = mix(color(0xff0000), color(0x0000ff), uv().x);
 * });
 *
 * useQuadShader({
 *   material,
 *   renderTarget,
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Manual render mode for ping-pong operations
 * const api = useQuadShader({
 *   material: feedbackMaterial,
 *   renderTarget: doubleFbo.write,
 *   autoRender: false,
 * });
 *
 * useFrame((_, delta) => {
 *   // Custom logic before render
 *   uniforms.time.value += delta;
 *
 *   api.render(delta);
 *
 *   doubleFbo.swap();
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Render to screen (null renderTarget)
 * useQuadShader({
 *   material: postProcessMaterial,
 *   renderTarget: null, // Renders to screen
 * });
 * ```
 */
export function useQuadShader(options: UseQuadShaderOptions): QuadShaderApi {
  const {
    material,
    renderTarget,
    beforeRender,
    afterRender,
    autoRender = true,
    priority = 0,
    clear = true,
  } = options;

  const state = useThree();
  const containerScene = useMemo(() => new Scene(), []);
  const meshRef = useRef<Mesh | null>(null);

  // Setup mesh in the scene
  useEffect(() => {
    const mesh = new Mesh(quadGeometry, material);
    meshRef.current = mesh;
    containerScene.add(mesh);

    return () => {
      containerScene.remove(mesh);
      meshRef.current = null;
    };
  }, [containerScene, material]);

  // Use refs for callbacks to avoid recreating renderQuad
  const beforeRenderRef = useRef(beforeRender);
  beforeRenderRef.current = beforeRender;

  const afterRenderRef = useRef(afterRender);
  afterRenderRef.current = afterRender;

  const renderTargetRef = useRef(renderTarget);
  renderTargetRef.current = renderTarget;

  const clearRef = useRef(clear);
  clearRef.current = clear;

  // Core render function
  const renderQuad = useCallback(
    (delta: number, frame?: XRFrame) => {
      // Call beforeRender callback if provided
      if (beforeRenderRef.current) {
        beforeRenderRef.current(state, delta, frame);
      }

      // Set render target
      const target = renderTargetRef.current;
      if (!target) {
        state.gl.setRenderTarget(null);
      } else if ("current" in target) {
        state.gl.setRenderTarget(target.current as any);
      } else {
        state.gl.setRenderTarget(target as any);
      }

      // Clear if requested
      if (clearRef.current) {
        state.gl.clear();
      }

      // Render the quad
      state.gl.render(containerScene, quadCamera);

      // Call afterRender callback if provided
      if (afterRenderRef.current) {
        afterRenderRef.current(state, delta, frame);
      }

      // Reset to default render target
      state.gl.setRenderTarget(null);
    },
    [state, containerScene]
  );

  // Auto-render using useFrame when enabled
  useFrame((_, delta, frame) => {
    if (autoRender) {
      renderQuad(delta, frame);
    }
  }, priority);

  // Return API for manual rendering
  const api = useMemo<QuadShaderApi>(
    () => ({
      render: renderQuad,
      mesh: meshRef,
    }),
    [renderQuad]
  );

  return api;
}

