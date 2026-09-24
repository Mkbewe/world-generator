import type { MacroRegionLayout } from './presets';
import type { MacroRegionConfig } from '../../../types';

export interface MacroRegionSegment {
  readonly id: string;
  readonly percent: number;
}

export interface MacroRegionLayoutChange {
  readonly regions: readonly MacroRegionConfig[];
}

export const MIN_MACRO_REGION_SHARE = 8;

const RADIAL_EXTENT = 0.5;

export function baseRegions(regions: readonly MacroRegionConfig[]): MacroRegionConfig[] {
  return regions.filter(region => region.role === 'base');
}

export function overlayRegions(regions: readonly MacroRegionConfig[]): MacroRegionConfig[] {
  return regions.filter(region => region.role === 'overlay');
}

/** Spatial shares of base regions in their displayed order. */
export function regionSegments(
  layout: MacroRegionLayout,
  regions: readonly MacroRegionConfig[]
): MacroRegionSegment[] {
  const base = baseRegions(regions);
  const raw = base.map(region => geometryShare(layout, region));
  const total = sum(raw) || 1;

  return base.map((region, index) => ({
    id: region.id,
    percent: roundPercent((raw[index] / total) * 100),
  }));
}

/** N - 1 movable boundaries for N adjacent base regions. */
export function regionBoundaries(
  layout: MacroRegionLayout,
  regions: readonly MacroRegionConfig[]
): number[] {
  const segments = regionSegments(layout, regions);
  let cursor = 0;
  return segments.slice(0, -1).map(segment => {
    cursor += segment.percent;
    return cursor;
  });
}

export function applyRegionBoundaries(
  layout: MacroRegionLayout,
  regions: readonly MacroRegionConfig[],
  boundaries: readonly number[]
): MacroRegionLayoutChange {
  const base = baseRegions(regions);
  if (boundaries.length !== Math.max(0, base.length - 1)) {
    return { regions };
  }

  const normalized = clampBoundaries(boundaries, base.length);
  const shares = boundariesToShares(normalized);
  return { regions: combine(rebuild(layout, base, shares), regions) };
}

/** Adds a base region by splitting the widest segment, borrowing space only near the limit. */
export function splitLargestRegion(
  layout: MacroRegionLayout,
  regions: readonly MacroRegionConfig[],
  region: MacroRegionConfig
): MacroRegionLayoutChange {
  const base = baseRegions(regions);
  const shares = regionSegments(layout, regions).map(segment => segment.percent);
  const widestIndex = shares.reduce(
    (best, value, index) => (value > shares[best] ? index : best),
    0
  );
  const sourceShare = shares[widestIndex];
  const insertedShare = Math.max(MIN_MACRO_REGION_SHARE, sourceShare / 2);
  const retainedShare = Math.max(MIN_MACRO_REGION_SHARE, sourceShare - insertedShare);
  const amountToBorrow = retainedShare + insertedShare - sourceShare;
  const available = sum(
    shares.map((share, index) =>
      index === widestIndex ? 0 : Math.max(0, share - MIN_MACRO_REGION_SHARE)
    )
  );
  if (available < amountToBorrow) {
    return { regions };
  }

  const nextShares = shares.map((share, index) => {
    if (index === widestIndex) {
      return retainedShare;
    }
    const surplus = Math.max(0, share - MIN_MACRO_REGION_SHARE);
    return available === 0 ? share : share - (surplus / available) * amountToBorrow;
  });
  const nextBase = [...base];
  nextBase.splice(widestIndex + 1, 0, region);
  nextShares.splice(widestIndex + 1, 0, insertedShare);

  return { regions: combine(rebuild(layout, nextBase, nextShares), regions) };
}

/** Removes a base region and gives its space to an adjacent region. */
export function removeBaseRegion(
  layout: MacroRegionLayout,
  regions: readonly MacroRegionConfig[],
  id: string
): MacroRegionLayoutChange {
  const base = baseRegions(regions);
  if (base.length <= 1) {
    return { regions };
  }
  const index = base.findIndex(region => region.id === id);
  if (index < 0) {
    return { regions };
  }

  const shares = regionSegments(layout, regions).map(segment => segment.percent);
  const removedShare = shares[index];
  const recipient = index < base.length - 1 ? index + 1 : index - 1;
  shares[recipient] += removedShare;
  shares.splice(index, 1);

  const nextBase = base.filter(region => region.id !== id);
  return { regions: combine(rebuild(layout, nextBase, shares), regions) };
}

function rebuild(
  layout: MacroRegionLayout,
  regions: readonly MacroRegionConfig[],
  shares: readonly number[]
): MacroRegionConfig[] {
  let cursor = 0;

  return regions.map((region, index) => {
    const fraction = shares[index] / 100;
    if (layout === 'radial') {
      const innerRadius = cursor * RADIAL_EXTENT;
      cursor += fraction;
      return {
        ...region,
        role: 'base' as const,
        geometry: {
          kind: 'ring' as const,
          center: { x: 0.5, y: 0.5 },
          innerRadius,
          outerRadius: cursor * RADIAL_EXTENT,
        },
      };
    }

    const lower = cursor;
    cursor += fraction;
    return {
      ...region,
      role: 'base' as const,
      geometry: {
        kind: 'band' as const,
        axis: layout === 'horizontal' ? ('y' as const) : ('x' as const),
        center: (lower + cursor) / 2,
        width: fraction,
      },
    };
  });
}

function combine(
  base: readonly MacroRegionConfig[],
  all: readonly MacroRegionConfig[]
): MacroRegionConfig[] {
  return [...base, ...overlayRegions(all)];
}

function geometryShare(layout: MacroRegionLayout, region: MacroRegionConfig): number {
  const geometry = region.geometry;
  if (layout === 'radial' && geometry.kind === 'ring') {
    return geometry.outerRadius - geometry.innerRadius;
  }
  if (layout !== 'radial' && geometry.kind === 'band') {
    return geometry.width;
  }
  return 1;
}

/** Clamps N - 1 movable boundaries so every region keeps at least the shared minimum share. */
export function clampBoundaries(boundaries: readonly number[], regionCount: number): number[] {
  let previous = 0;
  return boundaries.map((boundary, index) => {
    const remaining = regionCount - index - 1;
    const normalized = clamp(
      boundary,
      previous + MIN_MACRO_REGION_SHARE,
      100 - remaining * MIN_MACRO_REGION_SHARE
    );
    previous = normalized;
    return normalized;
  });
}

/** Spatial shares of the regions between the given cumulative boundaries. */
export function boundariesToShares(boundaries: readonly number[]): number[] {
  const points = [0, ...boundaries, 100];
  return points.slice(1).map((point, index) => point - points[index]);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function roundPercent(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
