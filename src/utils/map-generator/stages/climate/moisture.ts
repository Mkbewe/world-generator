import {
  CLIMATE_CURRENT_MOISTURE_SHARE,
  CLIMATE_RAIN_SHADOW_MAX,
  CLIMATE_RAIN_SHADOW_PER_1000_METERS,
  CLIMATE_WIND_RELAXATION,
  MOISTURE_ZONE_OFFSETS,
} from './defaults';
import { clamp01 } from '../../../math';
import type { WorldDimensions } from '../../../world-dimensions';
import { GenerationCancelledError } from '../../errors';
import type { WorldSpace } from '../../space';
import type { MoistureZoneConfig } from '../../types';
import { createGeometryZoneSampler } from '../base-climate/sampler';

export interface MoistureFieldInput {
  readonly worldMask: Uint8Array;
  readonly heightmap: Float32Array;
  readonly moistureBaseMap: Float32Array;
  readonly oceanCurrentMap: Float32Array;
  readonly oceanCurrentStrength: Float32Array;
  readonly zones: readonly MoistureZoneConfig[];
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

/**
 * Builds the final moisture field: the independent base moisture plus manual
 * zone bias and current drift, then an upwind rain shadow from the heightmap.
 * The prevailing wind is the +x direction; a rising slope loses moisture, so
 * the lee side of a ridge is drier.
 */
export function buildMoistureMap(input: MoistureFieldInput): Float32Array {
  const {
    worldMask,
    heightmap,
    moistureBaseMap,
    oceanCurrentMap,
    oceanCurrentStrength,
    zones,
    dimensions,
    space,
    signal,
    report,
  } = input;
  const { sampleWidth, sampleHeight } = dimensions;
  const moistureMap = new Float32Array(sampleWidth * sampleHeight);
  const zoneAt =
    zones.length > 0
      ? createGeometryZoneSampler(zones, (left, right) => space.distance(left, right), 'none')
      : undefined;

  for (let y = 0; y < sampleHeight; y++) {
    if (signal?.aborted) {
      throw new GenerationCancelledError();
    }
    let upwindHeight = 0;
    let carried = 0;
    let hasCarried = false;
    for (let x = 0; x < sampleWidth; x++) {
      const cell = y * sampleWidth + x;
      if (worldMask[cell] === 0) {
        continue;
      }
      const height = heightmap[cell];
      let local = moistureBaseMap[cell];

      if (zoneAt) {
        const zone = zones[zoneAt(space.cellToNormalized(x, y))];
        if (zone) {
          local += MOISTURE_ZONE_OFFSETS[zone.kind];
        }
      }

      const currentStrength = oceanCurrentStrength[cell];
      if (currentStrength > 0) {
        local += Math.cos(oceanCurrentMap[cell]) * currentStrength * CLIMATE_CURRENT_MOISTURE_SHARE;
      }

      if (!hasCarried || height <= 0) {
        carried = local;
        hasCarried = true;
      } else {
        const rise = height - upwindHeight;
        if (rise > 0) {
          carried -= Math.min(
            CLIMATE_RAIN_SHADOW_MAX,
            (rise / 1000) * CLIMATE_RAIN_SHADOW_PER_1000_METERS
          );
        }
        carried += (local - carried) * CLIMATE_WIND_RELAXATION;
      }
      upwindHeight = height > 0 ? height : 0;

      moistureMap[cell] = clamp01(carried);
    }
    report?.((y + 1) / sampleHeight);
  }

  return moistureMap;
}
