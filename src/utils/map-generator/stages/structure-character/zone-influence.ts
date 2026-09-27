import type {
  CharacterZone,
  GeologicalStructure,
  TerrainProfile,
  WorldPoint,
  ZoneGeometry,
} from '../../types';
import {
  type StructurePath,
  structurePaths,
  type StructureSegment,
  structureSegments,
} from '../landmass';

/** A hard footprint for the preview and a soft weight for terrain blending. */
export interface ZoneInfluence {
  readonly covered: boolean;
  readonly weight: number;
}

export interface ZonePathSlice {
  readonly points: readonly WorldPoint[];
  readonly radii: readonly number[];
}

export interface ZoneSampler {
  influence(geometry: ZoneGeometry, point: WorldPoint): ZoneInfluence;
  dominant(zones: readonly CharacterZone[], point: WorldPoint): CharacterZone | undefined;
  profile(zones: readonly CharacterZone[], point: WorldPoint): TerrainProfile | undefined;
  slice(geometry: Extract<ZoneGeometry, { pathId: string }>): ZonePathSlice;
}

const PROFILE_FIELDS: readonly (keyof TerrainProfile)[] = [
  'elevation',
  'roughness',
  'mountainStrength',
  'hillStrength',
  'plateauStrength',
  'lakePotential',
  'erosionStrength',
  'coastalCliffStrength',
];

/** Builds one reusable spatial port for a structure's zones. */
export function createZoneSampler(structure: GeologicalStructure): ZoneSampler {
  const paths = new Map(structurePaths(structure).map(path => [path.id, path]));
  const segments = structureSegments(structure);

  const influence = (geometry: ZoneGeometry, point: WorldPoint): ZoneInfluence => {
    if (geometry.kind === 'whole') {
      return { covered: true, weight: 1 };
    }
    if (geometry.kind === 'point') {
      const distance = Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y);
      const corridor = nearestOnSegments(segments, point);
      const depth = Math.min(
        geometry.influenceRadius - distance,
        corridor.radius - corridor.distance
      );
      return fromDepth(depth, Math.min(geometry.influenceRadius, corridor.radius));
    }
    const path = paths.get(geometry.pathId);
    if (!path || path.length <= 0) {
      return { covered: false, weight: 0 };
    }
    const hit = nearestOnPath(path, point);
    const along = Math.min(hit.fraction - geometry.from, geometry.to - hit.fraction) * path.length;
    let across = hit.radius - hit.distance;
    if (geometry.kind === 'spine') {
      across = hit.radius * geometry.share - hit.distance;
    } else if (geometry.kind === 'rim') {
      across = Math.min(hit.distance - hit.radius * (1 - geometry.share), across);
    }
    return fromDepth(Math.min(along, across), hit.radius);
  };

  return {
    influence,
    dominant(zones, point) {
      let selected: CharacterZone | undefined;
      for (const zone of zones) {
        if (influence(zone.geometry, point).covered) {
          selected = zone;
        }
      }
      return selected;
    },
    profile(zones, point) {
      let result: TerrainProfile | undefined;
      for (const zone of zones) {
        const weight = influence(zone.geometry, point).weight;
        if (weight <= 0) {
          continue;
        }
        if (!result) {
          result = zone.values;
        } else {
          result = blendProfiles(result, zone.values, weight);
        }
      }
      return result;
    },
    slice(geometry) {
      const path = paths.get(geometry.pathId);
      return path && path.length > 0
        ? slicePath(path, geometry.from, geometry.to)
        : { points: [], radii: [] };
    },
  };
}

interface AxisHit {
  readonly distance: number;
  readonly radius: number;
  readonly fraction: number;
}

function nearestOnPath(path: StructurePath, point: WorldPoint): AxisHit {
  let best: AxisHit = { distance: Infinity, radius: 0, fraction: 0 };
  let traversed = 0;
  for (const segment of path.segments) {
    const length = segmentLength(segment);
    const hit = nearestOnSegment(segment, point);
    if (hit.distance < best.distance) {
      best = {
        distance: hit.distance,
        radius: hit.radius,
        fraction: (traversed + length * hit.at) / path.length,
      };
    }
    traversed += length;
  }
  return best;
}

function nearestOnSegments(segments: readonly StructureSegment[], point: WorldPoint): AxisHit {
  let best: AxisHit = { distance: Infinity, radius: 0, fraction: 0 };
  for (const segment of segments) {
    const hit = nearestOnSegment(segment, point);
    if (hit.distance < best.distance) {
      best = { distance: hit.distance, radius: hit.radius, fraction: 0 };
    }
  }
  return best;
}

function nearestOnSegment(
  segment: StructureSegment,
  point: WorldPoint
): AxisHit & { readonly at: number } {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const squared = dx * dx + dy * dy;
  const at =
    squared > 0
      ? clamp01(((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) / squared)
      : 0;
  return {
    distance: Math.hypot(point.x - segment.from.x - dx * at, point.y - segment.from.y - dy * at),
    radius: segment.fromRadius + (segment.toRadius - segment.fromRadius) * at,
    fraction: 0,
    at,
  };
}

function fromDepth(depth: number, radius: number): ZoneInfluence {
  if (depth < 0) {
    return { covered: false, weight: 0 };
  }
  const feather = Math.max(0.001, radius * 0.18);
  const t = clamp01(depth / feather);
  return { covered: true, weight: t * t * (3 - 2 * t) };
}

function blendProfiles(base: TerrainProfile, next: TerrainProfile, weight: number): TerrainProfile {
  const result: Record<keyof TerrainProfile, number> = { ...base };
  for (const field of PROFILE_FIELDS) {
    result[field] = base[field] + (next[field] - base[field]) * weight;
  }
  return result;
}

function slicePath(path: StructurePath, from: number, to: number): ZonePathSlice {
  const points: WorldPoint[] = [];
  const radii: number[] = [];
  let traversed = 0;
  for (const segment of path.segments) {
    const length = segmentLength(segment);
    const start = traversed / path.length;
    const end = (traversed + length) / path.length;
    traversed += length;
    if (length <= 0 || end <= from || start >= to) {
      continue;
    }
    const first = clamp01((from - start) / (end - start));
    const last = clamp01((to - start) / (end - start));
    for (const at of [first, last]) {
      points.push({
        x: segment.from.x + (segment.to.x - segment.from.x) * at,
        y: segment.from.y + (segment.to.y - segment.from.y) * at,
      });
      radii.push(segment.fromRadius + (segment.toRadius - segment.fromRadius) * at);
    }
  }
  return { points, radii };
}

function segmentLength(segment: StructureSegment): number {
  return Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
