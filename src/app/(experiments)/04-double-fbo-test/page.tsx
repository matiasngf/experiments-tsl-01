/* eslint-disable react-hooks/immutability */
 
 
"use client";

import { useDoubleFbo, useFbo, useMaterial, useQuadShader, useUniforms } from "@/lib/tsl";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense } from "react";
import OperatorNode from "three/src/nodes/math/OperatorNode.js";
import { sample, texture, uniform, uniformTexture, uv, vec2, vec3 } from "three/tsl";
import { JoinNode, MeshBasicNodeMaterial, Vector2, WebGPURenderer } from "three/webgpu";

export default function DoubleFboTestPage() {
  return (
    <div className="w-screen h-screen bg-black">
      <Canvas
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
  const { viewport } = useThree();

  const uniforms = useUniforms(() => ({
    mouseUv: uniform(vec2(0)),
  }))

  const drawFbo = useDoubleFbo()

  const drawMaterial = useMaterial(MeshBasicNodeMaterial, (mat) => {

    // Simple SDF sphere centered at mouseUv.
    // For node-based TSL SDF: d = length(uv - center) - radius
    const radius = 0.25;
    const center = uniforms.mouseUv;
    let screenSpace: OperatorNode | JoinNode = uv().mul(2).sub(1)
    screenSpace = vec2(screenSpace.x, screenSpace.y.negate())
    const dist = screenSpace.sub(center).length().sub(radius); // uv() - center length - radius

    // Visualize SDF: white inside the sphere, black outside, smooth edge
    // We'll use smoothstep for anti-aliased edge
    // White when dist < 0
    const sdf = dist;
    const edge = 0.01;
    const color = sdf
      .mul(-1)
      .smoothstep(-edge, edge)
      .mix(vec2(0, 0), vec2(1, 1)); // fade 0->1

    mat.colorNode = color

  }, [uniforms])

  useFrame((state) => {
    uniforms.mouseUv.value.set(state.pointer.x, state.pointer.y)
  })

  const screenUniforms = useUniforms(() => ({
    map: uniformTexture(drawFbo.texture)
  }))

  // const u  = uniform(drawFbo.read.texture)
  
  const screenMaterial = useMaterial(MeshBasicNodeMaterial, (mat) => {
    mat.colorNode = texture(screenUniforms.map, uv())
  }, [])
  
  useQuadShader({
    material: drawMaterial,
    renderTarget: drawFbo,
    autoRender: true,
    autoSwap: true,
    afterRender: () => {
      screenUniforms.map.value = drawFbo.texture
    }
  })


  return (
    <>
      <mesh material={screenMaterial}>
        <planeGeometry args={[viewport.width,viewport.height]} />
      </mesh>
    </>
  );
}

