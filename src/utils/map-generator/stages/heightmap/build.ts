import { OCEAN_DEPTH_METERS } from './defaults';
import {
  coastNoiseMeters,
  landAmplitudeMeters,
  landShape,
  oceanHeightMeters,
  shelfDepthMeters,
  warpPoint,
} from './fields';
import { GenerationCancelledError } from '../../errors';
import type { WorldSpace } from '../../space';
import type {
  CharacterZone,
  GeologicalStructure,
  HeightmapConfig,
  LandmassLayout,
  ShelfDefinition,
  WorldPoint,
} from '../../types';
import {
  nearestStructure,
  structureBounds,
  type StructureInfluence,
  structureSegments,
} from '../landmass';
import { createZoneSampler } from '../structure-character';

/** Marks a cell outside every shelf in the shelf index map. */
export const OUTSIDE_SHELF = -1;

/** Everything the heightmap needs, without raster cells or renderer data. */
export interface HeightmapFieldInput {
  readonly layout: LandmassLayout;
  readonly zones: readonly CharacterZone[];
  readonly noiseMap: Float32Array;
  readonly worldMask: Uint8Array;
  readonly config: HeightmapConfig;
  readonly worldSizeMeters: number;
  readonly space: WorldSpace;
  /** Checked every row, so a large grid stays cancellable. */
  readonly signal?: AbortSignal;
  /** Called with 0..1 after each structure plus its shelf pass. */
  readonly report?: (progress: number) => void;
}

/** The heightfield and the shelf identity per cell. */
export interface HeightmapField {
  readonly heightmap: Float32Array;
  readonly shelfIndexMap: Int16Array;
}

/**
 * Builds the heightfield per cell, in metres: land that tapers to the sea datum
 * at the coast, a shelf band that falls to the open ocean, and the flat ocean
 * floor everywhere else. Cells outside the world mask stay at the datum and
 * outside every shelf. The map is read top-down.
 */
export function buildHeightmap(input: HeightmapFieldInput): HeightmapField {
  const { layout, zones, noiseMap, worldMask, config, worldSizeMeters, space, signal, report } =
    input;
  const heightmap = new Float32Array(space.sampleWidth * space.sampleHeight);
  heightmap.fill(oceanHeightMeters(OCEAN_DEPTH_METERS));
  const shelfIndexMap = new Int16Array(space.sampleWidth * space.sampleHeight).fill(OUTSIDE_SHELF);

  const amplitude = landAmplitudeMeters(worldSizeMeters, config.relief);
  const zonesByStructure = groupZones(zones);
  const noiseAt = createNoiseReader(noiseMap, space);
  const shelvesById = new Map(layout.shelves.map((shelf, index) => [shelf.id, { shelf, index }]));
  let done = 0;

  for (const structure of layout.structures) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const structureZones = zonesByStructure.get(structure.id);
    const entry = shelvesById.get(structure.shelfId);
    if (structureZones && structureZones.length > 0 && entry) {
      fillStructure(
        heightmap,
        shelfIndexMap,
        structure,
        entry.shelf,
        entry.index,
        structureZones,
        noiseAt,
        amplitude,
        config,
        worldMask,
        space,
        signal
      );
    }
    done++;
    report?.(done / Math.max(1, layout.structures.length));
  }

  clearOutsideWorld(heightmap, shelfIndexMap, worldMask);
  return { heightmap, shelfIndexMap };
}

