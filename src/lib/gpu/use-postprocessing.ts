"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { PostProcessing, WebGPURenderer } from "three/webgpu";
import { pass } from "three/tsl";
import type { PassNode } from "three/webgpu";

interface UsePostProcessingOptions {
  enabled?: boolean;
}

interface UsePostProcessingResult {
  postProcessing: PostProcessing;
  scenePass: PassNode;
}

/**
 * Hook that creates and manages a PostProcessing instance with WebGPU.
 * Automatically gets the renderer, scene, and camera from R3F context.
 *
 * @param options.enabled - Whether postprocessing is enabled. Defaults to true.
 *   When disabled, renders the scene normally without postprocessing.
 *
 * @example
 * ```tsx
 * const { postProcessing, scenePass } = usePostProcessing({ enabled: true });
 *
 * // Chain with effects in a useEffect
 * useEffect(() => {
 *   const sceneColor = scenePass.getTextureNode('output');
 *   postProcessing.outputNode = renderOutput(sceneColor.add(bloomPass));
 * }, [postProcessing, scenePass, bloomPass]);
 * ```
 */
export function usePostProcessing(
  options: UsePostProcessingOptions = {}
): UsePostProcessingResult {
  const { enabled = true } = options;

  const gl = useThree((state) => state.gl) as unknown as WebGPURenderer;
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const result = useMemo(() => {
    const postProcessing = new PostProcessing(gl);
    const scenePass = pass(scene, camera);

    return { postProcessing, scenePass };
  }, [gl, scene, camera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      result.postProcessing.dispose();
    };
  }, [result.postProcessing]);

  // Render using postProcessing or normal renderer based on enabled flag
  useFrame(() => {
    if (enabled) {
      result.postProcessing.render();
    } else {
      gl.render(scene, camera);
    }
  }, 1);

  return result;
}
