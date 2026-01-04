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

export function TypedFn<T extends { readonly [key: string]: unknown }, R>(
  jsFunc: (args: T, builder: NodeBuilder) => R,
  layout?: string | Record<string, string>,
): TypedShaderNodeFn<[ProxiedObject<T>], R> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Fn(jsFunc, layout) as any
}