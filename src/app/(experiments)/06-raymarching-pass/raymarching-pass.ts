import { useUniforms } from "@/lib/tsl";
import { useFrame, useThree } from "@react-three/fiber";

import { useMemo } from "react";
import { Break, cameraPosition, cameraProjectionMatrix, cameraProjectionMatrixInverse, cameraViewMatrix, cameraWorldMatrix, float, Fn, getViewPosition, If, length, Loop, normalize, screenUV, time, uniform, vec2, vec3, vec4 } from "three/tsl";
import { Matrix4, Node, PassNode, TextureNode, Vector3 } from "three/webgpu";

interface RaymarchingOptions {
  foo?: 'bar'
}

export function useRaymarchingPass(sceneColor: TextureNode, sceneDepth: TextureNode, options: RaymarchingOptions = {}) {

  const raymarchingUniforms = useUniforms(() => ({
    boxSize: uniform(1),
    // Camera uniforms - manually managed
    cameraPosition: uniform(new Vector3()),
    cameraProjectionMatrix: uniform(new Matrix4()),
    cameraProjectionMatrixInverse: uniform(new Matrix4()),
    cameraWorldMatrix: uniform(new Matrix4()),
    cameraViewMatrix: uniform(new Matrix4()),
  }));

  const camera = useThree(s => s.camera)

  // Update camera uniforms every frame
  useFrame(() => {
    camera.updateMatrixWorld()
    raymarchingUniforms.cameraPosition.value.copy(camera.position);
    raymarchingUniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
    raymarchingUniforms.cameraProjectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
    raymarchingUniforms.cameraWorldMatrix.value.copy(camera.matrixWorld);
    raymarchingUniforms.cameraViewMatrix.value.copy(camera.matrixWorldInverse);
  }, -1);

  const raymarchingPassNode = useMemo(() => {
    const maxSteps = uniform(64);
    const maxDistance = uniform(20.0);

    const raymarchingFn = Fn(() => {
      const uv = screenUV;
      const color = vec4(sceneColor.sample(uv)).toVar();
      const sceneDepthValue = float(sceneDepth.sample(uv).r).toVar();
  
      // === RAY ORIGIN ===
      // Use our manual uniform instead of cameraPosition
      const rayOrigin = vec3(raymarchingUniforms.cameraPosition).toVar();
      
        
      // === RAY DIRECTION ===
      // IMPORTANT: For WebGPU, flip Y BEFORE converting to NDC
      // screenUV goes from (0,0) at bottom-left to (1,1) at top-right
      // WebGPU NDC has Y going up, so we need to flip it
      const flippedUV = vec2(uv.x, uv.y.oneMinus()).toVar();
      
      // Now convert flipped UV (0 to 1) to NDC (-1 to +1)
      const ndc = flippedUV.mul(2.0).sub(1.0).toVar();
      
      // Create a point in clip space (NDC with depth = 0.5)
      const clipSpacePoint = vec4(ndc.x, ndc.y, 0.5, 1.0).toVar();
      
      // Transform to view space using inverse projection matrix
      const viewSpacePoint = vec4(
        raymarchingUniforms.cameraProjectionMatrixInverse.mul(clipSpacePoint)
      ).toVar();
      
      // Perspective divide
      const viewPoint = viewSpacePoint.xyz.div(viewSpacePoint.w).toVar();
      
      // Transform from view space to world space
      const worldPoint = vec3(
        raymarchingUniforms.cameraWorldMatrix.mul(vec4(viewPoint, 1.0)).xyz
      ).toVar();
      
      // Ray direction = normalize(worldPoint - rayOrigin)
      const rayDir = normalize(worldPoint.sub(rayOrigin)).toVar();

      // === RAYMARCHING LOOP ===
      const t = float(0.0).toVar();
  
      Loop({ start: 0, end: maxSteps, type: 'int' }, ({ i }) => {
        
        // Current position along ray (IN WORLD SPACE)
        const pos = rayOrigin.add(rayDir.mul(t)).toVar();
        
        // Example: Sphere SDF at world position (0, 1, 0) with radius 0.5
        const sphereCenter = vec3(0.0, time.sin(), 0.0);
        const sphereRadius = 0.5;
        const dist = length(pos.sub(sphereCenter)).sub(sphereRadius);
        
        // Hit detection
        If(dist.lessThan(0.01), () => {
          
          // Convert world position back to clip space for depth comparison
          const viewPos = raymarchingUniforms.cameraViewMatrix.mul(vec4(pos, 1.0));
          const clipPos = raymarchingUniforms.cameraProjectionMatrix.mul(viewPos);
          const raymarchDepth = clipPos.z.div(clipPos.w);
          
          // Only render if in front of scene geometry
          If(raymarchDepth.lessThan(sceneDepthValue), () => {
            // Simple lighting
            const normal = normalize(pos.sub(sphereCenter));
            const lighting = normal.y.mul(0.5).add(0.5);
            
            color.assign(vec4(vec3(1.0, 0.5, 0.2).mul(lighting), 1.0));
          });
          Break()
          return; // Early exit
        });
        
        // Sphere tracing: march by distance to surface
        t.addAssign(dist.max(0.01)); // Ensure we always move forward
        
        If(t.greaterThan(maxDistance), () => {
          Break()
          return;
        });
        
      });
      
      // Debug: Uncomment to visualize camera position
      // return vec4(
      //   rayOrigin.x.div(10).add(0.5),
      //   rayOrigin.y.div(10).add(0.5),
      //   rayOrigin.z.div(10).add(0.5),
      //   1
      // );
      
      // Debug: Uncomment to visualize ray direction
      // return vec4(rayDir.mul(0.5).add(0.5), 1);
      
      return color;
    });

    return raymarchingFn
  }, [sceneColor, sceneDepth, raymarchingUniforms])

   return [raymarchingPassNode, raymarchingUniforms] as const
}