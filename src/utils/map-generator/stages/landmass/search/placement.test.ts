import { segmentsDistance } from './collision';
import { type PlacementResult, placeStructures } from './placement';
import { containsWorld } from '../../../../world-shape';
import { SeededRandom } from '../../../random/seeded-random';
import { createWorldSpace } from '../../../space';
import type { LandmassArchetype } from '../../../types';
import { DEFAULT_LANDMASS_CONFIG } from '../defaults';
import { structureExtent, structureSegments } from '../influence';
import { validatePlacement } from '../layout-check';
import { createMaskSampler } from '../mask-sampler';
import { buildStructure, scaleDraft } from '../shape/corridor';
import type { StructureDraft } from '../shape/draft';
import { planSizes } from '../shape/size-plan';

/** Share of the influence corridor that must stay inside the world. */
const INSIDE_SHARE = 0.75;

/** Widest influence gap two members of one group may keep. */
const GROUP_LIMIT = DEFAULT_LANDMASS_CONFIG.shelf.width + 0.1;

/** Wide seed pool: the placement contract must hold for every world. */
const SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

const ARCHETYPES: readonly LandmassArchetype[] = ['elongated', 'branched', 'irregular', 'round'];

/** Disc world mask, generated from the same shape the stage uses. */
function discSampler(size = 64) {
  const space = createWorldSpace({ sampleWidth: size, sampleHeight: size });
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const maskCoords = space.cellToMask(x, y);
      const inside = containsWorld('disc', maskCoords.x, maskCoords.y);
      mask[y * size + x] = inside ? 1 : 0;
    }
  }
  return createMaskSampler(mask, size, size);
}

const disc = discSampler();

/** Drafts sized by the size plan, exactly like the stage does. */
function drafts(
  count: number,
  seed: number,
  sizeScale = DEFAULT_LANDMASS_CONFIG.size
): StructureDraft[] {
  const random = new SeededRandom(seed);
  const units = Array.from({ length: count }, (_, index) =>
    buildStructure(`landmass-${index + 1}`, ARCHETYPES[index % ARCHETYPES.length], random)
  );
  const sizes = planSizes(
    units.map(draft => ({ extent: structureExtent(draft) })),
    { ...DEFAULT_LANDMASS_CONFIG, size: sizeScale },
    random,
    { widthMeters: 2000, heightMeters: 2000, sampleWidth: 64, sampleHeight: 64 }
  );
  const scaled = units.map((draft, index) => scaleDraft(draft, sizes.scales[index]));
  return sizes.order.map(index => scaled[index]);
}

function place(seed: number, count = 8): PlacementResult {
  return placeStructures(
    drafts(count, seed),
    disc,
    DEFAULT_LANDMASS_CONFIG.shelf,
    new SeededRandom(seed)
  );
}

/** Largest influence gap between two structures of the same shelf. */
function groupGap(result: PlacementResult, structureIndex: number): number {
  const structure = result.structures[structureIndex];
  let gap = 0;
  for (const [index, other] of result.structures.entries()) {
    if (index === structureIndex || other.shelfId !== structure.shelfId) {
      continue;
    }
    gap = Math.max(gap, segmentsDistance(structureSegments(structure), structureSegments(other)));
  }
  return gap;
}

describe('placeStructures', () => {
  it('holds the placement contract across a wide seed pool', () => {
    for (const seed of SEEDS) {
      const result = place(seed);
      const problems = validatePlacement(result.structures, disc, INSIDE_SHARE);
      expect(problems, `seed ${seed}: ${problems.join('; ')}`).toEqual([]);

      for (const [index, structure] of result.structures.entries()) {
        expect(
          groupGap(result, index),
          `seed ${seed}: group around "${structure.id}" spread too far`
        ).toBeLessThanOrEqual(GROUP_LIMIT + 1e-9);
      }
    }
  }, 30000);

  it('builds one shelf per group and per isolated structure', () => {
    for (const seed of SEEDS.slice(0, 25)) {
      const result = place(seed);
      const sizes = new Map<string, number>();
      for (const structure of result.structures) {
        sizes.set(structure.shelfId, (sizes.get(structure.shelfId) ?? 0) + 1);
      }
      const groups = [...sizes.values()].filter(size => size > 1).length;
      const isolated = [...sizes.values()].filter(size => size === 1).length;

      expect(new Set(result.structures.map(structure => structure.shelfId)).size).toBe(
        result.shelves.length
      );
      expect(result.shelves).toHaveLength(groups + isolated);
    }
  }, 15000);

  it('is deterministic per seed and varies between seeds', () => {
    expect(place(7)).toEqual(place(7));
    expect(place(7)).not.toEqual(place(8));
  });

  it('keeps the same contract in a rectangle world', () => {
    const rectangle = createMaskSampler(new Uint8Array(64 * 64).fill(1), 64, 64);

    for (const seed of SEEDS.slice(0, 50)) {
      const result = placeStructures(
        drafts(8, seed),
        rectangle,
        DEFAULT_LANDMASS_CONFIG.shelf,
        new SeededRandom(seed)
      );
      expect(validatePlacement(result.structures, rectangle, INSIDE_SHARE)).toEqual([]);
    }
  }, 20000);

  it('never leaves a collision when the world cannot take everything', () => {
    // A world much smaller than the influence budget: the placement must drop.
    const small = createMaskSampler(smallDiscMask(), 32, 32);

    for (const seed of [1, 2, 3, 4, 5]) {
      const many = drafts(20, seed, 1);
      const result = placeStructures(
        many,
        small,
        DEFAULT_LANDMASS_CONFIG.shelf,
        new SeededRandom(seed)
      );

      expect(validatePlacement(result.structures, small, INSIDE_SHARE)).toEqual([]);
      expect(result.structures.length + result.dropped).toBe(many.length);
      expect(result.dropped).toBeGreaterThan(0);
      // Dissolved members must not keep a shelf that spans the world.
      for (const [index, structure] of result.structures.entries()) {
        expect(
          groupGap(result, index),
          `seed ${seed}: group around "${structure.id}" spread too far`
        ).toBeLessThanOrEqual(GROUP_LIMIT + 1e-9);
      }
    }
  }, 30000);
});

/** A world mask covering only the middle of the map. */
function smallDiscMask(size = 32, radius = 0.05): Uint8Array {
  const mask = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x / (size - 1) - 0.5;
      const dy = y / (size - 1) - 0.5;
      mask[y * size + x] = Math.hypot(dx, dy) <= radius ? 1 : 0;
    }
  }
  return mask;
}
