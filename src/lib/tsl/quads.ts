import {
  BufferGeometry,
  Float32BufferAttribute,
  OrthographicCamera,
} from "three";

/**
 * Creates a fullscreen triangle geometry covering the NDC [-1,1] range.
 *
 * Uses a single oversized triangle instead of a quad (two triangles) for better performance.
 * The triangle extends beyond the screen bounds but the GPU clips it automatically.
 *
 * @returns A BufferGeometry with position and uv attributes
 */
export function createQuadGeometry(): BufferGeometry {
  const quadGeo = new BufferGeometry();
  const vertices = new Float32Array([
    -1, -1, 0, // bottom left
     3, -1, 0, // extended right, bottom
    -1,  3, 0, // extended left, top
  ]);
  const uvs = new Float32Array([
    0, 0, // bottom left
    2, 0, // extended right, bottom
    0, 2, // extended left, top
  ]);
  quadGeo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  quadGeo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  return quadGeo;
}

/**
 * Pre-created fullscreen quad geometry instance.
 * Reuse this instead of creating new geometry for each fullscreen pass.
 */
export const quadGeometry = createQuadGeometry();

/**
 * Creates an orthographic camera configured for fullscreen quad rendering.
 * Positioned at z=1 looking at the origin, with frustum matching NDC coordinates.
 *
 * @returns An OrthographicCamera ready for fullscreen rendering
 */
export function createQuadCamera(): OrthographicCamera {
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 2);
  camera.position.set(0, 0, 1);
  return camera;
}

/**
 * Pre-created orthographic camera for fullscreen quad rendering.
 * Reuse this instead of creating a new camera for each fullscreen pass.
 */
export const quadCamera = createQuadCamera();

