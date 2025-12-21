import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three/webgpu";
import { pass, uniform } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";

interface BloomConfig {
  strength?: number;
  threshold?: number;
  radius?: number;
}

export function usePostprocessing(config: BloomConfig = {}) {
  const { strength = 0.5, threshold = 0.2, radius = 0.4 } = config;
  const { gl, scene, camera } = useThree();

  const postProcessingRef = useRef<THREE.PostProcessing | null>(null);

  // Create uniforms once
  const uniforms = useMemo(
    () => ({
      strength: uniform(strength),
      threshold: uniform(threshold),
      radius: uniform(radius),
    }),
    []
  );

  // Update uniforms when config changes (no shader recompilation)
  useEffect(() => {
    uniforms.strength.value = strength;
    uniforms.threshold.value = threshold;
    uniforms.radius.value = radius;
  }, [strength, threshold, radius, uniforms]);

  useEffect(() => {
    const postProcessing = new THREE.PostProcessing(
      gl as THREE.WebGPURenderer
    );

    const scenePass = pass(scene, camera);
    const scenePassColor = scenePass.getTextureNode("output");

    // Use uniforms for dynamic values
    const bloomPass = bloom(
      scenePassColor,
      uniforms.strength,
      uniforms.threshold,
      uniforms.radius
    );

    postProcessing.outputNode = scenePassColor.add(bloomPass);
    postProcessingRef.current = postProcessing;

    return () => {
      postProcessing.dispose();
    };
  }, [gl, scene, camera, uniforms]);

  useFrame(() => {
    postProcessingRef.current?.render();
  }, 1); // Priority 1 to run after scene updates

  return { postProcessing: postProcessingRef, uniforms };
}

