"use client";

import { useMemo } from "react";
import { uniform } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import type { Node, PassNode } from "three/webgpu";

interface BloomPassOptions {
  /** Bloom strength/intensity (default: 1) */
  strength?: number;
  /** Bloom radius - size of the bloom effect (default: 0.5) */
  radius?: number;
  /** Bloom threshold - values below this won't bloom (default: 0.5) */
  threshold?: number;
}

interface BloomUniforms {
  strength: ReturnType<typeof uniform<number>>;
  radius: ReturnType<typeof uniform<number>>;
  threshold: ReturnType<typeof uniform<number>>;
}

interface BloomPassResult {
  /** The bloom node to add to the scene color */
  bloomNode: Node;
  /** Uniforms for direct access */
  uniforms: BloomUniforms;
}

/**
 * Hook that creates a bloom postprocessing pass with reactive parameters.
 *
 * @param scenePass - The scene pass from usePostProcessing
 * @param options - Bloom configuration options
 *
 * @example
 * ```tsx
 * const { postProcessing, scenePass } = usePostProcessing();
 * const { bloomNode } = useBloomPass(scenePass, {
 *   strength: 1.5,
 *   threshold: 0.3,
 *   radius: 0.5,
 * });
 *
 * useEffect(() => {
 *   const sceneColor = scenePass.getTextureNode('output');
 *   postProcessing.outputNode = renderOutput(sceneColor.add(bloomNode));
 * }, [postProcessing, scenePass, bloomNode]);
 * ```
 */
export function useBloomPass(
  scenePass: PassNode,
  options: BloomPassOptions = {}
): BloomPassResult {
  const { strength = 1, radius = 0.5, threshold = 0.5 } = options;

  const [bloomNode, uniforms] = useMemo(() => {
    const uniforms: BloomUniforms = {
      strength: uniform(strength),
      radius: uniform(radius),
      threshold: uniform(threshold),
    };

    const sceneColor = scenePass.getTextureNode("output");

    const bloomNode = bloom(
      sceneColor,
      uniforms.strength as unknown as number,
      uniforms.radius as unknown as number,
      uniforms.threshold as unknown as number
    );

    return [bloomNode, uniforms] as const;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenePass]);

  // Update uniforms directly - no useEffect needed
  uniforms.strength.value = strength;
  uniforms.radius.value = radius;
  uniforms.threshold.value = threshold;

  return { bloomNode, uniforms };
}
