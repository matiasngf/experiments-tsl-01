"use client";

import { useGLTF } from "@react-three/drei";
import { ComponentProps, forwardRef, useMemo } from "react";
import * as THREE from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Object_4: THREE.Mesh;
    Object_6: THREE.Mesh;
    Object_7: THREE.Mesh;
    Object_8: THREE.Mesh;
    Object_9: THREE.Mesh;
    Object_10: THREE.Mesh;
    Object_11: THREE.Mesh;
    Object_12: THREE.Mesh;
    Object_13: THREE.Mesh;
    Object_14: THREE.Mesh;
    Object_15: THREE.Mesh;
    Object_16: THREE.Mesh;
    Object_17: THREE.Mesh;
    Object_18: THREE.Mesh;
    Object_19: THREE.Mesh;
    Object_20: THREE.Mesh;
    Object_21: THREE.Mesh;
    Object_22: THREE.Mesh;
    Object_23: THREE.Mesh;
    Object_24: THREE.Mesh;
    Object_25: THREE.Mesh;
    Object_26: THREE.Mesh;
    Object_27: THREE.Mesh;
    Object_28: THREE.Mesh;
    Object_29: THREE.Mesh;
    Object_31: THREE.Mesh;
    Object_32: THREE.Mesh;
    Object_33: THREE.Mesh;
    Object_34: THREE.Mesh;
    Object_36: THREE.Mesh;
    Object_38: THREE.Mesh;
    Object_40: THREE.Mesh;
    Object_42: THREE.Mesh;
    Object_44: THREE.Mesh;
    Object_45: THREE.Mesh;
    Object_46: THREE.Mesh;
    Object_47: THREE.Mesh;
  };
  materials: {
    water: THREE.MeshStandardMaterial;
    "Material.001": THREE.MeshStandardMaterial;
    Material: THREE.MeshStandardMaterial;
    "Material.003": THREE.MeshStandardMaterial;
    "Material.002": THREE.MeshStandardMaterial;
    fog_transparent_019: THREE.MeshStandardMaterial;
  };
};

export interface CityModelProps extends ComponentProps<"group"> {
  excludeWater?: boolean;
  excludeFog?: boolean;
}

export const CityModel = forwardRef<THREE.Group, CityModelProps>(
  function CityModel({ excludeWater = true, excludeFog = true, ...props }, ref) {
    const { nodes, materials } = useGLTF(
      "/models/modular_city/scene.gltf"
    ) as unknown as GLTFResult;

    // Clone materials for independent control
    const clonedMaterials = useMemo(() => {
      return {
        "Material.001": materials["Material.001"].clone(),
        Material: materials.Material.clone(),
        "Material.003": materials["Material.003"].clone(),
        "Material.002": materials["Material.002"].clone(),
      };
    }, [materials]);

    return (
      <group ref={ref} {...props} dispose={null}>
        <group name="Sketchfab_model" rotation={[-Math.PI / 2, 0, 0]}>
          <group name="root">
            <group name="GLTF_SceneRootNode" rotation={[Math.PI / 2, 0, 0]}>
              {/* Water - conditionally rendered */}
              {!excludeWater && (
                <group
                  name="water_0"
                  position={[0, -0.016, 3.347]}
                >
                  <mesh
                    name="Object_4"
                    geometry={nodes.Object_4.geometry}
                    material={materials.water}
                  />
                </group>
              )}

              {/* Main City Section - city_1 */}
              <group
                name="city_1"
                position={[0, -0.016, -0.25]}
              >
                {/* Building meshes with Material.001 */}
                <mesh name="Object_6" geometry={nodes.Object_6.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_7" geometry={nodes.Object_7.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_8" geometry={nodes.Object_8.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_9" geometry={nodes.Object_9.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_10" geometry={nodes.Object_10.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_11" geometry={nodes.Object_11.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_12" geometry={nodes.Object_12.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_13" geometry={nodes.Object_13.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_14" geometry={nodes.Object_14.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_15" geometry={nodes.Object_15.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_16" geometry={nodes.Object_16.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_17" geometry={nodes.Object_17.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_18" geometry={nodes.Object_18.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_19" geometry={nodes.Object_19.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_20" geometry={nodes.Object_20.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_21" geometry={nodes.Object_21.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_22" geometry={nodes.Object_22.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_23" geometry={nodes.Object_23.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_24" geometry={nodes.Object_24.geometry} material={clonedMaterials["Material.001"]} />
                {/* Emissive Material meshes */}
                <mesh name="Object_25" geometry={nodes.Object_25.geometry} material={clonedMaterials.Material} />
                <mesh name="Object_26" geometry={nodes.Object_26.geometry} material={clonedMaterials.Material} />
                <mesh name="Object_27" geometry={nodes.Object_27.geometry} material={clonedMaterials.Material} />
                {/* Red emissive */}
                <mesh name="Object_28" geometry={nodes.Object_28.geometry} material={clonedMaterials["Material.003"]} />
                {/* Green emissive */}
                <mesh name="Object_29" geometry={nodes.Object_29.geometry} material={clonedMaterials["Material.002"]} />
              </group>

              {/* Secondary City Block - all sections overlay at the same position */}
              {/* Bringing closer to origin (originally at ~[9.877, -1.173, 21.302]) */}
              <group
                name="city_secondary"
                position={[-15, -1, 5]}
                rotation={[0, 0.571, 0]}
              >
                {/* city.001_2 - emissive lights + building + signals */}
                <mesh name="Object_31" geometry={nodes.Object_31.geometry} material={clonedMaterials.Material} />
                <mesh name="Object_32" geometry={nodes.Object_32.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_33" geometry={nodes.Object_33.geometry} material={clonedMaterials["Material.003"]} />
                <mesh name="Object_34" geometry={nodes.Object_34.geometry} material={clonedMaterials["Material.002"]} />
                
                {/* city.002_3 - additional building */}
                <mesh name="Object_36" geometry={nodes.Object_36.geometry} material={clonedMaterials["Material.001"]} />
                
                {/* city.003_4 - additional building */}
                <mesh name="Object_38" geometry={nodes.Object_38.geometry} material={clonedMaterials["Material.001"]} />
                
                {/* city.004_5 - red emissive element */}
                <mesh name="Object_40" geometry={nodes.Object_40.geometry} material={clonedMaterials["Material.003"]} />
              </group>

              {/* FogPlanes - conditionally rendered */}
              {!excludeFog && (
                <group
                  name="FogPlanes_6"
                  position={[1.238, -0.791, 11.632]}
                  rotation={[Math.PI / 2, 0, -0.385]}
                >
                  <mesh
                    name="Object_42"
                    geometry={nodes.Object_42.geometry}
                    material={materials.fog_transparent_019}
                  />
                </group>
              )}

              {/* City Section 005 - same position as city_1 (they overlay) */}
              <group
                name="city005_7"
                position={[0, -0.016, -0.25]}
              >
                <mesh name="Object_44" geometry={nodes.Object_44.geometry} material={clonedMaterials["Material.001"]} />
                <mesh name="Object_45" geometry={nodes.Object_45.geometry} material={clonedMaterials.Material} />
                <mesh name="Object_46" geometry={nodes.Object_46.geometry} material={clonedMaterials["Material.003"]} />
                <mesh name="Object_47" geometry={nodes.Object_47.geometry} material={clonedMaterials["Material.002"]} />
              </group>

              {/* Lightning mesh (Object_49) excluded - we use our own LightningSystem */}
            </group>
          </group>
        </group>
      </group>
    );
  }
);

useGLTF.preload("/models/modular_city/scene.gltf");

