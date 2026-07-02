/**
 * Minimal typings for gifenc@1 (no bundled types). Declared `export =` because
 * the package is CJS whose named exports older Node lexers (v20) can't detect —
 * consumers must default-import the namespace and destructure.
 */
declare module 'gifenc' {
  interface GifEncoderOptions {
    auto?: boolean;
  }
  interface WriteFrameOptions {
    palette?: number[][];
    delay?: number;
    /** Netscape loop count; 0 = forever. Omit entirely to play once. */
    repeat?: number;
    transparent?: boolean;
    dispose?: number;
    first?: boolean;
  }
  interface GifEncoder {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: WriteFrameOptions,
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  const gifenc: {
    GIFEncoder(options?: GifEncoderOptions): GifEncoder;
    quantize(rgba: Uint8Array | Uint8ClampedArray, maxColors: number): number[][];
    applyPalette(rgba: Uint8Array | Uint8ClampedArray, palette: number[][]): Uint8Array;
  };
  export = gifenc;
}
