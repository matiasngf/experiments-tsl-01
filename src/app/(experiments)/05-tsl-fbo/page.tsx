/* eslint-disable react-hooks/immutability */
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { WebGPURenderer, MeshBasicNodeMaterial } from "three/webgpu";
import { uv, vec3, sin, mix } from "three/tsl";
import {
  useUniforms,
  useMaterial,
  useRenderTarget,
  useQuadShader,
} from "@/lib/tsl";
import {
  Mesh,
  Color,
  Scene as ThreeScene,
  PerspectiveCamera,
  BoxGeometry,
  AmbientLight,
} from "three";

export default function TSLFboPage() {
  return (
    <div className="w-screen h-screen bg-zinc-950">
      <Canvas
        gl={async (props) => {
          const renderer = new WebGPURenderer(props as never);
          await renderer.init();
          return renderer;
        }}
        camera={{ position: [0, 0, 4], fov: 45 }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <CubeRenderDemo />
      <QuadShaderDemo />
    </>
  );
}

/**
 * Demonstrates useRenderTarget - renders a spinning cube to a texture.
 */
function CubeRenderDemo() {
  const gl = useThree((state) => state.gl);

  // Create render target
  const renderTarget = useRenderTarget({ width: 256, height: 256 });

  // Uniforms for animation
  const uniforms = useUniforms({ time: 0 });

  // Offscreen scene with animated cube
  const { scene, camera, cube } = useMemo(() => {
    const scene = new ThreeScene();
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3);
    scene.add(new AmbientLight(0xffffff, 1));

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicNodeMaterial();
    const cube = new Mesh(geometry, material);
    scene.add(cube);

    return { scene, camera, cube };
  }, []);

  // Animated material for the cube
  const cubeMaterial = useMaterial(
    MeshBasicNodeMaterial,
    (mat) => {
      const r = sin(uniforms.time).mul(0.5).add(0.5);
      const g = sin(uniforms.time.add(2)).mul(0.5).add(0.5);
      const b = sin(uniforms.time.add(4)).mul(0.5).add(0.5);
      mat.colorNode = vec3(r, g, b);
    },
    [uniforms]
  );

  useFrame(({ clock }) => {
    uniforms.time.value = clock.elapsedTime;

    cube.material = cubeMaterial;
    cube.rotation.x = clock.elapsedTime * 0.5;
    cube.rotation.y = clock.elapsedTime * 0.7;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gl.setRenderTarget(renderTarget as any);
    gl.setClearColor(0x222222, 1);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
  });

  return (
    <mesh position={[-1.5, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={renderTarget.texture} />
    </mesh>
  );
}

/**
 * Demonstrates useQuadShader - renders a fullscreen gradient effect.
 */
function QuadShaderDemo() {
  // Create render target for the quad shader output
  const renderTarget = useRenderTarget({ width: 256, height: 256 });

  // Uniforms for animation
  const uniforms = useUniforms({
    time: 0,
    colorA: new Color(0xff6b6b),
    colorB: new Color(0x4ecdc4),
  });

  // Gradient material with time-based animation
  const gradientMaterial = useMaterial(
    MeshBasicNodeMaterial,
    (mat) => {
      // Animated gradient based on UV and time
      const wave = sin(uv().x.mul(6.28).add(uniforms.time)).mul(0.5).add(0.5);
      mat.colorNode = mix(uniforms.colorA, uniforms.colorB, wave);
    },
    [uniforms]
  );

  // Use the quad shader hook to render to the target
  useQuadShader({
    material: gradientMaterial,
    renderTarget: renderTarget,
    autoRender: true,
  });

  // Update time
  useFrame(({ clock }) => {
    uniforms.time.value = clock.elapsedTime;
  });

  return (
    <mesh position={[1.5, 0, 0]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial map={renderTarget.texture} />
    </mesh>
  );
}
