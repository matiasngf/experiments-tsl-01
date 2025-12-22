import { useMemo } from "react";
import { UniformNode } from "three/webgpu";

/**
 * A TSL uniform node (result of `uniform()` from three/tsl).
 */
 
type AnyUniformNode = UniformNode<unknown>

/**
 * Record of TSL uniform nodes.
 */
type UniformsRecord = Record<string, AnyUniformNode>;

/**
 * Creates memoized TSL uniform nodes from a factory function or object.
 *
 * Unlike the WebGL version which takes `{ value: T }` objects, TSL uses
 * `uniform()` nodes directly. This hook memoizes those nodes to ensure
 * stable references across re-renders.
 *
 * @typeParam T - Record of uniform names to their TSL uniform nodes
 * @param uniforms - Object with uniform nodes, or factory function returning them
 * @returns The memoized uniforms object
 *
 * @example
 * ```tsx
 * import { useUniforms } from "@/lib/tsl";
 * import { uniform, vec2 } from "three/tsl";
 * import { Color, Vector2 } from "three";
 *
 * function MyMesh() {
 *   // Using a factory function (recommended)
 *   const uniforms = useUniforms(() => ({
 *     time: uniform(0),
 *     intensity: uniform(1.5),
 *     baseColor: uniform(new Color(0xff0000)),
 *     mouseUv: uniform(vec2(0, 0)),
 *     resolution: uniform(new Vector2(1920, 1080)),
 *   }));
 *
 *   // Update uniforms each frame
 *   useFrame(({ clock }) => {
 *     uniforms.time.value = clock.elapsedTime;
 *   });
 *
 *   // Use uniform nodes in TSL material setup
 *   const material = useMemo(() => {
 *     const mat = new MeshBasicNodeMaterial();
 *     mat.colorNode = uniforms.baseColor.mul(uniforms.intensity);
 *     return mat;
 *   }, [uniforms]);
 *
 *   return <mesh material={material}><boxGeometry /></mesh>;
 * }
 * ```
 */
export function useUniforms<T extends UniformsRecord>(uniforms: T | (() => T)): T {
  return useMemo<T>(() => {
    if (typeof uniforms === "function") {
      return uniforms();
    }
    return uniforms;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
