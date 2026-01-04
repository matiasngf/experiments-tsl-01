import { cameraPosition, Fn, If, length, Loop, normalize, positionWorld, uniform, vec3, vec4, float, Break, dot, max } from "three/tsl";
import { MeshBasicNodeMaterial, Node } from "three/webgpu";

export function getRayMarchedMaterial() {
  const m = new MeshBasicNodeMaterial({transparent: true})

  const maxSteps = uniform(64);
  const maxDistance = uniform(10);
  const epsilon = uniform(0.005);
  const normalDelta = uniform(0.001);

  // SDF for a sphere
  const sphereSDF = Fn(([p]: [Node]) => {
    const sphereCenter = vec3(0.0, 0, 0.0);
    const sphereRadius = float(1);
    return length(p.sub(sphereCenter)).sub(sphereRadius);
  });

  // Calculate normal using finite differences
  const calcNormal = Fn(([p]: [Node]) => {
    const delta = normalDelta;
    const dx = vec3(delta, 0, 0);
    const dy = vec3(0, delta, 0);
    const dz = vec3(0, 0, delta);

    const gradX = sphereSDF(p.add(dx)).sub(sphereSDF(p.sub(dx)));
    const gradY = sphereSDF(p.add(dy)).sub(sphereSDF(p.sub(dy)));
    const gradZ = sphereSDF(p.add(dz)).sub(sphereSDF(p.sub(dz)));

    return normalize(vec3(gradX, gradY, gradZ));
  });

  const colorFn = Fn(() => {
    const c = vec4(0, 0, 0, 0).toVar();

    const surfacePos = positionWorld.toVar();
    const rayDir = normalize(surfacePos.sub(cameraPosition));
    
    const totalDist = float(0).toVar();
    const hitSurface = float(0).toVar();
    const hitPos = vec3(0).toVar();

    Loop({ start: 0, end: maxSteps, type: 'int' }, () => {
      // Current position along ray (IN WORLD SPACE)
      const pos = surfacePos.add(rayDir.mul(totalDist));

      const dist = sphereSDF(pos);

      // If we hit the surface
      If(dist.lessThan(epsilon), () => {
        hitSurface.assign(1);
        hitPos.assign(pos);
        Break();
      });

      // If we went too far
      If(totalDist.greaterThan(maxDistance), () => {
        Break();
      });

      // March forward
      totalDist.addAssign(dist);
    });

    // If we hit something, calculate lighting
    If(hitSurface.greaterThan(0.5), () => {
      const normal = calcNormal(hitPos);
      
      // Simple Lambert lighting
      const lightDir = normalize(vec3(1, 1, 1));
      const diffuse = max(dot(normal, lightDir), 0.0);
      
      // Base color with lighting
      const baseColor = vec3(0.8, 0.5, 0.3);
      const ambient = float(0.2);
      
      const finalColor = baseColor.mul(diffuse.add(ambient));
      c.rgb.assign(finalColor);
      c.a.assign(1); // Make it opaque when we hit
    });

    return c;
  });

  m.colorNode = colorFn();

  return m;
}