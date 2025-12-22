import OperatorNode from "three/src/nodes/math/OperatorNode.js";
import { float, vec2, cos, sin } from "three/tsl";
import { Node } from "three/webgpu";

/**
 * Rotates a 2D UV coordinate around a center point.
 *
 * @param uvCoord - The UV coordinate to rotate
 * @param angle - Rotation angle in radians
 * @param center - Center point for rotation (default: 0.5, 0.5)
 * @returns Rotated UV coordinate
 *
 * @example
 * ```tsx
 * // Rotate UV by 30 degrees around center
 * const rotated = rotateUV(uv(), Math.PI / 6);
 * ```
 */
export function rotateUV(
  uvCoord: Node,
  angle: number | Node,
  center: { x: number; y: number } = { x: 0.5, y: 0.5 }
): OperatorNode {
  const angleNode = typeof angle === "number" ? float(angle) : angle;
  const cosA = cos(angleNode);
  const sinA = sin(angleNode);

  // Translate to origin
  const centered = uvCoord.sub(vec2(center.x, center.y));

  // Apply rotation matrix: [cos, -sin; sin, cos]
  const rotatedX = centered.x.mul(cosA).sub(centered.y.mul(sinA));
  const rotatedY = centered.x.mul(sinA).add(centered.y.mul(cosA));

  // Translate back
  return vec2(rotatedX, rotatedY).add(vec2(center.x, center.y));
}

