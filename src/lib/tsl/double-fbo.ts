import { RenderTarget } from "three/webgpu";
import type { RenderTargetOptions, Texture } from "three";

/**
 * A double-buffered framebuffer object (ping-pong buffer) for GPU computations.
 *
 * Uses WebGPU's RenderTarget instead of WebGLRenderTarget.
 * Manages two RenderTargets that can be swapped between read and write roles.
 * Essential for GPU-based simulations where you need to read from the previous
 * frame while writing to the current frame.
 *
 * @typeParam TTexture - The texture type for the render targets
 *
 * @example
 * ```tsx
 * const doubleFbo = new DoubleFbo(512, 512, {
 *   type: FloatType,
 * });
 *
 * // In render loop:
 * uniforms.previousFrame.value = doubleFbo.read.texture;
 * gl.setRenderTarget(doubleFbo.write);
 * gl.render(scene, camera);
 * doubleFbo.swap();
 * ```
 */
export class DoubleFbo<TTexture extends Texture | Texture[] = Texture> {
  private _read: RenderTarget<TTexture>;
  private _write: RenderTarget<TTexture>;

  constructor(
    width: number,
    height: number,
    options: RenderTargetOptions = {}
  ) {
    this._read = new RenderTarget<TTexture>(width, height, options);
    this._write = new RenderTarget<TTexture>(width, height, options);
  }

  /**
   * The render target to read from (contains previous frame data).
   */
  get read(): RenderTarget<TTexture> {
    return this._read;
  }

  /**
   * The render target to write to (current frame destination).
   */
  get write(): RenderTarget<TTexture> {
    return this._write;
  }

  /**
   * Swaps the read and write buffers.
   * Call this after rendering to make the current write buffer
   * available as the read buffer for the next frame.
   */
  swap(): void {
    const temp = this._read;
    this._read = this._write;
    this._write = temp;
  }

  /**
   * Sets the size of both internal render targets.
   * @param width The width of the render targets.
   * @param height The height of the render targets.
   */
  setSize(width: number, height: number): void {
    this._read.setSize(width, height);
    this._write.setSize(width, height);
  }

  /**
   * Disposes both internal render targets. Call this to free GPU resources.
   */
  dispose(): void {
    this._read.dispose();
    this._write.dispose();
  }

  /**
   * Resets the render targets with new options.
   * @param width The width of the new render targets.
   * @param height The height of the new render targets.
   * @param options RenderTargetOptions to use for the new render targets.
   */
  reset(
    width: number,
    height: number,
    options: RenderTargetOptions = {}
  ): void {
    this.dispose();
    this._read = new RenderTarget<TTexture>(width, height, options);
    this._write = new RenderTarget<TTexture>(width, height, options);
  }

  /**
   * Gets the width of the render targets.
   */
  get width(): number {
    return this._read.width;
  }

  /**
   * Gets the height of the render targets.
   */
  get height(): number {
    return this._read.height;
  }

  /**
   * Gets the texture of the read render target.
   */
  get texture(): TTexture {
    return this._read.texture;
  }
}

