import type { GeologyPlan, HeightmapConfig, WorldPoint } from '@generator/types';

import { clamp01, smoothstep } from '../../../../math';
import type { HeightmapNoiseBands } from '../bands';
import type { RegionShape } from '../config/region-shape';
import {
  BANK_DEPTH_FADE_METERS,
  BANK_DEPTH_METERS,
  BANK_DEPTH_SPREAD_METERS,
  BANK_DETAIL_SPREAD_METERS,
  BANK_FINE_SHARE,
  BANK_LARGE_SHARE,
  BANK_MIN_LEVEL,
  BANK_START_DEPTH_METERS,
  ISLET_AMPLITUDE_FLOOR,
  ISLET_BUMP_DEPTH_METERS,
  ISLET_BUMP_METERS,
  ISLET_EMERGENCE_MAX_METERS,
  ISLET_EMERGENCE_MIN_METERS,
  ISLET_FREQUENCY_EXPONENT,
  ISLET_GATE_MIN,
  ISLET_MASK_FADE,
  ISLET_MASK_MIN,
  ISLET_MAX_DEPTH_METERS,
  ISLET_MIN_SHORE_DISTANCE_SHARE,
  ISLET_NOISE_CEILING,
} from '../defaults';

/** One water cell handed to the islet relief. */
export interface IsletCell {
  readonly point: WorldPoint;
  readonly owner: number;
  readonly cavityDepth: number;
  readonly distanceToShore: number;
  readonly gate: number;
  readonly large: number;
}

export interface IsletReliefInput {
  readonly plan: GeologyPlan;
  readonly bands: HeightmapNoiseBands;
  readonly regionBands: readonly HeightmapNoiseBands[];
  readonly shapeAt: (regionIndex: number, point: WorldPoint) => RegionShape;
  readonly config: HeightmapConfig;
  readonly shoreWidthMeters: number;
}

/**
 * Owns the islet and bank behaviour: which water cells rise, how far from the
 * shore, and how high the resulting skerry stands. The composition only hands
 * it one water cell and takes the new surface back.
 */
export class IsletRelief {
  private readonly plan: GeologyPlan;
  private readonly bands: HeightmapNoiseBands;
  private readonly regionBands: readonly HeightmapNoiseBands[];
  private readonly shapeAt: (regionIndex: number, point: WorldPoint) => RegionShape;
  private readonly opened: number;
  private readonly shoreDistanceGate: number;

  constructor(input: IsletReliefInput) {
    this.plan = input.plan;
    this.bands = input.bands;
    this.regionBands = input.regionBands;
    this.shapeAt = input.shapeAt;
    this.opened = Math.pow(clamp01(input.config.isletFrequency), ISLET_FREQUENCY_EXPONENT);
    this.shoreDistanceGate = input.shoreWidthMeters * ISLET_MIN_SHORE_DISTANCE_SHARE;
  }

  apply(surface: number, cell: IsletCell): number {
    if (this.opened <= 0) {
      return surface;
    }
    const region = this.plan.regions[cell.owner];
    const band = this.regionBands[cell.owner];
    if (!region || !band) {
      return surface;
    }
    const shape = this.shapeAt(cell.owner, cell.point);
    let result = surface;
    if (this.isOpenWater(cell)) {
      result = this.applyBank(result, cell);
    }
    if (
      result <= 0 &&
      result > -ISLET_MAX_DEPTH_METERS &&
      cell.distanceToShore > this.shoreDistanceGate &&
      this.isOpenWater(cell) &&
      cell.gate > ISLET_GATE_MIN
    ) {
      result = this.applyIslet(result, cell, band, shape);
    }
    return result;
  }

  private applyBank(surface: number, cell: IsletCell): number {
    const fine = this.bands.fine(cell.point);
    const bank = this.bankWeight(
      this.bands.bank(cell.point) + BANK_LARGE_SHARE * cell.large + BANK_FINE_SHARE * fine
    );
    if (bank <= 0) {
      return surface;
    }
    const depthFade = smoothstep(
      clamp01((-surface - BANK_START_DEPTH_METERS) / BANK_DEPTH_FADE_METERS)
    );
    const target =
      -BANK_DEPTH_METERS -
      BANK_DEPTH_SPREAD_METERS * clamp01(0.5 + 0.5 * cell.large) -
      BANK_DETAIL_SPREAD_METERS * clamp01(0.5 + 0.5 * fine);
    return surface + Math.max(0, target - surface) * bank * depthFade;
  }

  private applyIslet(
    surface: number,
    cell: IsletCell,
    band: HeightmapNoiseBands,
    shape: RegionShape
  ): number {
    const bump = this.isletBump(band, cell.point);
    const depthShare = clamp01(-surface / ISLET_BUMP_DEPTH_METERS);
    const amplitude = Math.max(ISLET_AMPLITUDE_FLOOR, Math.min(1, shape.amplitudeFactor));
    const lifted = surface + bump * depthShare * amplitude;
    if (lifted <= 0) {
      return surface;
    }
    const cap =
      ISLET_EMERGENCE_MIN_METERS +
      (ISLET_EMERGENCE_MAX_METERS - ISLET_EMERGENCE_MIN_METERS) * this.heightShare(cell.point);
    return Math.min(lifted, cap);
  }

  private isletBump(band: HeightmapNoiseBands, point: WorldPoint): number {
    const threshold = this.threshold(ISLET_MASK_MIN);
    const rock = band.fine(point);
    if (rock <= threshold) {
      return 0;
    }
    return ISLET_BUMP_METERS * smoothstep(clamp01((rock - threshold) / ISLET_MASK_FADE));
  }

  private bankWeight(value: number): number {
    const threshold = this.threshold(BANK_MIN_LEVEL);
    const range = ISLET_NOISE_CEILING - threshold;
    if (value <= threshold || range <= 0) {
      return 0;
    }
    return smoothstep(clamp01((value - threshold) / range));
  }

  private threshold(minimum: number): number {
    return ISLET_NOISE_CEILING - (ISLET_NOISE_CEILING - minimum) * this.opened;
  }

  private isOpenWater(cell: IsletCell): boolean {
    return cell.cavityDepth >= 0;
  }

  private heightShare(point: WorldPoint): number {
    const hash = Math.sin(point.x * 12.9898 + point.y * 78.233) * 43758.5453;
    return hash - Math.floor(hash);
  }
}
