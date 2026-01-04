/* eslint-disable react-hooks/purity */
/* eslint-disable react-hooks/immutability */
"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useRef, useMemo, ComponentProps } from "react";
import * as THREE from "three";

interface LightningState {
  nextBlinkTime: number;
  isOn: boolean;
  blinkEndTime: number;
}

interface LightningBoltProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Single lightning bolt with independent blinking behavior
 */
function LightningBolt({ position, rotation = [0, 0, 0], scale = 1 }: LightningBoltProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const stateRef = useRef<LightningState>({
    nextBlinkTime: randomRange(0.5, 3),
    isOn: false,
    blinkEndTime: 0,
  });

  // Create a unique emissive material for this lightning
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 10,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    return mat;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    const currentTime = performance.now() / 1000;
    const state = stateRef.current;

    if (state.isOn) {
      // Check if blink should end
      if (currentTime >= state.blinkEndTime) {
        // Turn off
        material.opacity = 0;
        material.emissiveIntensity = 0;
        state.isOn = false;
        state.nextBlinkTime = currentTime + randomRange(1, 5);
      }
    } else {
      // Check if should start blinking
      if (currentTime >= state.nextBlinkTime) {
        // Turn on
        material.opacity = 1;
        material.emissiveIntensity = 10;
        state.isOn = true;
        state.blinkEndTime = currentTime + randomRange(0.05, 0.2);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      scale={scale}
      material={material}
    >
      {/* Simple lightning shape using box geometries */}
      <boxGeometry args={[0.1, 3, 0.1]} />
    </mesh>
  );
}

/**
 * Lightning branch - a more complex lightning shape
 */
function LightningBranch({ position, rotation = [0, 0, 0], scale = 1 }: LightningBoltProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef<LightningState>({
    nextBlinkTime: randomRange(0.5, 4),
    isOn: false,
    blinkEndTime: 0,
  });

  // Create a unique emissive material for this lightning
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xaaccff,
      emissiveIntensity: 15,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    return mat;
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;

    const currentTime = performance.now() / 1000;
    const state = stateRef.current;

    if (state.isOn) {
      if (currentTime >= state.blinkEndTime) {
        material.opacity = 0;
        material.emissiveIntensity = 0;
        state.isOn = false;
        state.nextBlinkTime = currentTime + randomRange(2, 6);
      } else {
        // Flicker effect while on
        const flicker = Math.random() > 0.3 ? 1 : 0.3;
        material.opacity = flicker;
        material.emissiveIntensity = 15 * flicker;
      }
    } else {
      if (currentTime >= state.nextBlinkTime) {
        material.opacity = 1;
        material.emissiveIntensity = 15;
        state.isOn = true;
        state.blinkEndTime = currentTime + randomRange(0.1, 0.4);
      }
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Main bolt */}
      <mesh material={material} position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 2.5, 0.08]} />
      </mesh>
      {/* Branch 1 */}
      <mesh material={material} position={[0.3, 0.5, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.06, 1.2, 0.06]} />
      </mesh>
      {/* Branch 2 */}
      <mesh material={material} position={[-0.2, -0.3, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.05, 0.8, 0.05]} />
      </mesh>
    </group>
  );
}

export interface LightningSystemProps extends ComponentProps<"group"> {
  count?: number;
}

/**
 * Lightning system that creates multiple lightning bolts
 * positioned around the city with random blinking behavior
 */
export const LightningSystem = forwardRef<THREE.Group, LightningSystemProps>(
  function LightningSystem({ count = 8, ...props }, ref) {
    // Generate random positions for lightning bolts
    const lightningPositions = useMemo(() => {
      const positions: Array<{
        position: [number, number, number];
        rotation: [number, number, number];
        scale: number;
        type: "bolt" | "branch";
      }> = [];

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radius = randomRange(8, 20);
        const height = randomRange(8, 15);

        positions.push({
          position: [
            Math.cos(angle) * radius + randomRange(-3, 3),
            height,
            Math.sin(angle) * radius + randomRange(-3, 3),
          ],
          rotation: [
            randomRange(-0.3, 0.3),
            randomRange(0, Math.PI * 2),
            randomRange(-0.5, 0.5),
          ],
          scale: randomRange(0.8, 1.5),
          type: Math.random() > 0.5 ? "bolt" : "branch",
        });
      }

      return positions;
    }, [count]);

    return (
      <group ref={ref} {...props}>
        {lightningPositions.map((config, index) =>
          config.type === "bolt" ? (
            <LightningBolt
              key={`bolt-${index}`}
              position={config.position}
              rotation={config.rotation}
              scale={config.scale}
            />
          ) : (
            <LightningBranch
              key={`branch-${index}`}
              position={config.position}
              rotation={config.rotation}
              scale={config.scale}
            />
          )
        )}
      </group>
    );
  }
);

