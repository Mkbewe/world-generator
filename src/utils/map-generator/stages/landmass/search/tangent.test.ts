import { placeStructures } from './placement';
import { SeededRandom } from '../../../random/seeded-random';
import { DEFAULT_LANDMASS_CONFIG } from '../defaults';
import {
  structureCentre,
  structureDirection,
  structureExtent,
  structureRadius,
} from '../influence';
import { createMarginSampler, createMaskSampler, edgeFrame } from '../mask-sampler';
import { buildStructure, scaleDraft } from '../shape/corridor';
import type { StructureDraft } from '../shape/draft';
import { planSizes } from '../shape/size-plan';

/**
 * The tangent-first rotation keeps boundary-adjacent structures along the
 * edge instead of stabbing it. Random orientation would align about one in
 * six; the heuristic must stay clearly above that.
 */
const SEEDS = Array.from({ length: 20 }, (_, index) => index + 1);
const DIMENSIONS = { widthMeters: 2000, heightMeters: 2000, sampleWidth: 64, sampleHeight: 64 };

function drafts(count: number, seed: number): StructureDraft[] {
  const random = new SeededRandom(seed);
  const units = Array.from({ length: count }, (_, index) =>
    buildStructure(`landmass-${index + 1}`, 'elongated', random)
  );
  const sizes = planSizes(
    units.map(draft => ({ extent: structureExtent(draft) })),
    DEFAULT_LANDMASS_CONFIG,
    random,
    DIMENSIONS
  );
  const scaled = units.map((draft, index) => scaleDraft(draft, sizes.scales[index]));
  return sizes.order.map(index => scaled[index]);
}

function angleGap(left: number, right: number): number {
  const delta = Math.abs(left - right) % Math.PI;
  return Math.min(delta, Math.PI - delta);
}

describe('tangent alignment', () => {
  it('lays boundary-adjacent structures along the edge', () => {
    const insideWorld = createMaskSampler(new Uint8Array(64 * 64).fill(1), 64, 64);
    const margin = createMarginSampler('disc', DIMENSIONS, 50);
    let near = 0;
    let aligned = 0;

    for (const seed of SEEDS) {
      const result = placeStructures(
        drafts(10, seed),
        insideWorld,
        DEFAULT_LANDMASS_CONFIG.shelf,
        new SeededRandom(seed),
        margin,
        point => edgeFrame('disc', point)
      );
      for (const structure of result.structures) {
        const centre = structureCentre(structure);
        const frame = edgeFrame('disc', centre);
        if (frame.gap < structureRadius(structure) + 0.1) {
          near++;
          if (angleGap(structureDirection(structure), frame.tangent) < Math.PI / 12) {
            aligned++;
          }
        }
      }
    }

    expect(near).toBeGreaterThan(0);
    expect(aligned / near).toBeGreaterThan(0.5);
  });
});
