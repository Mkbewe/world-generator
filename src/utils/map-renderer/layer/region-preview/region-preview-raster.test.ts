import { extendRegionOwners } from './region-preview-raster';

describe('region owners', () => {
  it('extends region colour beneath the smooth world outline', () => {
    const owners = new Int16Array(25).fill(-1);
    owners[12] = 0;
    const extended = extendRegionOwners(owners, 5, 5);
    expect(owners[0]).toBe(-1);
    expect(extended.every(owner => owner === 0)).toBe(true);
  });
});
