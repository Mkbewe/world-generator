import { sampleOceanCurrentArrows, traceOceanCurrentArrows } from '../../ocean-current';
import type { RenderTarget } from '../../preview-targets';
import type { LayerHit, MapBaseLayerId, SpatialMask } from '../../types';
import { effectivePixelRatio } from '../../viewport';
import type { VectorLayerFactory } from '../factories/vector-layer-factory';
import { type LayerPresentation, MapLayer, type MapSize } from '../layer';

/** Backdrop of the preview, matching the world-shape layer. */
const BACKGROUND_COLOR = 'rgb(16, 42, 67)';
const HALO_COLOR = 'rgba(0, 0, 0, 0.35)';
const HALO_WIDTH = 2.5;
const CURRENT_COLOR = 'rgba(235, 245, 255, 0.95)';
const CURRENT_WIDTH = 1.25;

const PRESENTATION: LayerPresentation = {
  showPartialFrame: true,
  cancelStaleRender: false,
  showStaleFrame: true,
  clipPresentation: true,
};

/** Draws the BaseClimate current field as arrows over the world. */
export class OceanCurrentLayer extends MapLayer {
  constructor(
    id: MapBaseLayerId,
    size: MapSize,
    private readonly map: Float32Array,
    private readonly strength: Float32Array,
    private readonly mask?: SpatialMask
  ) {
    super(id, size);
  }

  override get presentation(): LayerPresentation {
    return PRESENTATION;
  }

  sample(x: number, y: number): LayerHit | undefined {
    if (x < 0 || y < 0 || x >= this.size.width || y >= this.size.height) {
      return undefined;
    }
    if (this.mask && !this.mask.contains(x, y)) {
      return undefined;
    }
    const index = y * this.size.width + x;
    const angle = this.map[index];
    const strength = this.strength[index];
    if (!Number.isFinite(angle) || !Number.isFinite(strength)) {
      return undefined;
    }
    return { id: 'ocean-current', oceanCurrent: { angle, strength } };
  }

  protected renderFrame(
    signal: AbortSignal,
    target: RenderTarget,
    context: CanvasRenderingContext2D
  ): void {
    signal.throwIfAborted();
    const startedAt = performance.now();
    this.paint(context, target);
    this.addFrameStatistics(performance.now() - startedAt, 1, target.width * target.height);
  }

  protected renderOverview(signal: AbortSignal): void {
    this.paintOverview(signal, (context, target) => this.paint(context, target));
  }

  private paint(context: CanvasRenderingContext2D, target: RenderTarget): void {
    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(0, 0, target.width, target.height);
    if (!this.mask) {
      return;
    }
    const ratio = effectivePixelRatio(window.devicePixelRatio);
    const arrows = sampleOceanCurrentArrows(
      this.mask,
      this.map,
      this.strength,
      target.projection,
      ratio
    );
    if (arrows.length === 0) {
      return;
    }
    context.beginPath();
    traceOceanCurrentArrows(context, arrows, ratio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = HALO_COLOR;
    context.lineWidth = HALO_WIDTH * ratio;
    context.stroke();
    context.strokeStyle = CURRENT_COLOR;
    context.lineWidth = CURRENT_WIDTH * ratio;
    context.stroke();
  }
}

export const oceanCurrentLayerFactory: VectorLayerFactory = {
  id: 'ocean-currents',
  supports: value => value instanceof Float32Array,
  create({ id, size, value, data, mask }) {
    if (!(value instanceof Float32Array) || value.length !== size.width * size.height) {
      throw new Error('Invalid ocean-current map data.');
    }
    const strength = data.oceanCurrentStrength;
    if (!(strength instanceof Float32Array) || strength.length !== value.length) {
      throw new Error('Invalid ocean-current strength data.');
    }
    return new OceanCurrentLayer(id, size, value, strength, mask);
  },
};
