/* eslint-disable @typescript-eslint/no-explicit-any */
import { useUniforms } from "@/lib/tsl";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Fn,
  int,
  screenUV,
  texture,
  textureLoad,
  textureSize,
  uniform,
  uniformTexture,
  vec3,
  vec4,
} from "three/tsl";
import { Matrix4, SpotLight, TextureNode, Vector3 } from "three/webgpu";

interface VolumetricLightingPassOptions {
  sceneColor: TextureNode;
  sceneDepth: TextureNode;
  spotLight: SpotLight;
}

export function useVolumetricLightingPass({
  sceneColor,
  sceneDepth,
  spotLight,
}: VolumetricLightingPassOptions) {
  const u = useUniforms(() => ({
    // Camera uniforms - manually managed
    cameraPosition: uniform(new Vector3()),
    cameraProjectionMatrix: uniform(new Matrix4()),
    cameraProjectionMatrixInverse: uniform(new Matrix4()),
    cameraWorldMatrix: uniform(new Matrix4()),
    cameraViewMatrix: uniform(new Matrix4()),
    cameraNear: uniform(0.1),
    cameraFar: uniform(1000),
    // Light uniforms
    lightPosition: uniform(new Vector3()),
    lightDirection: uniform(new Vector3()),
    lightColor: uniform(new Vector3(1, 1, 1)),
    lightIntensity: uniform(1.0),
    lightAngle: uniform(Math.PI / 4),
    shadowMap: uniformTexture(),
    // Shadow matrix
    shadowMatrix: uniform(new Matrix4()),
    // Volumetric parameters
    numSamples: uniform(32),
    scatteringStrength: uniform(0.08),
    stepSize: uniform(0.1),
    // Debug
    debugMode: uniform(0), // 0 = normal, 1 = show spot cone, 2 = show shadow map, 3 = show lit areas
  }));

  const camera = useThree((s) => s.camera);

  // Update camera and light uniforms every frame
  useFrame(({}) => {
    camera.updateMatrixWorld();
    u.cameraPosition.value.copy(camera.position);
    u.cameraProjectionMatrix.value.copy(
      camera.projectionMatrix
    );
    u.cameraProjectionMatrixInverse.value.copy(
      camera.projectionMatrixInverse
    );
    u.cameraWorldMatrix.value.copy(camera.matrixWorld);
    u.cameraViewMatrix.value.copy(camera.matrixWorldInverse);
    u.cameraNear.value = camera.near;
    u.cameraFar.value = camera.far;

    // Update light uniforms
    spotLight.updateMatrixWorld();
    u.lightPosition.value.copy(spotLight.position);
    u.lightDirection.value
      .set(0, 0, -1)
      .applyQuaternion(spotLight.quaternion);
    u.lightIntensity.value = spotLight.intensity;
    u.lightAngle.value = spotLight.angle;

    // Update shadow matrix if shadow is enabled
    if (spotLight.shadow && spotLight.shadow.map?.depthTexture) {
       
      u.shadowMap.value = spotLight.shadow.map.depthTexture as any
      
      u.shadowMatrix.value
        .copy(spotLight.shadow.camera.projectionMatrix)
        .multiply(spotLight.shadow.camera.matrixWorldInverse);
    }
  }, -100);

  const frameCount = useRef(0)
  useFrame(({gl, scene, camera}) => {
    frameCount.current++
    if(frameCount.current < 2) {
      gl.setRenderTarget(null)
      gl.render(scene, camera)
    }
  }, -1000)

  // useCustomDepthPass({
  //   width: 1024,
  //   height: 1024,
  // });

  const t = texture(u.shadowMap)
  // const t = texture().onRenderUpdate(() => {
  //   if(spotLight.shadow?.map?.depthTexture) {
  //     return spotLight.shadow.map.depthTexture
  //   }
  // })
  
  const volumetricPassNode = useMemo(() => {

    const volumetricFn = Fn(() => {
      const uv = screenUV;
      const color = vec4(sceneColor.sample(uv)).toVar();
      color.a.assign(1);

      const texSize = textureSize(t, int(0));
      
      // Convert UV [0,1] to pixel coordinates [0, width/height]
      const pixelCoord = uv.mul(texSize).floor().toVar();
      
      // Load depth value (no filtering, direct pixel access)
      const shadowMapDepth = textureLoad(t, pixelCoord, 0).r;

      // For debug: show shadow map (boosted to see values)
      color.rgb.assign(vec3(shadowMapDepth.pow(20)));

      return color;
    });

    return volumetricFn;
  }, [sceneColor, t]);

  return [volumetricPassNode, u] as const;
}

