import type { CharacterZone, TerrainProfile, WorldPoint, ZoneGeometry } from '../../types';
import { isInvertedGeometry } from '../structure-character';

/** Land amplitude range, in metres, across worlds and the relief slider. */
export const MIN_LAND_AMPLITUDE_METERS = 40;
export const MAX_LAND_AMPLITUDE_METERS = 1200;

/** World size at which the amplitude reaches its full size factor. */
const AMPLITUDE_WORLD_METERS = 10_000;

/** How far the shared noise may bend the coast, as a share of the world side. */
const WARP_SHARE = 0.04;

/** How strongly the fine noise bites into the coast, as a share of the amplitude. */
const COAST_NOISE_SHARE = 0.18;

/** Land amplitude for a world: how high the peaks may reach, in metres. */
export function landAmplitudeMeters(worldSizeMeters: number, relief: number): number {
  const size = clamp01(worldSizeMeters / AMPLITUDE_WORLD_METERS);
  const lean = 0.25 + 0.75 * clamp01(relief);
  const scale = 0.35 + 0.65 * size;
  return (
    MIN_LAND_AMPLITUDE_METERS +
    (MAX_LAND_AMPLITUDE_METERS - MIN_LAND_AMPLITUDE_METERS) * lean * scale
  );
}

/** Sea-floor height of the open ocean, in metres below the sea datum. */
export function oceanHeightMeters(depthMeters: number): number {
  return -depthMeters;
}

/**
 * Share of the land amplitude at a normalized distance from the axis: `0` on the
 * axis, `1` at the influence edge. The profile decides the landform, the distance
 * only says where in the cross-section the point sits. `plateauStrength` lifts
 * the inner half towards a flat top. `inverted` moves the land to the outer band,
 * giving a low axis with higher edges for a `rim` zone.
 */
export function crossSection(t: number, values: TerrainProfile, inverted: boolean): number {
  const at = clamp01(t);
  const axis =
    values.elevation * 0.3 +
    values.mountainStrength * (1 - at) * (1 - at) +
    values.hillStrength * (1 - at * at) * 0.5;
  const rim =
    values.elevation * 0.3 +
    (values.mountainStrength * 0.7 + values.hillStrength) * Math.sin(Math.PI * at);
  const shape = inverted ? rim : axis;
  const plateau = shape + (1 - shape) * values.plateauStrength * (1 - at) * 0.5;
  return clamp01(plateau) * coastFalloff(at);
}

/**
 * Land shape at a point: the zones blend top-down, so a later zone replaces the
 * earlier one by its own weight. `whole` covers everything with full weight and
 * supplies the base.
 */
export function landShape(
  zones: readonly CharacterZone[],
  influence: (geometry: ZoneGeometry, point: WorldPoint) => number,
  t: number,
  point: WorldPoint
): number {
  let shape = 0;
  for (const zone of zones) {
    const weight = influence(zone.geometry, point);
    if (weight <= 0) {
      continue;
    }
    const next = crossSection(t, zone.values, isInvertedGeometry(zone.geometry));
    shape += (next - shape) * weight;
  }
  return shape;
}

/** How far the shared noise bends a normalized point, per axis. */
export function warpPoint(
  point: WorldPoint,
  warp: { readonly x: number; readonly y: number },
  featureScale: number
): WorldPoint {
  const amount = WARP_SHARE * (0.5 + clamp01(featureScale));
  return {
    x: clamp01(point.x + warp.x * amount),
    y: clamp01(point.y + warp.y * amount),
  };
}

/** Land-shape jitter from the fine noise, in metres; fades out at the axis. */
export function coastNoiseMeters(noise: number, shape: number, amplitude: number): number {
  return (noise - 0.5) * 2 * amplitude * COAST_NOISE_SHARE * (1 - shape);
}

/** 1 inland, 0 at the corridor edge; smooth, so the coast has no step. */
function coastFalloff(t: number): number {
  const inland = clamp01(1 - t);
  return inland * inland * (3 - 2 * inland);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
