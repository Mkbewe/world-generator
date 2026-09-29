import { type LayerRenderStatistics, MapLayer, type MapSize, type TileReporter } from './layer';
import type { VectorLayerFactory } from './vector-layer-factory';
import { planarDistance } from '../../map-generator/space';
import { isGeologyPlan } from '../../map-generator/stages/geology';
import type { GeologicalAreaPlan, GeologyPlan, WorldPoint } from '../../map-generator/types';
import { characterStyle } from '../../map-layers';
import type { WorldShape } from '../../world-shape';
import { type RenderTarget, targetKey } from '../preview-targets';
import type { LayerHit, MapBaseLayerId, SpatialMask } from '../types';
import type { MapProjection } from '../view/view-transform';
import { traceWorldBoundary } from '../world-boundary-renderer';

/** How far the influence stretches across its axis at elongation 1. */
const ELONGATION_STRETCH = 2;

/**
 * Vector layer over the geology plan. It paints the influence extents — the
 * possible areas, not island outlines — and names the area under the pointer.
 */
export interface GeologyPlanLayerOptions {
  /** World mask the layer clips its hits to, e.g. a restored map edge. */
  readonly mask?: SpatialMask;
  /** World outline the painted influence is clipped to. */
  readonly shape?: WorldShape;
}

export class GeologyPlanVectorLayer extends MapLayer {
  constructor(
    id: MapBaseLayerId,
    size: MapSize,
    private readonly plan: GeologyPlan,
    private readonly options: GeologyPlanLayerOptions = {}
  ) {
    super(id, size);
  }

  /** Area whose influence contains the cell, if any. */
  sample(x: number, y: number): LayerHit | undefined {
    if (this.options.mask && !this.options.mask.contains(x, y)) {
      return undefined;
    }
    const point = {
      x: x / Math.max(1, this.size.width - 1),
      y: y / Math.max(1, this.size.height - 1),
    };
    const area = this.plan.areas.find(candidate => areaRadius(candidate, point) <= 1);
    return area ? { id: area.id } : undefined;
  }

  /** Draws the whole scene at once; the geometry is far smaller than a raster. */
  protected renderFrame(
    signal: AbortSignal,
    target: RenderTarget,
    context: CanvasRenderingContext2D,
    onTile?: TileReporter
  ): void {
    signal.throwIfAborted();
    const startedAt = performance.now();
    this.paint(context, target.projection);
    this.addFrameStatistics(performance.now() - startedAt, 0, 0);
    onTile?.(0, 0, target.width, target.height);
  }

  /** Paints the whole map once into a small surface, the fallback for fast view changes. */
  protected renderOverview(signal: AbortSignal): void {
    const target = this.fallbackTarget();
    if (!target) {
      return;
    }
    if (this.overviewSurfaceTarget && targetKey(this.overviewSurfaceTarget) === targetKey(target)) {
      return;
    }
    signal.throwIfAborted();
    const context = this.surfaceContext(this.overview, target);
    this.paint(context, target.projection);
    this.overviewSurfaceTarget = target;
  }

  /** Paints the plan, clipped to the world outline when the scene knows it. */
  private paint(context: CanvasRenderingContext2D, projection: MapProjection): void {
    const { shape } = this.options;
    if (shape) {
      context.save();
      context.beginPath();
      traceWorldBoundary(context, projection, this.size, shape);
      context.clip();
    }
    paintGeologyPlan(context, projection, this.size, this.plan);
    if (shape) {
      context.restore();
    }
  }

  protected statisticsDetails(): Partial<LayerRenderStatistics> {
    return { nodes: this.plan.areas.length };
  }
}

/** Normalized distance from the area centre, 1 at its influence edge. */
function areaRadius(area: GeologicalAreaPlan, point: WorldPoint): number {
  const dx = point.x - area.centre.x;
  const dy = point.y - area.centre.y;
  const along = dx * Math.cos(area.direction) + dy * Math.sin(area.direction);
  const across =
    (-dx * Math.sin(area.direction) + dy * Math.cos(area.direction)) *
    (1 + ELONGATION_STRETCH * area.elongation);
  return planarDistance({ x: along, y: across }, { x: 0, y: 0 }) / area.extent;
}

/** Paints one translucent ellipse per area; fixed areas get a solid outline. */
function paintGeologyPlan(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  size: MapSize,
  plan: GeologyPlan
): void {
  for (const area of plan.areas) {
    const centre = toCanvas(projection, size, area.centre);
    const radius = area.extent * Math.max(1, size.width - 1) * projection.cellSize;
    const across = radius / (1 + ELONGATION_STRETCH * area.elongation);
    const [red, green, blue] = characterStyle(area.relief).color;

    context.beginPath();
    context.ellipse(centre.x, centre.y, radius, across, area.direction, 0, Math.PI * 2);
    context.fillStyle = `rgba(${red}, ${green}, ${blue}, 0.18)`;
    context.fill();
    context.strokeStyle = `rgb(${red}, ${green}, ${blue})`;
    context.lineWidth = 1;
    context.setLineDash([]);
    context.stroke();

    for (const site of area.reefSites) {
      const reefCentre = toCanvas(projection, size, site.centre);
      const reefRadius = site.radius * Math.max(1, size.width - 1) * projection.cellSize;
      context.beginPath();
      context.ellipse(reefCentre.x, reefCentre.y, reefRadius, reefRadius, 0, 0, Math.PI * 2);
      context.setLineDash([]);
      context.lineWidth = 1;
      context.stroke();
    }
  }
  context.setLineDash([]);
}

function toCanvas(
  projection: MapProjection,
  size: MapSize,
  point: WorldPoint
): { readonly x: number; readonly y: number } {
  return {
    x: projection.left + (point.x * Math.max(1, size.width - 1) + 0.5) * projection.cellSize,
    y: projection.top + (point.y * Math.max(1, size.height - 1) + 0.5) * projection.cellSize,
  };
}

export const geologyPlanVectorLayerFactory: VectorLayerFactory = {
  id: 'geology',
  supports: isGeologyPlan,
  create({ id, size, value, mask, shape }) {
    if (!isGeologyPlan(value)) {
      throw new Error('Invalid geology plan data.');
    }
    return new GeologyPlanVectorLayer(id, size, value, { mask, shape });
  },
};
