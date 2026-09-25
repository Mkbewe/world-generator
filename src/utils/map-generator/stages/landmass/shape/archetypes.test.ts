import { ARCHETYPE_RECIPES, isLandmassArchetype, LANDMASS_ARCHETYPES } from './archetypes';
import type { ArchetypeRange } from './draft';

describe('landmass archetypes', () => {
  it('keeps every recipe range consistent', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      const recipe = ARCHETYPE_RECIPES[archetype];
      const ranges = Object.values(recipe).filter((value): value is ArchetypeRange =>
        Array.isArray(value)
      );

      expect(ranges.every(range => range[0] <= range[1])).toBe(true);
      expect(['sine', 'walk', 'angular', 'ring']).toContain(recipe.corridor);
      expect(recipe.length[0]).toBeGreaterThan(0);
      expect(recipe.radius[0]).toBeGreaterThan(0);
      expect(recipe.taper[0]).toBeGreaterThan(0);
      expect(recipe.branches[0]).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(recipe.branches[0])).toBe(true);
      expect(Number.isInteger(recipe.branches[1])).toBe(true);
    }
  });

  it('has a recipe for every archetype and nothing else', () => {
    expect(Object.keys(ARCHETYPE_RECIPES).sort()).toEqual([...LANDMASS_ARCHETYPES].sort());
  });

  it('narrows unknown archetype names', () => {
    expect(isLandmassArchetype('atoll')).toBe(true);
    expect(isLandmassArchetype('l')).toBe(false);
    expect(isLandmassArchetype(42)).toBe(false);
  });
});
