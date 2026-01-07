/* eslint-disable react-hooks/immutability */

"use client";

/**
 * Volumetric Lighting with Shadow Map Sampling
 * 
 * This experiment demonstrates:
 * - Spotlight with shadow mapping
 * - Post-processing volumetric lighting effect
 * - Raymarching to sample shadow maps
 * - Adding light where rays are lit by the spotlight
 */

import { usePostProcessing } from "@/lib/gpu/use-postprocessing";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useControls } from "leva";
import { ComponentRef, Suspense, useEffect, useMemo, useRef } from "react";
import {
  Camera,
  Mesh,
  SpotLight,
  WebGPURenderer,
} from "three/webgpu";
import { useVolumetricLightingPass } from "./volumetric-lighting-pass";

export default function VolumetricLightingPage() {
  return (
    <div className="w-screen h-screen bg-zinc-950">
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 50 }}
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
  const cameraRef = useRef<ComponentRef<typeof PerspectiveCamera> | null>(null);
  
  // Create spotlight early so hooks can use it
  const spotLightRef = useMemo(() => {
    const light = new SpotLight(0xffffff, 100, 50, 30, 0, 1);
    light.position.set(0, 10, 0);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 50;
    light.shadow.bias = -0.001;
    return light;
  }, []);
  
  const cubeRef = useRef<Mesh>(null!);
  const groundRef = useRef<Mesh>(null!);

  // Leva controls
  const {
    lightIntensity,
    lightAngle,
    lightPenumbra,
    numSamples,
    scatteringStrength,
    stepSize,
    volumetricEnabled,
    debugMode,
  } = useControls({
    volumetricEnabled: {
      value: true,
      label: "Volumetric Effect",
    },
    lightIntensity: {
      value: 100,
      min: 0,
      max: 200,
      step: 1,
      label: "Light Intensity",
    },
    lightAngle: {
      value: Math.PI / 6,
      min: 0,
      max: Math.PI / 2,
      step: 0.01,
      label: "Spotlight Angle",
    },
    lightPenumbra: {
      value: 0.2,
      min: 0,
      max: 1,
      step: 0.01,
      label: "Light Penumbra",
    },
    numSamples: {
      value: 32,
      min: 8,
      max: 64,
      step: 1,
      label: "Ray Samples",
    },
    scatteringStrength: {
      value: 0.08,
      min: 0,
      max: 0.2,
      step: 0.001,
      label: "Scattering",
    },
    stepSize: {
      value: 0.1,
      min: 0.05,
      max: 0.5,
      step: 0.01,
      label: "Step Size",
    },
    debugMode: {
      value: 0,
      options: {
        Normal: 0,
        "Show Spot Cone": 1,
        "Show Shadow Map": 2,
      },
      label: "Debug Mode",
    },
  });

  const { postProcessing, scenePass } = usePostProcessing({ enabled: true, priority: 1 });

  // Create volumetric lighting pass
  const [volumetricPassNode, volumetricUniforms] = useVolumetricLightingPass({
    sceneColor: scenePass.getTextureNode("output"),
    sceneDepth: scenePass.getTextureNode("depth"),
    spotLight: spotLightRef,
  });

  // Update volumetric parameters from Leva controls
  useEffect(() => {
    volumetricUniforms.numSamples.value = numSamples;
    volumetricUniforms.scatteringStrength.value = scatteringStrength;
    volumetricUniforms.stepSize.value = stepSize;
    volumetricUniforms.debugMode.value = debugMode;
  }, [numSamples, scatteringStrength, stepSize, debugMode, volumetricUniforms]);

  // Setup post-processing output
  useEffect(() => {
    if (volumetricEnabled) {
      postProcessing.outputNode = volumetricPassNode();
    } else {
      const sceneColor = scenePass.getTextureNode("output");
      postProcessing.outputNode = sceneColor;
    }
    postProcessing.needsUpdate = true;
  }, [postProcessing, volumetricPassNode, scenePass, volumetricEnabled]);

  // Update light properties
  useEffect(() => {
    spotLightRef.intensity = lightIntensity;
    spotLightRef.angle = lightAngle;
    spotLightRef.penumbra = lightPenumbra;
  }, [lightIntensity, lightAngle, lightPenumbra, spotLightRef]);

  return (
    <>
      <OrbitControls camera={cameraRef.current as Camera} />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[5, 5, 5]} />

      {/* Ambient light for basic visibility */}
      <ambientLight intensity={0.1} />

      {/* Spotlight with shadow mapping */}
      <primitive object={spotLightRef} />

      {/* Cube in center */}
      <mesh ref={cubeRef} position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 3, 2]} />
        <meshPhysicalMaterial color={0x8844ff} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Ground plane */}
      <mesh
        ref={groundRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={0x333333} roughness={0.9} metalness={0.1} />
      </mesh>
    </>
  );
}

