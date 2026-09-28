import type { HeightmapNoiseBands } from './bands';
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
  readonly bands: HeightmapNoiseBands;
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

/** Builds land and one smoothly combined seabed field in metres. */
export function buildHeightmap(input: HeightmapFieldInput): HeightmapField {
  const { layout, zones, bands, worldMask, config, worldSizeMeters, space, signal, report } = input;
  const heightmap = new Float32Array(space.sampleWidth * space.sampleHeight);
  heightmap.fill(oceanHeightMeters(OCEAN_DEPTH_METERS));
  const shelfIndexMap = new Int16Array(space.sampleWidth * space.sampleHeight).fill(OUTSIDE_SHELF);

  const amplitude = landAmplitudeMeters(worldSizeMeters, config.relief);
  const zonesByStructure = groupZones(zones);
  const shelvesById = new Map(layout.shelves.map((shelf, index) => [shelf.id, { shelf, index }]));
  let done = 0;

  for (const structure of layout.structures) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    const structureZones = zonesByStructure.get(structure.id);
    const entry = shelvesById.get(structure.shelfId);
    if (structureZones && structureZones.length > 0 && entry) {
      fillLand(
        heightmap,
        structure,
        structureZones,
        bands,
        amplitude,
        config,
        worldMask,
        space,
        signal
      );
    }
    done++;
    report?.(done / Math.max(1, layout.structures.length) / 2);
  }

  fillShelves(
    heightmap,
    shelfIndexMap,
    layout,
    shelvesById,
    zonesByStructure,
    worldMask,
    space,
    signal,
    report
  );
  clearOutsideWorld(heightmap, shelfIndexMap, worldMask);
  return { heightmap, shelfIndexMap };
}

/** Raises land inside a structure's corridor. */
function fillLand(
  heightmap: Float32Array,
  structure: GeologicalStructure,
  zones: readonly CharacterZone[],
  bands: HeightmapNoiseBands,
  amplitude: number,
  config: HeightmapConfig,
  worldMask: Uint8Array,
  space: WorldSpace,
  signal: AbortSignal | undefined
): void {
  const bounds = structureBounds(structure);
  const influence: StructureInfluence = {
    id: structure.id,
    bounds,
    segments: structureSegments(structure),
  };
  const sampler = createZoneSampler(structure);
  const from = space.normalizedToCell(bounds.minX, bounds.minY);
  const to = space.normalizedToCell(bounds.maxX, bounds.maxY);

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
        continue;
      }

      const t = probe.radius > 0 ? probe.distance / probe.radius : 0;
      const shape = landShape(
        zones,
        (geometry, zonePoint) => sampler.influence(geometry, zonePoint).weight,
        t,
        point
      );
      const noise = warpedNoise(point, bands, config.featureScale);
      const height = Math.max(0, shape * amplitude + coastNoiseMeters(noise, shape, amplitude));
      // Structures of one group may touch; the higher ground wins, so the seam
      // between two influence boxes never cuts a ridge down.
      heightmap[index] = Math.max(heightmap[index], height);
    }
  }
}

interface ShelfPass {
  readonly shelf: ShelfDefinition;
  readonly shelfIndex: number;
  readonly influences: readonly StructureInfluence[];
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
}

/** One seabed pass combines all overlapping structures before writing a row. */
function fillShelves(
  heightmap: Float32Array,
  shelfIndexMap: Int16Array,
  layout: LandmassLayout,
  shelvesById: ReadonlyMap<string, { shelf: ShelfDefinition; index: number }>,
  zonesByStructure: ReadonlyMap<string, readonly CharacterZone[]>,
  worldMask: Uint8Array,
  space: WorldSpace,
  signal?: AbortSignal,
  report?: (progress: number) => void
): void {
  const passes: ShelfPass[] = [];
  for (const structure of layout.structures) {
    const entry = shelvesById.get(structure.shelfId);
    if (!entry || !zonesByStructure.get(structure.id)?.length) {
      continue;
    }
    const { shelf, index } = entry;
    const bounds = structureBounds(structure);
    const expanded = {
      minX: bounds.minX - shelf.width,
      maxX: bounds.maxX + shelf.width,
      minY: bounds.minY - shelf.width,
      maxY: bounds.maxY + shelf.width,
    };
    passes.push({
      shelf,
      shelfIndex: index,
      influences: [{ id: structure.id, bounds: expanded, segments: structureSegments(structure) }],
      from: space.normalizedToCell(expanded.minX, expanded.minY),
      to: space.normalizedToCell(expanded.maxX, expanded.maxY),
    });
  }

  const { sampleWidth, sampleHeight } = space;
  const oceanFloor = oceanHeightMeters(OCEAN_DEPTH_METERS);
  const riseSquaredSum = new Float64Array(sampleWidth);
  const bestHeight = new Float32Array(sampleWidth);
  const owner = new Int16Array(sampleWidth);

  for (let y = 0; y < sampleHeight; y++) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    riseSquaredSum.fill(0);
    bestHeight.fill(-Infinity);
    owner.fill(OUTSIDE_SHELF);

    for (const pass of passes) {
      if (y < pass.from.y || y > pass.to.y) {
        continue;
      }
      for (let x = pass.from.x; x <= pass.to.x; x++) {
        const index = y * sampleWidth + x;
        if (worldMask[index] === 0 || heightmap[index] >= 0) {
          continue;
        }
        const point = space.cellToNormalized(x, y);
        const probe = nearestStructure(pass.influences, point);
        if (!probe) {
          continue;
        }
        const depth = shelfDepthMeters(
          probe.distance,
          probe.radius,
          pass.shelf.width,
          pass.shelf.targetDepth,
          pass.shelf.falloff
        );
        if (depth === undefined) {
          continue;
        }
        const candidate = Math.fround(-depth);
        const rise = candidate - oceanFloor;
        if (rise <= 0) {
          continue;
        }
        // The quadratic union keeps a single shelf unchanged and lifts shared
        // water instead of making a dark trough between two shelf profiles.
        riseSquaredSum[x] += rise * rise;
        if (
          candidate > bestHeight[x] ||
          (candidate === bestHeight[x] && pass.shelfIndex < owner[x])
        ) {
          bestHeight[x] = candidate;
          owner[x] = pass.shelfIndex;
        }
      }
    }

    for (let x = 0; x < sampleWidth; x++) {
      if (riseSquaredSum[x] <= 0) {
        continue;
      }
      const height = Math.fround(Math.min(-1, oceanFloor + Math.sqrt(riseSquaredSum[x])));
      if (height > oceanFloor) {
        const index = y * sampleWidth + x;
        heightmap[index] = height;
        shelfIndexMap[index] = owner[x];
      }
    }
    report?.(0.5 + ((y + 1) / sampleHeight) * 0.5);
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

/**
 * Coast noise at a point: the medium band bends the domain, the fine band adds
 * the detail. The large band joins the field rewrite (GEO-04).
 */
function warpedNoise(point: WorldPoint, bands: HeightmapNoiseBands, featureScale: number): number {
  const warp = {
    x: bands.medium(point) - 0.5,
    y: bands.medium({ x: point.x, y: Math.min(1, point.y + 0.01) }) - 0.5,
  };
  return bands.fine(warpPoint(point, { x: warp.x * 2, y: warp.y * 2 }, featureScale));
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
