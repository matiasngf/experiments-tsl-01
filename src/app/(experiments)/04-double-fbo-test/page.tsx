/* eslint-disable react-hooks/immutability */
 
 
 
"use client";

import { useDoubleFbo, useMaterial, useQuadShader, useUniforms } from "@/lib/tsl";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Vector2 } from "three";
import OperatorNode from "three/src/nodes/math/OperatorNode.js";
import { Fn, screenSize, texture, uniform, uniformTexture, uv, vec2 } from "three/tsl";
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

const RENDERS_PER_FRAME = 5;
const fadeOut = true

function Scene() {
  const drawFbo = useDoubleFbo()
  const lastMousePosition = useRef(new Vector2(0, 0))
  
  const uniforms = useUniforms(() => ({
    feedbackMap: uniformTexture(drawFbo.read.texture),
    mouseUv: uniform(vec2(0)),
    fadeOutFactor: uniform(1),  // bigger number, stronger fade out
    effectDelta: uniform(0.1)
  }))


  const drawMaterial = useMaterial(MeshBasicNodeMaterial, (mat) => {

    const colorFn = Fn(()=> {
      const aspectFix = screenSize.x.div(screenSize.y)

      // Simple SDF sphere centered at mouseUv.
      // For node-based TSL SDF: d = length(uv - center) - radius
      const radius = 0.1;
      const center = uniforms.mouseUv.mul(vec2(aspectFix, 1));
      let screenSpace: OperatorNode | JoinNode = uv().mul(2).sub(1)
      screenSpace = vec2(screenSpace.x, screenSpace.y.negate()).mul(vec2(aspectFix, 1))
      
      const dist = screenSpace.sub(center).length().sub(radius); // uv() - center length - radius

      const sdf = dist;
      const color = sdf
        .mul(-1)
        .step(0)

      const prevSample = texture(uniforms.feedbackMap, uv().flipY());

      const subFactor = uniforms.fadeOutFactor.mul(uniforms.effectDelta).max(0.002)

      const result = prevSample
        
      if(fadeOut) {
        result.subAssign(subFactor)
      }
      result.addAssign(color).clampAssign(0,1)

      return result
    })

    mat.colorNode = colorFn()

  }, [uniforms])


  const screenUniforms = useUniforms(() => ({
    map: uniformTexture(drawFbo.texture)
  }))
  
  const screenMaterial = useMaterial(MeshBasicNodeMaterial, (mat) => {
    mat.colorNode = texture(screenUniforms.map, uv())
  }, [])
  
  const drawApi = useQuadShader({
    material: drawMaterial,
    renderTarget: drawFbo,
    autoRender: true,
    autoSwap: true,
    beforeRender: () => {
      uniforms.feedbackMap.value = drawFbo.read.texture
    },
  })

  useFrame((state, delta) => {
    // console.log(delta);
    
    // const currentMousePosition = state.pointer
    const currentMousePosition = new Vector2(
      Math.sin(state.clock.elapsedTime* 10) * 0.5,
      Math.cos(state.clock.elapsedTime* 2) * 0.5,
    )
    const lastPos = lastMousePosition.current
    
    uniforms.effectDelta.value = delta / RENDERS_PER_FRAME
    // Render multiple times, interpolating mouse position between last and current
    for (let i = 0; i < RENDERS_PER_FRAME; i++) {
      const t = (i + 1) / RENDERS_PER_FRAME
      const interpolatedX = lastPos.x + (currentMousePosition.x - lastPos.x) * t
      const interpolatedY = lastPos.y + (currentMousePosition.y - lastPos.y) * t
      
      uniforms.mouseUv.value.set(interpolatedX, interpolatedY)
      drawApi.render(delta)
    }
    
    // Update last mouse position to current after all renders
    lastMousePosition.current.set(currentMousePosition.x, currentMousePosition.y)
  }, 1)

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

