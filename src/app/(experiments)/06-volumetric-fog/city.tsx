"use client";

import { ComponentProps, forwardRef } from "react";
import * as THREE from "three";
import { CityModel } from "./city-model";

export interface CityProps extends ComponentProps<"group"> {
  scale?: number;
}

/**
 * City component that wraps the city model and positions it at the origin.
 * Excludes water and fog planes by default.
 */
export const City = forwardRef<THREE.Group, CityProps>(function City(
  { scale = 1, ...props },
  ref
) {
  return (
    <group ref={ref} {...props}>
      <CityModel
        excludeWater={true}
        excludeFog={true}
        scale={scale}
        // Center the city at origin
        position={[0, 0, 0]}
      />
    </group>
  );
});

