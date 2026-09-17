export interface ViewportSize {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export const MAX_DEVICE_PIXEL_RATIO = 2;

/** Device pixel ratio used for drawing, capped to keep canvas memory sane. */
export function effectivePixelRatio(devicePixelRatio: number): number {
  return Math.min(MAX_DEVICE_PIXEL_RATIO, Math.max(1, devicePixelRatio));
}

export class Viewport {
  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly element: HTMLElement,
    private readonly onResize: (size: ViewportSize) => void
  ) {}

  start(): void {
    this.dispose();
    this.report();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.report());
      this.resizeObserver.observe(this.element);
    }
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
  }

  measure(): ViewportSize | undefined {
    const rect = this.element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return undefined;
    }

    return {
      width: rect.width,
      height: rect.height,
      devicePixelRatio: globalThis.devicePixelRatio ?? 1,
    };
  }

  /**
   * Resize observers run after layout and before paint, so measuring here keeps
   * the canvas in sync with its element without a frame of the old bitmap
   * stretched by the new box.
   */
  private report(): void {
    const size = this.measure();
    if (size) {
      this.onResize(size);
    }
  }
}
