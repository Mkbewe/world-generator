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
  ISLET_COVERAGE_FADE,
  ISLET_COVERAGE_LEVEL_CLOSED,
  ISLET_COVERAGE_LEVEL_OPEN,
  ISLET_COVERAGE_PRACTICAL_MAX,
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
 * shore, and how high the resulting skerry stands. The coverage gate first
 * decides which coasts and shoals are open at all; the fine band then picks the
 * individual rocks inside them. The composition only hands it one water cell
 * and takes the new surface back.
 */
export class IsletRelief {
  private readonly plan: GeologyPlan;
  private readonly bands: HeightmapNoiseBands;
  private readonly regionBands: readonly HeightmapNoiseBands[];
  private readonly shapeAt: (regionIndex: number, point: WorldPoint) => RegionShape;
  private readonly opened: number;
  private readonly coverageThreshold: number;
  private readonly shoreDistanceGate: number;

  constructor(input: IsletReliefInput) {
    this.plan = input.plan;
    this.bands = input.bands;
    this.regionBands = input.regionBands;
    this.shapeAt = input.shapeAt;
    const frequency = clamp01(input.config.isletFrequency);
    this.opened = Math.pow(frequency, ISLET_FREQUENCY_EXPONENT);
    this.coverageThreshold =
      ISLET_COVERAGE_LEVEL_CLOSED -
      (ISLET_COVERAGE_LEVEL_CLOSED - ISLET_COVERAGE_LEVEL_OPEN) * frequency;
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
    if (surface >= 0 || !this.isOpenWater(cell)) {
      return surface;
    }
    const shoal = this.bands.bank(cell.point);
    const coverage = this.coverageWeight(shoal);
    if (coverage <= 0) {
      return surface;
    }
    let result = this.applyBank(surface, cell, coverage, shoal);
    if (
      result <= 0 &&
      result > -ISLET_MAX_DEPTH_METERS &&
      cell.distanceToShore > this.shoreDistanceGate &&
      cell.gate > ISLET_GATE_MIN
    ) {
      const shape = this.shapeAt(cell.owner, cell.point);
      result = this.applyIslet(result, cell, band, shape, coverage);
    }
    return result;
  }

  private applyBank(surface: number, cell: IsletCell, coverage: number, shoal: number): number {
    const fine = this.bands.fine(cell.point);
    const bank = this.bankWeight(shoal + BANK_LARGE_SHARE * cell.large + BANK_FINE_SHARE * fine);
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
    return surface + Math.max(0, target - surface) * bank * coverage * depthFade;
  }

  private applyIslet(
    surface: number,
    cell: IsletCell,
    band: HeightmapNoiseBands,
    shape: RegionShape,
    coverage: number
  ): number {
    const bump = this.isletBump(band, cell.point) * coverage;
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

  /** Share of the slider's coverage at this shoal value; zero keeps the coast clean. */
  private coverageWeight(shoal: number): number {
    const share = clamp01(0.5 + shoal / (2 * ISLET_COVERAGE_PRACTICAL_MAX));
    if (share <= this.coverageThreshold) {
      return 0;
    }
    return smoothstep(clamp01((share - this.coverageThreshold) / ISLET_COVERAGE_FADE));
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
