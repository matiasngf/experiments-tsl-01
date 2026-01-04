import { useUniforms } from "@/lib/tsl";
import { useFrame, useThree } from "@react-three/fiber";

import { useMemo } from "react";
import { Break, float, Fn, If, length, Loop, normalize, screenUV, uniform, vec3, vec4 } from "three/tsl";
import { Matrix4, TextureNode, Vector3 } from "three/webgpu";
import { getCameraRayFn } from "./get-camera-ray";

export function useRaymarchingPass(sceneColor: TextureNode, sceneDepth: TextureNode) {

  const raymarchingUniforms = useUniforms(() => ({
    boxSize: uniform(1),
    // Camera uniforms - manually managed
    cameraPosition: uniform(new Vector3()),
    cameraProjectionMatrix: uniform(new Matrix4()),
    cameraProjectionMatrixInverse: uniform(new Matrix4()),
    cameraWorldMatrix: uniform(new Matrix4()),
    cameraViewMatrix: uniform(new Matrix4()),
    cameraNear: uniform(0.1),
    cameraFar: uniform(1000),
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
    raymarchingUniforms.cameraNear.value = camera.near;
    raymarchingUniforms.cameraFar.value = camera.far;
  }, -1);

  const raymarchingPassNode = useMemo(() => {
    const maxSteps = uniform(64);
    // Max distance is the difference between far and near planes
    const maxDistance = raymarchingUniforms.cameraFar.sub(raymarchingUniforms.cameraNear);

    const raymarchingFn = Fn(() => {
      const uv = screenUV;
      const color = vec4(sceneColor.sample(uv)).toVar();
      const sceneDepthValue = float(sceneDepth.sample(uv).r).toVar();

      const result = getCameraRayFn(
        {
          cameraPosition: raymarchingUniforms.cameraPosition,
          cameraProjectionMatrixInverse: raymarchingUniforms.cameraProjectionMatrixInverse,
          cameraWorldMatrix: raymarchingUniforms.cameraWorldMatrix,
          cameraNear: raymarchingUniforms.cameraNear,
          uv,
        }
      )

      const rayDir = result.get('rayDir')
      const rayOrigin = result.get('rayOrigin')

      // === RAYMARCHING LOOP ===
      const t = float(0.0).toVar();
  
      Loop({ start: 0, end: maxSteps, type: 'int' }, () => {
        
        // Current position along ray (IN WORLD SPACE)
        const pos = rayOrigin.add(rayDir.mul(t)).toVar();
        
        // Example: Sphere SDF at world position (0, 1, 0) with radius 0.5
        const sphereCenter = vec3(0.0, 0, 0.0);
        const sphereRadius = 2;
        const dist = length(pos.sub(sphereCenter)).sub(sphereRadius);
        
        // Hit detection
        If(dist.lessThan(0.005), () => {
          
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
      
      return color;
    });

    return raymarchingFn
  }, [sceneColor, sceneDepth, raymarchingUniforms])

   return [raymarchingPassNode, raymarchingUniforms] as const
}

