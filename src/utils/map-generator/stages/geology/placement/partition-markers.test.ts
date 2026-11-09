import { RandomFactory } from '@generator/random';
import { createWorldSpace } from '@generator/space';

import { placePartitionMarkers, type RegionMarker } from './partition-markers';
import { containsNormalized } from '../../../../world-shape';
import { geologyPresetConfig } from '../config/presets';

const DIMENSIONS = { widthMeters: 2000, heightMeters: 2000, sampleWidth: 129, sampleHeight: 129 };

function place(evenness: number, seed = 17): RegionMarker[] {
  const preset = geologyPresetConfig('varied');
  return placePartitionMarkers({
    regions: preset.regions,
    evenness,
    dimensions: DIMENSIONS,
    shape: 'disc',
    space: createWorldSpace(DIMENSIONS),
    random: new RandomFactory(seed),
    thermalAt: () => 'temperate',
    geologyCoupling: 0,
  });
}

/** Smallest distance between any two markers, in metres. */
function minimumClearance(markers: readonly RegionMarker[]): number {
  const space = createWorldSpace(DIMENSIONS);
  let closest = Infinity;
  for (let left = 0; left < markers.length; left++) {
    for (let right = left + 1; right < markers.length; right++) {
      const first = markers[left];
      const second = markers[right];
      if (first && second) {
        closest = Math.min(closest, space.distanceMeters(first.centre, second.centre));
      }
    }
  }
  return closest;
}

/** Mean nearest-neighbour distance of the markers, in metres. */
function averageClearance(markers: readonly RegionMarker[]): number {
  const space = createWorldSpace(DIMENSIONS);
  let total = 0;
  for (const marker of markers) {
    let closest = Infinity;
    for (const other of markers) {
      if (other !== marker) {
        closest = Math.min(closest, space.distanceMeters(marker.centre, other.centre));
      }
    }
    total += closest;
  }
  return total / markers.length;
}

describe('placePartitionMarkers', () => {
  it('is deterministic for one seed and configuration', () => {
    expect(place(0.6)).toEqual(place(0.6));
  });

  it('keeps the first marker at the world centre', () => {
    const [first] = place(0.6);

    expect(first?.centre).toEqual({ x: 0.5, y: 0.5 });
  });

  it('keeps every marker inside the world mask', () => {
    for (const marker of place(0.6)) {
      expect(containsNormalized('disc', marker.centre), marker.id).toBe(true);
    }
  });

  it('spreads the markers further apart when evenness grows', () => {
    expect(averageClearance(place(1))).toBeGreaterThan(averageClearance(place(0)));
  });

  it('enforces a wider clearance when evenness grows', () => {
    expect(minimumClearance(place(1))).toBeGreaterThan(minimumClearance(place(0)));
  });

  it('keeps the requested type and size per region', () => {
    const preset = geologyPresetConfig('varied');

    place(0.6).forEach((marker, index) => {
      expect(marker.id).toBe(`region-${index + 1}`);
      expect(marker.type).toBe(preset.regions[index]?.type);
      expect(marker.weight).toBe(preset.regions[index]?.size);
    });
  });

  it('changes the placement when the seed changes', () => {
    expect(place(0.6, 18)).not.toEqual(place(0.6, 17));
  });

  it('ignores thermal anchors when geology coupling is zero', () => {
    const preset = geologyPresetConfig('varied');
    const input = {
      regions: preset.regions,
      evenness: 0.6,
      dimensions: DIMENSIONS,
      shape: 'disc' as const,
      space: createWorldSpace(DIMENSIONS),
      random: new RandomFactory(17),
      thermalAt: () => 'temperate' as const,
      geologyCoupling: 0,
    };

    expect(
      placePartitionMarkers({
        ...input,
        thermalAt: () => 'warm',
        geologyCoupling: 0,
      })
    ).toEqual(placePartitionMarkers(input));
  });

  it('leans toward the matching thermal anchor when coupling is on', () => {
    const markers = placePartitionMarkers({
      regions: [
        { type: 'lagoon', size: 1 },
        { type: 'lagoon', size: 1 },
      ],
      evenness: 0.6,
      dimensions: DIMENSIONS,
      shape: 'disc',
      space: createWorldSpace(DIMENSIONS),
      random: new RandomFactory(17),
      thermalAt: point => (point.x > 0.5 ? 'warm' : 'cold'),
      geologyCoupling: 1,
    });

    expect(markers[1]?.centre.x).toBeGreaterThan(0.5);
  });

  it('keeps the thermal anchor bias light', () => {
    const space = createWorldSpace(DIMENSIONS);
    const input = {
      regions: Array.from({ length: 5 }, () => ({ type: 'fjord' as const, size: 1 })),
      evenness: 0.6,
      dimensions: DIMENSIONS,
      shape: 'disc' as const,
      space,
      random: new RandomFactory(17),
      thermalAt: (point: { readonly x: number; readonly y: number }) =>
        point.y > 0.8 ? ('cold' as const) : ('temperate' as const),
    };
    const plain = placePartitionMarkers({ ...input, geologyCoupling: 0 });
    const biased = placePartitionMarkers({ ...input, geologyCoupling: 1 });
    const maxShift = Math.max(
      ...plain.map((marker, index) =>
        space.distance(marker.centre, biased[index]?.centre ?? marker.centre)
      )
    );

    expect(maxShift).toBeLessThan(0.02);
  });
});
