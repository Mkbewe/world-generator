import { OCEAN_DEPTH_METERS } from './defaults';
import {
  coastNoiseMeters,
  landAmplitudeMeters,
  landShape,
  oceanHeightMeters,
  warpPoint,
} from './fields';
import type { WorldSpace } from '../../space';
import type { CharacterZone, GeologicalStructure, HeightmapConfig, WorldPoint } from '../../types';
import {
  nearestStructure,
  structureBounds,
  type StructureInfluence,
  structureSegments,
} from '../landmass';
import { createZoneSampler } from '../structure-character';

/** Everything the heightmap needs, without raster cells or renderer data. */
export interface HeightmapFieldInput {
  readonly structures: readonly GeologicalStructure[];
  readonly zones: readonly CharacterZone[];
  readonly noiseMap: Float32Array;
  readonly config: HeightmapConfig;
  readonly worldSizeMeters: number;
  readonly space: WorldSpace;
}

/**
 * Builds the land height per cell, in metres: positive land that tapers to the
 * sea datum at the coast, and the flat ocean floor everywhere else. The shelf
 * and the shelf index are a later step; the map is read top-down.
 */
export function buildHeightmap(input: HeightmapFieldInput): Float32Array {
  const { structures, zones, noiseMap, config, worldSizeMeters, space } = input;
  const heightmap = new Float32Array(space.sampleWidth * space.sampleHeight);
  heightmap.fill(oceanHeightMeters(OCEAN_DEPTH_METERS));

  const amplitude = landAmplitudeMeters(worldSizeMeters, config.relief);
  const zonesByStructure = groupZones(zones);
  const noiseAt = createNoiseReader(noiseMap, space);

  for (const structure of structures) {
    const structureZones = zonesByStructure.get(structure.id);
    if (!structureZones || structureZones.length === 0) {
      continue;
    }
    fillStructure(heightmap, structure, structureZones, noiseAt, amplitude, config, space);
  }
  return heightmap;
}

/** Runs one structure's cells only, bounded by its influence box. */
function fillStructure(
  heightmap: Float32Array,
  structure: GeologicalStructure,
  zones: readonly CharacterZone[],
  noiseAt: (point: WorldPoint) => number,
  amplitude: number,
  config: HeightmapConfig,
  space: WorldSpace
): void {
  const bounds = structureBounds(structure);
  const entry: StructureInfluence = {
    id: structure.id,
    bounds,
    segments: structureSegments(structure),
  };
  const sampler = createZoneSampler(structure);
  const from = space.normalizedToCell(bounds.minX, bounds.minY);
  const to = space.normalizedToCell(bounds.maxX, bounds.maxY);

  for (let y = from.y; y <= to.y; y++) {
    for (let x = from.x; x <= to.x; x++) {
      const point = space.cellToNormalized(x, y);
      const probe = nearestStructure([entry], point);
      if (!probe || probe.distance > probe.radius) {
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
      const index = y * space.sampleWidth + x;
      // Structures of one group may touch; the higher ground wins, so the seam
      // between two influence boxes never cuts a ridge down.
      heightmap[index] = Math.max(heightmap[index], height);
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
