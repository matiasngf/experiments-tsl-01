import { Layout, ShaderCallNodeInternal, ShaderNodeInternal } from "three/src/nodes/TSL.js";
import { ProxiedObject, Fn } from "three/tsl";
import { NodeBuilder } from "three/webgpu";

export interface TypedShaderNodeFn<Args extends readonly unknown[], Returns = ShaderCallNodeInternal> {
  (...args: Args): Returns;

  shaderNode: ShaderNodeInternal;
  id: number;

  getNodeType: (builder: NodeBuilder) => string | null;
  getCacheKey: (force?: boolean) => number;

  setLayout: (layout: Layout) => this;

  once: (subBuilds?: string[] | null) => this;
}

/**
 * Wraps a JS function as a TSL shader node with typed, named parameters.
 * This allows you to define shader logic using an object for arguments,
 * improving readability for multiple parameters.
 *
 * Example - a sum function:
 *
 * // Define the function and its argument type inline:
 * const sumFn = TypedFn(
 *   ({ a, b }: { a: Node, b: Node }) => a.add(b)
 * );
 *
 * // Usage:
 * sumFn({ a: float(1), b: float(2) });
 *
 * To type your function:
 *   TypedShaderNodeFn<[ProxiedObject<{ a: Node, b: Node }>], Node>
 *
 * @param jsFunc - Function accepting an object of named Nodes.
 * @param layout - Optional: struct layout for TSL nodes.
 */
export function TypedFn<T extends Record<string, unknown>, R>(
  jsFunc: (args: T, builder: NodeBuilder) => R,
  layout?: string | Record<string, string>,
): TypedShaderNodeFn<[ProxiedObject<T>], R> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Fn(jsFunc, layout) as any
}