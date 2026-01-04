import StructTypeNode, { MembersLayout } from "three/src/nodes/core/StructTypeNode.js";
import { struct } from "three/tsl";
import { Node } from "three/webgpu";

declare class TypedStructNode<T extends MembersLayout> extends Node {
  values: Node[];

  constructor(structLayoutNode: StructTypeNode, values: Node[]);

  get: (name: keyof T) => Node
}

export interface TypedStruct<T extends MembersLayout> {
  (): TypedStructNode<T>;
  (values: Node[]): TypedStructNode<T>;
  (...values: Node[]): TypedStructNode<T>;
  layout: StructTypeNode;
  isStruct: true;
}

export function typedStruct<T extends MembersLayout>(membersLayout: T, name?: string | null): TypedStruct<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return struct(membersLayout, name) as any as TypedStruct<T>;
}