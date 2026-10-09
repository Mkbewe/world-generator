import { paintLabels, regionCentres } from './geology-labels';
import { yieldToBrowser } from './geology-yield';
import { isGeologyPlan } from '../../../map-generator/stages/geology';
import type { GeologyPlan, WorldPoint } from '../../../map-generator/types';
import { geologyRegionColor } from '../../../map-layers';
import { type RenderTarget, targetKey } from '../../preview-targets';
import type { LayerHit, MapBaseLayerId, SpatialMask } from '../../types';
import type { VectorLayerFactory } from '../factories/vector-layer-factory';
import {
  type LayerPresentation,
  type LayerRenderStatistics,
  MapLayer,
  type MapSize,
} from '../layer';
import { regionBorderSegments, strokeRegionBorders } from '../region-preview/region-preview-border';
import {
  extendRegionOwners,
  paintRegionPixels,
  regionBorderDistances,
} from '../region-preview/region-preview-raster';

const FRAME_STRIPES = 8;
const HIGHLIGHT_COLOR = [124, 58, 237] as const;

/**
 * The plan paints in stripes and cannot show a partial frame; the presenter
 * keeps the previous frame until the whole one is ready and clips it to the
 * smooth world outline.
 */
const GEOLOGY_PRESENTATION: LayerPresentation = {
  showPartialFrame: false,
  cancelStaleRender: true,
  showStaleFrame: false,
  clipPresentation: true,
};

export interface GeologyPlanLayerOptions {
  readonly mask?: SpatialMask;
}

/** Neon region bodies separated by white space on one clipped world canvas. */
export class GeologyPlanVectorLayer extends MapLayer {
  private readonly colors: readonly (readonly [number, number, number])[];
  private readonly centres: readonly (WorldPoint | undefined)[];
  private readonly extendedOwners: Int16Array;
  private readonly distances: Float32Array;
  private readonly borders: Float64Array;
  private readonly tileCanvas = document.createElement('canvas');
  private highlightIndex = -1;

  constructor(
    id: MapBaseLayerId,
    size: MapSize,
    private readonly plan: GeologyPlan,
    private readonly options: GeologyPlanLayerOptions = {}
  ) {
    super(id, size);
    const raster = plan.regionRasterSize;
    this.colors = plan.regions.map((region, index) => geologyRegionColor(region.type, index));
    this.extendedOwners = extendRegionOwners(plan.regionOwnerMap, raster.width, raster.height);
    this.distances = regionBorderDistances(this.extendedOwners, raster.width, raster.height);
    this.borders = regionBorderSegments(this.extendedOwners, raster.width, raster.height, size);
    this.centres = regionCentres(this.extendedOwners, raster.width, raster.height);
  }

  override get presentation(): LayerPresentation {
    return GEOLOGY_PRESENTATION;
  }

  /** Repainting is enough for a selection: the derived rasters stay cached. */
  override applySelection(selection: string | undefined): boolean {
    const index = selection ? this.plan.regions.findIndex(region => region.id === selection) : -1;
    if (index === this.highlightIndex) {
      return false;
    }
    this.highlightIndex = index;
    this.invalidate();
    return true;
  }

  override paintFallbackDetails(context: CanvasRenderingContext2D, view: RenderTarget): void {
    strokeRegionBorders(context, this.borders, view.projection);
    this.paintRegionLabels(context, view);
  }

  protected override extraBufferBytes(): number {
    return (
      this.extendedOwners.byteLength +
      this.distances.byteLength +
      this.borders.byteLength +
      this.tileCanvas.width * this.tileCanvas.height * 4
    );
  }

  override dispose(): void {
    super.dispose();
    this.tileCanvas.width = this.tileCanvas.height = 0;
  }

  sample(x: number, y: number): LayerHit | undefined {
    if (this.options.mask?.contains(x, y) === false) {
      return undefined;
    }
    const raster = this.plan.regionRasterSize;
    const owners = this.plan.regionOwnerMap;
    const regions = this.plan.regions;
    const rasterX = Math.min(
      raster.width - 1,
      Math.max(0, Math.round((x / Math.max(1, this.size.width - 1)) * (raster.width - 1)))
    );
    const rasterY = Math.min(
      raster.height - 1,
      Math.max(0, Math.round((y / Math.max(1, this.size.height - 1)) * (raster.height - 1)))
    );
    const region = regions[owners[rasterY * raster.width + rasterX]];
    return region ? { id: region.id } : undefined;
  }

  protected async renderFrame(
    signal: AbortSignal,
    target: RenderTarget,
    context: CanvasRenderingContext2D
  ): Promise<void> {
    const tileHeight = Math.ceil(target.height / FRAME_STRIPES);
    for (let top = 0; top < target.height; top += tileHeight) {
      signal.throwIfAborted();
      const height = Math.min(tileHeight, target.height - top);
      const startedAt = performance.now();
      this.paintTile(context, target, 0, top, target.width, height);
      this.addFrameStatistics(performance.now() - startedAt, 1, target.width * height);
      if (top + height < target.height) {
        await yieldToBrowser();
      }
    }
    this.paintRegionLabels(context, target);
  }

  protected renderOverview(signal: AbortSignal): void {
    const target = this.fallbackTarget();
    if (
      !target ||
      (this.overviewSurfaceTarget && targetKey(this.overviewSurfaceTarget) === targetKey(target))
    ) {
      return;
    }
    signal.throwIfAborted();
    const context = this.surfaceContext(this.overview, target);
    this.paintTile(context, target, 0, 0, target.width, target.height, false);
    this.overviewSurfaceTarget = target;
  }

  protected statisticsDetails(): Partial<LayerRenderStatistics> {
    return { elements: { label: 'Regions', count: this.plan.regions.length } };
  }

  /** Anchors and type glyphs of the plan, drawn over the finished frame. */
  private paintRegionLabels(context: CanvasRenderingContext2D, target: RenderTarget): void {
    paintLabels({
      context,
      projection: target.projection,
      size: this.size,
      regions: this.plan.regions,
      centres: this.centres,
      mask: this.options.mask,
    });
  }

  private paintTile(
    context: CanvasRenderingContext2D,
    target: RenderTarget,
    left: number,
    top: number,
    width: number,
    height: number,
    showGutters = true
  ): void {
    const raster = this.plan.regionRasterSize;
    if (!this.extendedOwners.length) {
      return;
    }
    this.tileCanvas.width = width;
    this.tileCanvas.height = height;
    const tileContext = this.tileCanvas.getContext('2d');
    if (!tileContext) {
      throw new Error('Canvas is not available.');
    }
    const image = tileContext.createImageData(width, height);
    paintRegionPixels(image.data, {
      owners: this.extendedOwners,
      distances: this.distances,
      rasterWidth: raster.width,
      rasterHeight: raster.height,
      colors: this.colors,
      mapSize: this.size,
      projection: target.projection,
      left,
      top,
      width,
      height,
      showGutters,
      highlightOwner: this.highlightIndex,
      highlightColor: HIGHLIGHT_COLOR,
    });
    tileContext.putImageData(image, 0, 0);
    context.drawImage(this.tileCanvas, left, top);
  }
}

export const geologyPlanVectorLayerFactory: VectorLayerFactory = {
  id: 'geology',
  supports: isGeologyPlan,
  create({ id, size, value, mask }) {
    if (!isGeologyPlan(value)) {
      throw new Error('Invalid geology plan data.');
    }
    return new GeologyPlanVectorLayer(id, size, value, { mask });
  },
};
