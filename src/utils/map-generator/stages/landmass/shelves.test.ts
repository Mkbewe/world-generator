import { DEFAULT_LANDMASS_CONFIG } from './defaults';
import { createGroupShelves, planGroups } from './shelves';
import { SeededRandom } from '../../random/seeded-random';

const shelf = DEFAULT_LANDMASS_CONFIG.shelf;

describe('planGroups', () => {
  it('keeps small worlds isolated', () => {
    expect(planGroups(3, new SeededRandom(5))).toEqual([]);
  });

  it('always mixes groups with isolated structures', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const groups = planGroups(10, new SeededRandom(seed));
      const grouped = new Set(groups.flat());

      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(groups.every(group => group.length >= 2)).toBe(true);
      expect(grouped.size).toBeLessThan(10);
    }
  });

  it('is deterministic per seed', () => {
    expect(planGroups(10, new SeededRandom(7))).toEqual(planGroups(10, new SeededRandom(7)));
    expect(planGroups(10, new SeededRandom(7))).not.toEqual(planGroups(10, new SeededRandom(8)));
  });
});

describe('createGroupShelves', () => {
  it('gives every group one shelf and every other structure its own', () => {
    const { shelfOf, shelves } = createGroupShelves([[0, 2]], [0, 1, 2, 3], shelf);

    expect(shelfOf.get(0)).toBe(shelfOf.get(2));
    expect(new Set([shelfOf.get(0), shelfOf.get(1), shelfOf.get(3)]).size).toBe(3);
    expect(shelves).toHaveLength(3);
    expect(shelves.every(entry => entry.width === shelf.width)).toBe(true);
  });

  it('builds shelves only for the placed structures', () => {
    const { shelfOf, shelves } = createGroupShelves([], [0, 2], shelf);

    expect(shelfOf.has(1)).toBe(false);
    expect(shelves).toHaveLength(2);
  });
});
