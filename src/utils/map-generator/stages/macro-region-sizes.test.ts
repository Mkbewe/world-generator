import { createBandOverlay, createRadialLayout } from './macro-region-presets';
import {
  applyRegionBoundaries,
  MIN_MACRO_REGION_SHARE,
  regionBoundaries,
  regionSegments,
  removeBaseRegion,
  splitLargestRegion,
} from './macro-region-sizes';
import type { MacroRegionConfig } from '../types';

describe('macro region sizing', () => {
  it('expresses adjacent regions as one set of shared boundaries', () => {
    const regions = createRadialLayout(4);

    expect(regionSegments('radial', regions).map(segment => segment.percent)).toEqual([
      25, 25, 25, 25,
    ]);
    expect(regionBoundaries('radial', regions)).toEqual([25, 50, 75]);
  });

  it('moves only the two regions adjacent to a boundary', () => {
    const regions = createRadialLayout(4);
    const changed = applyRegionBoundaries('radial', regions, [25, 60, 75]).regions;

    expect(regionSegments('radial', changed).map(segment => segment.percent)).toEqual([
      25, 35, 15, 25,
    ]);
    expect(changed.map(region => region.geometry)).toMatchObject([
      { innerRadius: 0, outerRadius: 0.125 },
      { innerRadius: 0.125, outerRadius: 0.3 },
      { innerRadius: 0.3, outerRadius: 0.375 },
      { innerRadius: 0.375, outerRadius: 0.5 },
    ]);
  });

  it('adds base regions up redistributing a minimum share and supports ten regions', () => {
    let regions: readonly MacroRegionConfig[] = createRadialLayout(4);

    regions = splitLargestRegion('radial', regions, {
      ...regions[0],
      id: 'added-4',
      label: 'Added 4',
    }).regions;
    expect(regionSegments('radial', regions).map(segment => segment.percent)).toEqual([
      12.5, 12.5, 25, 25, 25,
    ]);

    while (regions.length < 10) {
      const source = regions[0];
      regions = [
        ...splitLargestRegion('radial', regions, {
          ...source,
          id: `added-${regions.length}`,
          label: `Added ${regions.length}`,
        }).regions,
      ];
    }

    const shares = regionSegments('radial', regions).map(segment => segment.percent);
    expect(shares).toHaveLength(10);
    expect(shares.every(share => share >= MIN_MACRO_REGION_SHARE - 0.0001)).toBe(true);
    expect(shares.reduce((total, share) => total + share, 0)).toBeCloseTo(100, 8);
  });

  it('gives a removed region share to its neighbour', () => {
    const regions = createRadialLayout(4);
    const changed = removeBaseRegion('radial', regions, regions[1].id).regions;

    expect(regionSegments('radial', changed).map(segment => segment.percent)).toEqual([25, 50, 25]);
  });

  it('preserves overlays while changing the base distribution', () => {
    const overlay = createBandOverlay('crossing', 'Crossing', 'y');
    const regions = [...createRadialLayout(3), overlay];
    const changed = applyRegionBoundaries('radial', regions, [20, 70]).regions;

    expect(changed.at(-1)).toBe(overlay);
    expect(regionSegments('radial', changed).map(segment => segment.percent)).toEqual([20, 50, 30]);
  });
});
