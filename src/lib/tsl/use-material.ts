import { useMemo } from "react";
import type { Material } from "three";

/**
 * Constructor type for any Three.js material.
 */
type MaterialConstructor<T extends Material> = new () => T;

/**
 * Setup function that configures the material's node properties.
 * Called once during material creation.
 */
type MaterialSetup<T extends Material> = (material: T) => void;

/**
 * Creates a memoized TSL NodeMaterial with a setup callback.
 *
 * This hook provides a clean pattern for creating NodeMaterials where:
 * - The material is created once and memoized
 * - A setup callback configures the material's node properties
 * - Dependencies can trigger material recreation when needed
 *
 * @typeParam T - The material type (e.g., MeshBasicNodeMaterial)
 * @param MaterialClass - The material constructor class
 * @param setup - Callback function to configure the material's nodes
 * @param deps - Optional dependency array to trigger recreation
 * @returns The configured material instance
 *
 * @example
 * ```tsx
 * import { useMaterial } from "@/lib/tsl";
 * import { MeshBasicNodeMaterial } from "three/webgpu";
 * import { color, uv, mix } from "three/tsl";
 *
 * function GradientMesh() {
 *   const material = useMaterial(MeshBasicNodeMaterial, (mat) => {
 *     const red = color(0xff0000);
 *     const blue = color(0x0000ff);
 *     mat.colorNode = mix(red, blue, uv().x);
 *   });
 *
 *   return <mesh material={material}><planeGeometry /></mesh>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With uniforms for dynamic updates
 * const uniforms = useUniforms({ progress: 0 });
 *
 * const material = useMaterial(
 *   MeshBasicNodeMaterial,
 *   (mat) => {
 *     mat.colorNode = mix(color(0xff0000), color(0x0000ff), uniforms.progress);
 *   },
 *   [uniforms] // Recreate if uniforms change
 * );
 * ```
 */
export function useMaterial<T extends Material>(
  MaterialClass: MaterialConstructor<T>,
  setup: MaterialSetup<T>,
  deps: React.DependencyList = []
): T {
  return useMemo(() => {
    const material = new MaterialClass();
    setup(material);
    return material;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

