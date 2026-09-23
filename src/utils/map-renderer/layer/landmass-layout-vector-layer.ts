import { type LandmassScene, paintLandmassLayout } from './landmass-layout-painter';
import { type LayerRenderStatistics, MapLayer, type MapSize, type TileReporter } from './layer';
import type { VectorLayerFactory } from './vector-layer-factory';
import { segmentsDistance } from '../../map-generator/stages/landmass-layout/collision';
import {
  type StructureSegment,
  structureSegments,
} from '../../map-generator/stages/landmass-layout/geometry';
import { isLandmassLayout } from '../../map-generator/stages/landmass-layout/validation';
import type { LandmassLayout } from '../../map-generator/types';
import type { WorldShape } from '../../world-shape';
import { type RenderTarget, targetKey } from '../preview-targets';
import type { LayerHit, MapBaseLayerId, SpatialMask } from '../types';

interface LayerStructure {
  readonly id: string;
  readonly segments: readonly StructureSegment[];
}

export interface LandmassLayoutLayerOptions {
  /** World mask the layer clips its hits to, e.g. a restored map edge. */
  readonly mask?: SpatialMask;
  /** World outline painted as the ocean background. */
  readonly shape?: WorldShape;
}

/**
 * Vector layer over the landmass layout. It has no raster and no palette: the
 * readout asks it for the structure under the pointer, its statistics count
 * nodes and edges, and it paints a technical view of the geological plan.
 */
export class LandmassLayoutVectorLayer extends MapLayer {
  private readonly structures: readonly LayerStructure[];
  private readonly scene: LandmassScene;
  private readonly mask?: SpatialMask;

  constructor(
    id: MapBaseLayerId,
    size: MapSize,
    private readonly layout: LandmassLayout,
    options: LandmassLayoutLayerOptions = {}
  ) {
    super(id, size);
    this.structures = layout.structures.map(structure => ({
      id: structure.id,
      segments: structureSegments(structure),
    }));
    this.scene = { layout, size, shape: options.shape };
    this.mask = options.mask;
  }

  /** Structure whose influence contains the cell, if any. */
  sample(x: number, y: number): LayerHit | undefined {
    if (this.mask && !this.mask.contains(x, y)) {
      return undefined;
    }
    const point = {
      x: x / Math.max(1, this.size.width - 1),
      y: y / Math.max(1, this.size.height - 1),
    };
    const probe: readonly StructureSegment[] = [
      { from: point, to: point, fromRadius: 0, toRadius: 0 },
    ];
    let hit: LayerHit | undefined;
    let nearest = Infinity;

    for (const structure of this.structures) {
      const distance = segmentsDistance(probe, structure.segments);
      if (distance <= 0 && distance < nearest) {
        nearest = distance;
        hit = { id: structure.id };
      }
    }
    return hit;
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
    paintLandmassLayout(context, target.projection, this.scene);
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
    paintLandmassLayout(context, target.projection, this.scene);
    this.overviewSurfaceTarget = target;
  }

  protected statisticsDetails(): Partial<LayerRenderStatistics> {
    return {
      nodes: this.layout.structures.reduce((total, structure) => total + structure.nodes.length, 0),
      edges: this.layout.structures.reduce((total, structure) => total + structure.edges.length, 0),
    };
  }
}

export const landmassLayoutVectorLayerFactory: VectorLayerFactory = {
  id: 'landmass-layout',
  supports: isLandmassLayout,
  create({ id, size, value, mask, shape }) {
    if (!isLandmassLayout(value)) {
      throw new Error('Invalid landmass layout data.');
    }
    return new LandmassLayoutVectorLayer(id, size, value, { mask, shape });
  },
};
