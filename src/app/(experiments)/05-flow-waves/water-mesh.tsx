/* eslint-disable react-hooks/immutability */
 

import { DoubleFbo, useMaterial, useUniforms } from "@/lib/tsl";
import { type ThreeEvent } from "@react-three/fiber";
import { ComponentProps, useMemo } from "react";
import { Color, PlaneGeometry } from "three";
import {
  Fn,
  float,
  normalLocal,
  positionLocal,
  texture,
  uniformTexture,
  uv,
  Discard,
  vec2,
  vec3,
  normalize,
  transformNormalToView,
  textureSize,
} from "three/tsl";
import { MeshPhysicalNodeMaterial, NodeMaterial } from "three/webgpu";

interface WaterMeshProps extends ComponentProps<"group"> {
  /** Wave simulation texture */
  waveTextures: DoubleFbo;
  /** Callback when mouse moves over the mesh */
  onMouseMove: (uv: { x: number; y: number }) => void;
  /** Width of simulation (for geometry segments) */
  width: number;
  /** Height of simulation (for geometry segments) */
  height: number;
}

export function WaterMesh({
  waveTextures,
  onMouseMove,
  width,
  height,
  ...groupProps
}: WaterMeshProps) {
  // Create high-res plane geometry with same resolution as simulation (for rendering)
  const planeGeometry = useMemo(() => {
    return new PlaneGeometry(
      5,
      5, // Size in world units
      width - 1,
      height - 1 // segments = pixels - 1
    );
  }, [width, height]);

  // Create low-poly dummy geometry for raycasting (much cheaper)
  const dummyGeometry = useMemo(() => {
    return new PlaneGeometry(
      5,
      5, // Same size as water mesh
      1,
      1 // Only 1x1 segments for raycasting
    );
  }, []);

  // Create uniforms for texture sampling
  const uniforms = useUniforms(() => ({
    waveMap: uniformTexture(waveTextures.texture),
  }));

  // Create physical material with vertex displacement and fragment-based normal recalculation
  const material = useMaterial(
    MeshPhysicalNodeMaterial,
    (mat) => {
      // Vertex shader: Only handle displacement
      const displacementFn = Fn(() => {
        const vertexUv = uv();
        
        // Sample center height
        const sample = texture(uniforms.waveMap, vertexUv);
        const heightValue = sample.x; // Red channel = water height

        heightValue.divAssign(heightValue.mul(1.8).abs().add(0.001).pow(0.4))

        const displacementAmount = float(0.05); // Scale factor
        const displacement = normalLocal.mul(
          heightValue.mul(displacementAmount)
        );

        return positionLocal.add(displacement);
      });

      // Fragment shader: Calculate normals at fragment resolution (much higher detail)
      const normalFn = Fn(() => {
        const fragmentUv = uv();
        const displacementAmount = float(0.05);
        
        // Epsilon for sampling nearby pixels in texture space
        // Smaller epsilon = finer detail (adjust based on wave texture resolution)
        const epsilon = float(1).div(textureSize(uniforms.waveMap).x);
        
        // Sample 4 neighboring heights in texture space
        const heightRight = texture(uniforms.waveMap, fragmentUv.add(vec2(epsilon, 0))).x;
        const heightLeft = texture(uniforms.waveMap, fragmentUv.sub(vec2(epsilon, 0))).x;
        const heightUp = texture(uniforms.waveMap, fragmentUv.add(vec2(0, epsilon))).x;
        const heightDown = texture(uniforms.waveMap, fragmentUv.sub(vec2(0, epsilon))).x;
        
        // Calculate gradients using central differences
        const dzdx = heightRight.sub(heightLeft).div(epsilon.mul(2)).mul(displacementAmount);
        const dzdy = heightUp.sub(heightDown).div(epsilon.mul(2)).mul(displacementAmount);
        
        // Create normal from gradient: normalize(-dz/dx, -dz/dy, 1)
        const newNormal = normalize(vec3(dzdx.negate(), dzdy.negate(), 1));
        
        // Transform to view space for correct lighting
        return transformNormalToView(newNormal);
      });

      mat.positionNode = displacementFn();
      mat.normalNode = normalFn(); // Calculate normals in fragment shader
      mat.roughness = 0.0;
      mat.reflectivity = 1
      mat.color = new Color(0x2266aa);
    },
    [uniforms]
  );

  // Create invisible material for dummy raycast mesh using Discard()
  const invisibleMaterial = useMaterial(
    NodeMaterial,
    (mat) => {
      mat.fragmentNode = Fn(() => {
        Discard();
        return float(0);
      })();
      mat.transparent = true;
    },
    []
  );

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.uv) {
      onMouseMove({ x: e.uv.x, y: e.uv.y });
    }
  };

  return (
    <group {...groupProps}>
      {/* High-res water mesh - only for rendering displacement */}
      <mesh
        geometry={planeGeometry}
        material={material}
        rotation={[-Math.PI / 2, 0, 0]}
        onBeforeRender={() => {
          uniforms.waveMap.value = waveTextures.texture;
        }}
        raycast={() => null}
      />

      {/* Low-poly dummy mesh - invisible but handles raycasting */}
      <mesh
        geometry={dummyGeometry}
        material={invisibleMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handlePointerMove}
        occlusionTest={false}
      />
    </group>
  );
}

