export interface PreviewViewportSize {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export class PreviewViewport {
  private animationFrame?: number;
  private resizeObserver?: ResizeObserver;

  constructor(
    private readonly element: HTMLElement,
    private readonly onResize: (size: PreviewViewportSize) => void
  ) {}

  start(): void {
    this.scheduleMeasurement();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleMeasurement());
      this.resizeObserver.observe(this.element);
    }
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  measure(): PreviewViewportSize | undefined {
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

  private scheduleMeasurement(): void {
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = undefined;
      const size = this.measure();
      if (size) {
        this.onResize(size);
      }
    });
  }
}
