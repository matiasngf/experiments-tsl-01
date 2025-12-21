import { useMemo } from "react";
import { uniform } from "three/tsl";
import type { Color, Vector2, Vector3, Vector4, Matrix3, Matrix4 } from "three";

/**
 * Supported types for TSL uniforms.
 * Maps JavaScript/Three.js types to their TSL uniform node equivalents.
 */
type UniformValue =
  | number
  | Color
  | Vector2
  | Vector3
  | Vector4
  | Matrix3
  | Matrix4;

/**
 * Maps an input value type to its corresponding TSL uniform node type.
 * The uniform node has a `.value` property of the same type for updates.
 */
type UniformNode<T extends UniformValue> = ReturnType<typeof uniform<T>>;

/**
 * Transforms a record of initial values into a record of TSL uniform nodes.
 */
type UniformNodes<T extends Record<string, UniformValue>> = {
  [K in keyof T]: UniformNode<T[K]>;
};

/**
 * Creates memoized TSL uniform nodes from an initial values object.
 *
 * Unlike WebGL's `useUniforms` which wraps values in `{ value: T }` objects,
 * this hook takes plain values and creates TSL `uniform()` nodes automatically.
 *
 * The uniform nodes are created once and memoized. Update values by setting
 * the `.value` property on each uniform node.
 *
 * @typeParam T - Record of uniform names to their initial values
 * @param initialValues - Object with uniform names as keys and initial values
 * @returns Object with the same keys, but values are TSL uniform nodes
 *
 * @example
 * ```tsx
 * import { useUniforms } from "@/lib/tsl";
 * import { Color, Vector2 } from "three";
 *
 * function MyMesh() {
 *   const uniforms = useUniforms({
 *     time: 0,
 *     intensity: 1.5,
 *     baseColor: new Color(0xff0000),
 *     resolution: new Vector2(1920, 1080),
 *   });
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
export function useUniforms<T extends Record<string, UniformValue>>(
  initialValues: T
): UniformNodes<T> {
  return useMemo(() => {
    const nodes = {} as UniformNodes<T>;

    for (const key in initialValues) {
      const value = initialValues[key];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes[key] = uniform(value) as any;
    }

    return nodes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

