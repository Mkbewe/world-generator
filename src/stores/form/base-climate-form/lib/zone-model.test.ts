import {
  clampZoneBoundaries,
  convertLayout,
  DEFAULT_RING_EXTENT,
  layoutOfZones,
  moveZoneIn,
  removeZoneFrom,
  ringExtentOf,
  splitLargestZone,
  zoneBoundaries,
  zoneSegments,
  zonesFromBoundaries,
  zoneShares,
} from './zone-model';
import { baseClimatePresetConfig } from '../../../../utils/map-generator';
import type { HeatZoneConfig } from '../../../../utils/map-generator/types';

const earth = baseClimatePresetConfig('earth-like');
const ringWorld = baseClimatePresetConfig('ring-world');

function newZone(): HeatZoneConfig {
  return {
    id: 'zone-9',
    label: 'Zone 9',
    thermal: 'warm',
    geometry: earth.zones[0]?.geometry ?? { kind: 'band', axis: 'y', center: 0.5, width: 1 },
  };
}

describe('layoutOfZones', () => {
  it('reads the family from the first zone', () => {
    expect(layoutOfZones(earth.zones)).toBe('horizontal');
    expect(layoutOfZones(ringWorld.zones)).toBe('rings');
    expect(
      layoutOfZones([
        { ...earth.zones[0], geometry: { kind: 'band', axis: 'x', center: 0.5, width: 0.2 } },
      ])
    ).toBe('vertical');
  });
});

describe('zoneBoundaries', () => {
  it('returns cumulative band boundaries', () => {
    expect(zoneBoundaries(earth.zones, 'horizontal', DEFAULT_RING_EXTENT).map(Math.round)).toEqual([
      20, 40, 60, 80,
    ]);
  });

  it('normalizes ring boundaries by the ring extent', () => {
    const extent = ringExtentOf(ringWorld.zones);
    const boundaries = zoneBoundaries(ringWorld.zones, 'rings', extent);

    expect(extent).toBe(0.5);
    expect(boundaries[0]).toBeCloseTo(40, 2);
    expect(boundaries[1]).toBeCloseTo(70, 2);
    expect(zoneShares(ringWorld.zones, 'rings', extent).map(value => Math.round(value))).toEqual([
      40, 30, 30,
    ]);
  });
});

describe('zonesFromBoundaries', () => {
  it('round-trips earth-like bands', () => {
    const boundaries = zoneBoundaries(earth.zones, 'horizontal', DEFAULT_RING_EXTENT);
    const zones = zonesFromBoundaries(earth.zones, 'horizontal', DEFAULT_RING_EXTENT, boundaries);

    zones.forEach((zone, index) => {
      const geometry = earth.zones[index]?.geometry;
      if (geometry?.kind !== 'band' || zone.geometry.kind !== 'band') {
        throw new Error('Expected band geometry.');
      }
      expect(zone.geometry.center).toBeCloseTo(geometry.center);
      expect(zone.geometry.width).toBeCloseTo(geometry.width);
    });
  });
});

describe('clampZoneBoundaries', () => {
  it('keeps every zone at least the minimum share', () => {
    expect(clampZoneBoundaries([0, 50, 100], 4)).toEqual([1, 50, 99]);
  });
});

describe('zoneSegments', () => {
  it('returns one segment per zone', () => {
    const segments = zoneSegments(earth.zones, 'horizontal', DEFAULT_RING_EXTENT);

    expect(segments).toHaveLength(earth.zones.length);
    expect(segments.map(segment => Math.round(segment.percent))).toEqual([20, 20, 20, 20, 20]);
  });
});

describe('splitLargestZone', () => {
  it('splits the widest zone and keeps full coverage', () => {
    const zones = splitLargestZone(earth.zones, 'horizontal', DEFAULT_RING_EXTENT, newZone());

    expect(zones).toHaveLength(6);
    expect(zones[1]).toMatchObject({ id: 'zone-9', thermal: earth.zones[0]?.thermal });
    expect(zoneShares(zones, 'horizontal', DEFAULT_RING_EXTENT).map(Math.round)).toEqual([
      10, 10, 20, 20, 20, 20,
    ]);
  });
});

describe('removeZoneFrom', () => {
  it('gives the removed share to the previous zone', () => {
    const zones = removeZoneFrom(
      earth.zones,
      'horizontal',
      DEFAULT_RING_EXTENT,
      earth.zones[1]?.id ?? ''
    );

    expect(zones).toHaveLength(4);
    expect(zones[0]?.id).toBe(earth.zones[0]?.id);
    expect(zoneShares(zones, 'horizontal', DEFAULT_RING_EXTENT)[0]).toBeCloseTo(40);
  });

  it('keeps the last zone', () => {
    const only = earth.zones.slice(0, 1);
    expect(removeZoneFrom(only, 'horizontal', DEFAULT_RING_EXTENT, only[0]?.id ?? '')).toBe(only);
  });
});

describe('moveZoneIn', () => {
  it('moves a zone one slot while the slots keep their extents', () => {
    const zones = moveZoneIn(
      earth.zones,
      'horizontal',
      DEFAULT_RING_EXTENT,
      earth.zones[1]?.id ?? '',
      -1
    );

    expect(zones.map(zone => zone.id)).toEqual([
      earth.zones[1]?.id,
      earth.zones[0]?.id,
      earth.zones[2]?.id,
      earth.zones[3]?.id,
      earth.zones[4]?.id,
    ]);
    expect(zoneShares(zones, 'horizontal', DEFAULT_RING_EXTENT).map(Math.round)).toEqual([
      20, 20, 20, 20, 20,
    ]);
  });

  it('ignores moves outside the zone list', () => {
    expect(
      moveZoneIn(earth.zones, 'horizontal', DEFAULT_RING_EXTENT, earth.zones[0]?.id ?? '', -1)
    ).toBe(earth.zones);
  });
});

describe('convertLayout', () => {
  it('converts bands to rings and back with the same shares', () => {
    const rings = convertLayout(earth.zones, 'horizontal', 'rings', DEFAULT_RING_EXTENT);
    expect(rings.every(zone => zone.geometry.kind === 'ring')).toBe(true);
    expect(zoneShares(rings, 'rings', DEFAULT_RING_EXTENT).map(Math.round)).toEqual([
      20, 20, 20, 20, 20,
    ]);

    const bands = convertLayout(rings, 'rings', 'vertical', DEFAULT_RING_EXTENT);
    expect(bands.every(zone => zone.geometry.kind === 'band' && zone.geometry.axis === 'x')).toBe(
      true
    );
    expect(zoneBoundaries(bands, 'vertical', DEFAULT_RING_EXTENT).map(Math.round)).toEqual([
      20, 40, 60, 80,
    ]);
  });
});
