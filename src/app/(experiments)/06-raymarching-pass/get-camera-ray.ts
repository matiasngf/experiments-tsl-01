import { vec2, vec3, vec4, normalize } from "three/tsl"
import { Node } from "three/webgpu"
import { TypedFn } from "@/lib/tsl/typed-fn"
import { typedStruct } from "@/lib/tsl/typed-struct"

interface GetCameraRayParams extends Record<string, unknown> {
  cameraPosition: Node
  cameraProjectionMatrixInverse: Node
  cameraWorldMatrix: Node
  cameraNear: Node
  uv: Node
}

export const getCameraRay = (params: GetCameraRayParams) => {
  // === RAY DIRECTION ===
  // Calculate ray direction first (from camera position)
  
  // IMPORTANT: For WebGPU, flip Y BEFORE converting to NDC
  // screenUV goes from (0,0) at bottom-left to (1,1) at top-right
  // WebGPU NDC has Y going up, so we need to flip it
  const flippedUV = vec2(params.uv.x, params.uv.y.oneMinus()).toVar();
  
  // Now convert flipped UV (0 to 1) to NDC (-1 to +1)
  const ndc = flippedUV.mul(2.0).sub(1.0).toVar();
  
  // Create a point in clip space (NDC with depth = 0.5)
  const clipSpacePoint = vec4(ndc.x, ndc.y, 0.5, 1.0).toVar();
  
  // Transform to view space using inverse projection matrix
  const viewSpacePoint = vec4(
    params.cameraProjectionMatrixInverse.mul(clipSpacePoint)
  ).toVar();
  
  // Perspective divide
  const viewPoint = viewSpacePoint.xyz.div(viewSpacePoint.w).toVar();
  
  // Transform from view space to world space
  const worldPoint = vec3(
    params.cameraWorldMatrix.mul(vec4(viewPoint, 1.0)).xyz
  ).toVar();
  
  // Ray direction = normalize(worldPoint - cameraPosition)
  const rayDir = normalize(worldPoint.sub(params.cameraPosition)).toVar();
  
  // === RAY ORIGIN ===
  // Place ray origin at the camera's near plane
  // rayOrigin = cameraPosition + rayDir * cameraNear
  const rayOrigin = vec3(params.cameraPosition).add(rayDir.mul(params.cameraNear)).toVar();

  return {
    rayOrigin,
    rayDir
  }
}

// TSL struct definition for CameraRay
export const CameraRay = typedStruct({
  rayOrigin: 'vec3',
  rayDir: 'vec3'
}, "CameraRay")

/**
 * Calculates the camera ray origin and direction
 * Ray origin is placed at the camera's near plane
 * 
 * @example
```
const cameraRay = getCameraRayFn({
  cameraPosition,
  cameraProjectionMatrixInverse,
  cameraWorldMatrix,
  cameraNear,
  uv,
})

const rayDir = cameraRay.get('rayDir')
const rayOrigin = cameraRay.get('rayOrigin')
```
 */
export const getCameraRayFn = TypedFn(({ cameraPosition, cameraProjectionMatrixInverse, cameraWorldMatrix, cameraNear, uv }: GetCameraRayParams) => {
  const result = getCameraRay({
    cameraPosition, cameraProjectionMatrixInverse, cameraWorldMatrix, cameraNear, uv
  })
   
  return CameraRay(result.rayOrigin, result.rayDir)
})

