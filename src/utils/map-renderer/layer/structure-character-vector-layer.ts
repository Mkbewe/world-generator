import { type LayerRenderStatistics, MapLayer, type MapSize, type TileReporter } from './layer';
import {
  paintStructureCharacter,
  type StructureCharacterScene,
} from './structure-character-painter';
import type { VectorLayerFactory } from './vector-layer-factory';
import { containsZone } from './zone-geometry';
import { isLandmassLayout, isStructureZones } from '../../map-generator';
import {
  createMarginSampler,
  OCEAN_MARGIN_METERS,
  segmentsDistance,
  type StructureSegment,
  structureSegments,
  type WorldSampler,
} from '../../map-generator/stages/landmass';
import type { CharacterZone, GeologicalStructure, LandmassLayout } from '../../map-generator/types';
import { characterStyle } from '../../map-layers';
import type { WorldShape } from '../../world-shape';
import { type RenderTarget, targetKey } from '../preview-targets';
import type { LayerHit, MapBaseLayerId, SpatialMask } from '../types';

interface ZoneEntry {
  readonly structure: GeologicalStructure;
  readonly zones: readonly CharacterZone[];
  readonly whole?: CharacterZone;
  readonly segments: readonly StructureSegment[];
}

export interface StructureCharacterLayerOptions {
  /** Structure bodies drawn under the zones; absent on restored maps. */
  readonly layout?: LandmassLayout;
  /** World mask the layer clips its hits to, e.g. a restored map edge. */
  readonly mask?: SpatialMask;
  /** World outline painted as the ocean background. */
  readonly shape?: WorldShape;
  /** Physical world size for the ocean-margin clip; absent on restored maps. */
  readonly dimensionsMeters?: {
    readonly widthMeters: number;
    readonly heightMeters: number;
  };
}

/**
 * Vector layer over the structure character zones: every structure body tinted
 * by its `whole` zone, with the split zone recolouring the corridor it covers.
 */
export class StructureCharacterVectorLayer extends MapLayer {
  private readonly entries: readonly ZoneEntry[];
  private readonly scene: StructureCharacterScene;
  private readonly mask?: SpatialMask;
  private readonly margin?: WorldSampler;

  constructor(
    id: MapBaseLayerId,
    size: MapSize,
    zones: readonly CharacterZone[],
    options: StructureCharacterLayerOptions = {}
  ) {
    super(id, size);
    this.entries = buildEntries(zones, options.layout);
    this.scene = {
      zones,
      layout: options.layout,
      size,
      shape: options.shape,
      dimensionsMeters: options.dimensionsMeters,
    };
    this.mask = options.mask;
    this.margin =
      options.shape && options.dimensionsMeters
        ? createMarginSampler(
            options.shape,
            {
              widthMeters: options.dimensionsMeters.widthMeters,
              heightMeters: options.dimensionsMeters.heightMeters,
              sampleWidth: size.width,
              sampleHeight: size.height,
            },
            OCEAN_MARGIN_METERS
          )
        : undefined;
  }

  /** Split zone under the cell, else the whole zone of the structure there. */
  sample(x: number, y: number): LayerHit | undefined {
    if (this.mask && !this.mask.contains(x, y)) {
      return undefined;
    }
    const point = {
      x: x / Math.max(1, this.size.width - 1),
      y: y / Math.max(1, this.size.height - 1),
    };
    if (this.margin && !this.margin(point)) {
      return undefined;
    }
    const entry = this.structureAt(point);
    if (!entry) {
      return undefined;
    }
    const zone = this.zoneAt(entry, point) ?? entry.whole;
    return zone ? { id: zone.id, label: characterStyle(zone.character).label } : undefined;
  }

  private structureAt(point: { readonly x: number; readonly y: number }): ZoneEntry | undefined {
    const probe: readonly StructureSegment[] = [
      { from: point, to: point, fromRadius: 0, toRadius: 0 },
    ];
    let hit: ZoneEntry | undefined;
    let nearest = Infinity;
    for (const entry of this.entries) {
      // `segmentsDistance` is negative inside the influence corridor.
      const distance = segmentsDistance(probe, entry.segments);
      if (distance <= 0 && distance < nearest) {
        nearest = distance;
        hit = entry;
      }
    }
    return hit;
  }

  private zoneAt(
    entry: ZoneEntry,
    point: { readonly x: number; readonly y: number }
  ): CharacterZone | undefined {
    return entry.zones.find(
      zone => zone.geometry.kind !== 'whole' && containsZone(entry.structure, zone.geometry, point)
    );
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
    paintStructureCharacter(context, target.projection, this.scene);
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
    paintStructureCharacter(context, target.projection, this.scene);
    this.overviewSurfaceTarget = target;
  }

  protected statisticsDetails(): Partial<LayerRenderStatistics> {
    // Zones are neither nodes nor edges, so no misleading counts are reported.
    return {};
  }
}

/** Groups zones per structure and precomputes what hit testing needs. */
function buildEntries(
  zones: readonly CharacterZone[],
  layout: LandmassLayout | undefined
): readonly ZoneEntry[] {
  if (!layout) {
    return [];
  }
  const byStructure = new Map<string, CharacterZone[]>();
  for (const zone of zones) {
    const list = byStructure.get(zone.structureId) ?? [];
    list.push(zone);
    byStructure.set(zone.structureId, list);
  }
  return layout.structures.map(structure => {
    const structureZones = byStructure.get(structure.id) ?? [];
    return {
      structure,
      zones: structureZones,
      whole: structureZones.find(zone => zone.geometry.kind === 'whole'),
      segments: structureSegments(structure),
    };
  });
}

export const structureCharacterVectorLayerFactory: VectorLayerFactory = {
  id: 'structure-character',
  supports: isStructureZones,
  create({ id, size, value, info, mask, shape, dimensionsMeters }) {
    if (!isStructureZones(value)) {
      throw new Error('Invalid structure zone data.');
    }
    const layout = isLandmassLayout(info.landmassLayout) ? info.landmassLayout : undefined;
    return new StructureCharacterVectorLayer(id, size, value, {
      layout,
      mask,
      shape,
      dimensionsMeters,
    });
  },
};
