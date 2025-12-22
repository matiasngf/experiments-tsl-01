/* eslint-disable react-hooks/immutability */
 
 
"use client";

import { useDoubleFbo, useMaterial, useQuadShader, useUniforms } from "@/lib/tsl";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense } from "react";
import OperatorNode from "three/src/nodes/math/OperatorNode.js";
import { texture, uniform, uniformTexture, uv, vec2, vec3 } from "three/tsl";
import { JoinNode, MeshBasicNodeMaterial, WebGPURenderer } from "three/webgpu";

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
  const drawFbo = useDoubleFbo()
  
  const uniforms = useUniforms(() => ({
    feedbackMap: uniformTexture(drawFbo.read.texture),
    mouseUv: uniform(vec2(0)),
  }))


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
    const edge = 0.002;
    const color = sdf
      .mul(-1)
      .smoothstep(-edge, edge)
      .mix(vec3(0), vec3(1)); // fade 0->1

    const result = texture(uniforms.feedbackMap, uv().flipY()).mul(0.9).add(color)

    mat.colorNode = result

  }, [uniforms])

  useFrame((state) => {
    uniforms.mouseUv.value.set(state.pointer.x, state.pointer.y)
  })

  const screenUniforms = useUniforms(() => ({
    map: uniformTexture(drawFbo.texture)
  }))
  
  const screenMaterial = useMaterial(MeshBasicNodeMaterial, (mat) => {
    mat.colorNode = texture(screenUniforms.map, uv())
  }, [])
  
  useQuadShader({
    material: drawMaterial,
    renderTarget: drawFbo,
    autoRender: true,
    autoSwap: true,
    beforeRender: () => {
      uniforms.feedbackMap.value = drawFbo.read.texture
    },
    priority: 1
  })

  useQuadShader({
    material: screenMaterial,
    renderTarget: null,
    beforeRender: () => {
      screenUniforms.map.value = drawFbo.read.texture
    },
    priority: 2,
  })

  return null;
}

