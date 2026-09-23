import { type LayerRenderStatistics, MapLayer, type MapSize } from './layer';
import type { VectorLayerFactory } from './vector-layer-factory';
import { segmentsDistance } from '../../map-generator/stages/landmass-layout/collision';
import {
  type StructureSegment,
  structureSegments,
} from '../../map-generator/stages/landmass-layout/geometry';
import { isLandmassLayout } from '../../map-generator/stages/landmass-layout/validation';
import type { LandmassLayout } from '../../map-generator/types';
import type { LayerHit, MapBaseLayerId } from '../types';

interface LayerStructure {
  readonly id: string;
  readonly segments: readonly StructureSegment[];
}

/**
 * Vector layer over the landmass layout. It has no raster and no palette: the
 * readout asks it for the structure under the pointer, and its statistics count
 * nodes and edges instead of pixels. Drawing arrives with the preview task.
 */
export class LandmassLayoutVectorLayer extends MapLayer {
  private readonly structures: readonly LayerStructure[];

  constructor(
    id: MapBaseLayerId,
    size: MapSize,
    private readonly layout: LandmassLayout
  ) {
    super(id, size);
    this.structures = layout.structures.map(structure => ({
      id: structure.id,
      segments: structureSegments(structure),
    }));
  }

  /** Structure whose influence contains the cell, if any. */
  sample(x: number, y: number): LayerHit | undefined {
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

  protected paintTile(): void {
    // Nodes, edges and the width wireframe arrive with the preview task.
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
  create({ id, size, value }) {
    if (!isLandmassLayout(value)) {
      throw new Error('Invalid landmass layout data.');
    }
    return new LandmassLayoutVectorLayer(id, size, value);
  },
};
