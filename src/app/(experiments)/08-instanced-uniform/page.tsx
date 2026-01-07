/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Color, Mesh, MeshBasicNodeMaterial, Node, NodeFrame, NodeUpdateType, Texture, TextureLoader, TextureNode, UniformNode, Vector2, Vector3 } from "three/webgpu";
import { uniform } from "three/tsl";
import { WebGPURenderer } from "three/webgpu";

export default function InstancedUniformPage() {
  return (
    <div className="w-screen h-screen bg-black">
      <Canvas
        camera={{ position: [8, 8, 8] }}
        gl={async (props) => {
          const renderer = new WebGPURenderer(props as never);
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

function Scene() {
  // Create 3x3 grid of cubes
  const cubes = useMemo(() => {
    const result = [];
    const spacing = 3;
    const offset = (2 * spacing) / 2; // Center the grid

    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        result.push({
          position: [x * spacing - offset, y * spacing - offset, 0] as [number, number, number],
          // eslint-disable-next-line react-hooks/purity
          color: new Color(Math.random(), Math.random(), Math.random()),
          // eslint-disable-next-line react-hooks/purity
          textureIndex: Math.round(Math.random() * 3),
          key: `cube-${x}-${y}`,
        });
      }
    }
    return result;
  }, []);

  return (
    <>
      <OrbitControls />
      {cubes.map((cube) => (
        <Cube key={cube.key} position={cube.position} color={cube.color} textureIndex={cube.textureIndex} />
      ))}
    </>
  );
}

class InstanceUniformNode<
  TValue extends Color | Vector2 | Vector3 | number,
> extends Node {
  uniformNode: UniformNode<TValue>;
  accesor: string;
  defaultValue: TValue;

  constructor(defaultValue: TValue, accesor: string) {
    super("vec3");
    this.updateType = NodeUpdateType.OBJECT;

    this.uniformNode = uniform(defaultValue);
    this.accesor = accesor;
    this.defaultValue = defaultValue;
  }

  update(frame: NodeFrame) {
    const mesh = frame.object;
    if (!mesh) {
      throw new Error("Invalid mesh on frame update");
    }

    if (this.accesor in mesh) {
      const newValue = (mesh as any)[this.accesor];
      if (typeof this.uniformNode.value === "number") {
        this.uniformNode.value = newValue;
      } else {
        this.uniformNode.value.copy(newValue);
      }
    } else {
      this.uniformNode.value = this.defaultValue;
    }
  }

  setup(/*builder*/) {
    return this.uniformNode;
  }
}

class InstanceTextureUniformNode<TValue extends Texture> extends TextureNode {
  accessor: string;
  defaultValue: TValue;

  constructor(defaultValue: TValue, accessor: string) {
    super(defaultValue);
    this.updateType = NodeUpdateType.OBJECT;
    this.accessor = accessor;
    this.defaultValue = defaultValue;
  }

  update(frame: NodeFrame) {
    const mesh = frame.object;
    if (!mesh) {
      throw new Error("Invalid mesh on frame update");
    }

    if (this.accessor in mesh) {
      this.value = (mesh as any)[this.accessor];
    } else {
      this.value = this.defaultValue;
    }
  }
}

const cubeMaterial = new MeshBasicNodeMaterial();

const c = new InstanceUniformNode(new Color("red"), "meshColor")
const s = new InstanceUniformNode(1, "meshScale")
const t = new InstanceTextureUniformNode(new Texture(), "meshTex")
cubeMaterial.colorNode = t.mul(c).mul(s)


function Cube({ position, color, textureIndex }: { position: [number, number, number], color: Color, textureIndex:number }) {

  const meshRef = useRef<Mesh>(null)

  useEffect(() => {
    if(!meshRef.current) return
    const catTexture = new TextureLoader().load(`/textures/${textureNames[textureIndex]}.jpg`);

    (meshRef.current as any).meshColor = color;
    (meshRef.current as any).meshTex = catTexture

  }, [color, textureIndex])

  // eslint-disable-next-line react-hooks/purity
  const initialOffset = Math.random();

  useFrame(({clock}) => {
    if(!meshRef.current) return

    (meshRef.current as any).meshScale = Math.sin(clock.getElapsedTime() + initialOffset * Math.PI) * 0.5 + 0.5;
  })

  return (
    <mesh ref={meshRef} material={cubeMaterial} position={position}>
      <boxGeometry args={[2, 2, 2]} />
    </mesh>
  );
}

const textureNames = [
  "cat",
  "oak_veneer_01_diff_1k",
  "wood_shutter_diff_1k",
  "wood_table_diff_1k"
]