/** Runs one structure's cells only, bounded by its influence box plus its shelf. */
function fillStructure(
  heightmap: Float32Array,
  shelfIndexMap: Int16Array,
  structure: GeologicalStructure,
  shelf: ShelfDefinition,
  shelfIndex: number,
  zones: readonly CharacterZone[],
  noiseAt: (point: WorldPoint) => number,
  amplitude: number,
  config: HeightmapConfig,
  worldMask: Uint8Array,
  space: WorldSpace,
  signal: AbortSignal | undefined
): void {
  const bounds = structureBounds(structure);
  const influence: StructureInfluence = {
    id: structure.id,
    // The shelf reaches past the structure bounds, so the query box grows by it.
    bounds: {
      minX: bounds.minX - shelf.width,
      maxX: bounds.maxX + shelf.width,
      minY: bounds.minY - shelf.width,
      maxY: bounds.maxY + shelf.width,
    },
    segments: structureSegments(structure),
  };
  const sampler = createZoneSampler(structure);
  const from = space.normalizedToCell(bounds.minX - shelf.width, bounds.minY - shelf.width);
  const to = space.normalizedToCell(bounds.maxX + shelf.width, bounds.maxY + shelf.width);

  for (let y = from.y; y <= to.y; y++) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    for (let x = from.x; x <= to.x; x++) {
      const index = y * space.sampleWidth + x;
      if (worldMask[index] === 0) {
        continue;
      }
      const point = space.cellToNormalized(x, y);
      const probe = nearestStructure([influence], point);
      if (!probe) {
        continue;
      }

      if (probe.distance > probe.radius) {
        // First shelf wins, so the depth and the index always agree on a cell
        // two shelves meet on.
        if (shelfIndexMap[index] !== OUTSIDE_SHELF) {
          continue;
        }
        const shelfDepth = shelfDepthMeters(
          probe.distance,
          probe.radius,
          shelf.width,
          shelf.targetDepth,
          shelf.falloff
        );
        if (shelfDepth === undefined) {
          continue;
        }
        // The shelf is shallow water: it lifts the open-ocean floor towards the
        // coast.
        heightmap[index] = Math.max(heightmap[index], -shelfDepth);
        shelfIndexMap[index] = shelfIndex;
        continue;
      }

      const t = probe.radius > 0 ? probe.distance / probe.radius : 0;
      const shape = landShape(
        zones,
        (geometry, zonePoint) => sampler.influence(geometry, zonePoint).weight,
        t,
        point
      );
      const noise = warpedNoise(point, noiseAt, config.featureScale);
      const height = Math.max(0, shape * amplitude + coastNoiseMeters(noise, shape, amplitude));
      // Structures of one group may touch; the higher ground wins, so the seam
      // between two influence boxes never cuts a ridge down.
      heightmap[index] = Math.max(heightmap[index], height);
    }
  }
}

/** Cells outside the world keep the datum and no shelf. */
function clearOutsideWorld(
  heightmap: Float32Array,
  shelfIndexMap: Int16Array,
  worldMask: Uint8Array
): void {
  for (let index = 0; index < worldMask.length; index++) {
    if (worldMask[index] === 0) {
      heightmap[index] = 0;
      shelfIndexMap[index] = OUTSIDE_SHELF;
    }
  }
}

/** Nearest-cell reader of the shared noise raster. */
function createNoiseReader(
  noiseMap: Float32Array,
  space: WorldSpace
): (point: WorldPoint) => number {
  return point => {
    const cell = space.normalizedToCell(point.x, point.y);
    return noiseMap[cell.y * space.sampleWidth + cell.x];
  };
}

/** Shared noise read at a point bent by the domain warp, so the coast wobbles. */
function warpedNoise(
  point: WorldPoint,
  noiseAt: (point: WorldPoint) => number,
  featureScale: number
): number {
  const warp = {
    x: noiseAt(point) - 0.5,
    y: noiseAt({ x: point.x, y: Math.min(1, point.y + 0.01) }) - 0.5,
  };
  return noiseAt(warpPoint(point, { x: warp.x * 2, y: warp.y * 2 }, featureScale));
}

function groupZones(zones: readonly CharacterZone[]): Map<string, CharacterZone[]> {
  const groups = new Map<string, CharacterZone[]>();
  for (const zone of zones) {
    const list = groups.get(zone.structureId);
    if (list) {
      list.push(zone);
    } else {
      groups.set(zone.structureId, [zone]);
    }
  }
  return groups;
}
