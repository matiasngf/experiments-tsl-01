import { uv, float, fract, floor, vec2 } from "three/tsl";
import { Node } from "three/webgpu";

/**
 * Result of cell sampling calculation.
 * Used for pixelated/grid effects with perfect square cells.
 */
export interface CellSamplingResult {
  /** Integer cell coordinates (which cell we're in) */
  cellIndex: Node;
  /** UV that samples from the center of each cell (for pixelation effects) */
  cellCenterUV: Node;
  /** Local UV within cell, ranging from -0.5 to 0.5 (for SDF shapes) */
  localUV: Node;
  /** Number of cells horizontally (fractional, for perfect squares) */
  xDivisions: Node;
  /** Number of cells vertically (same as input yDivisions) */
  yDivisions: Node;
}

/**
 * Calculates cell-based UV sampling for grid effects with perfectly square cells.
 *
 * This function:
 * 1. Computes xDivisions from yDivisions × aspect to maintain square cells
 * 2. Centers the X axis so overflow is split evenly between left and right edges
 * 3. Returns cell coordinates and UVs for sampling and SDF operations
 *
 * @param yDivisions - Number of cells vertically (the "grid scale")
 * @param aspect - Viewport aspect ratio (width / height)
 * @returns Object containing cellIndex, cellCenterUV, localUV, and division counts
 *
 * @example
 * ```tsx
 * const { cellCenterUV, localUV } = cellSampling(uniforms.gridScale, uniforms.aspect);
 *
 * // Sample background at cell center for pixelation
 * const cellColor = backgroundFn(cellCenterUV);
 *
 * // Use localUV for SDF (e.g., circle)
 * const dist = localUV.length();
 * const circle = smoothstep(radius, radius.sub(0.05), dist);
 * ```
 */
export function cellSampling(
  yDivisions: Node,
  aspect: Node
): CellSamplingResult {
  // xDivisions = exact calculation for perfectly square cells
  const xDivisions = yDivisions.mul(aspect);

  // Center the X axis so overflow is split evenly between left and right
  // offset = (1 - fract(xDivisions)) * 0.5 / xDivisions
  const xOffset = float(1).sub(fract(xDivisions)).mul(0.5).div(xDivisions);
  const centeredUvX = uv().x.add(xOffset);

  // Scaled UV for grid calculations
  const scaledUV = vec2(centeredUvX.mul(xDivisions), uv().y.mul(yDivisions));

  // cellIndex = which cell we're in (integer coordinates)
  const cellIndex = floor(scaledUV);

  // cellCenterUV = UV that samples from the center of each cell
  const cellCenterUV = cellIndex.add(0.5).div(vec2(xDivisions, yDivisions));

  // localUV for SDF operations (local UV within cell, -0.5 to 0.5)
  const localUV = fract(scaledUV).sub(0.5);

  return {
    cellIndex,
    cellCenterUV,
    localUV,
    xDivisions,
    yDivisions,
  };
}

