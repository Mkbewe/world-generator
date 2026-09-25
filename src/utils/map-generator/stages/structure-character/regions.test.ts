import {
  DEFAULT_STRUCTURE_CHARACTER_CONFIG,
  MAX_REGIONS_PER_STRUCTURE,
  REGION_EXTENT_THRESHOLD,
} from './defaults';
import { buildProfiles } from './profiles';
import { buildRegions } from './regions';
import { PROFILE_FIELDS } from './tendencies';
import { SeededRandom } from '../../random/seeded-random';
import type { GeologicalStructure, StructureCharacterConfig } from '../../types';

function structure(id: string, from: number, to: number, radius = 0.05): GeologicalStructure {
  return {
    id,
    archetype: 'elongated',
    nodes: [
      { id: `${id}-n1`, position: { x: from, y: 0.5 }, radius },
      { id: `${id}-n2`, position: { x: to, y: 0.5 }, radius },
    ],
    edges: [{ id: `${id}-e1`, from: `${id}-n1`, to: `${id}-n2` }],
    shelfId: 'shelf-1',
  };
}

/** Runs the profile then the region step on one stream, like the stage. */
function build(
  structures: readonly GeologicalStructure[],
  character: Partial<StructureCharacterConfig> = {}
): {
  readonly profiles: ReturnType<typeof buildProfiles>;
  readonly regions: ReturnType<typeof buildRegions>;
} {
  const config = { ...DEFAULT_STRUCTURE_CHARACTER_CONFIG, ...character };
  const random = new SeededRandom(5);
  const profiles = buildProfiles(structures, config, random);
  return { profiles, regions: buildRegions(structures, profiles, config, 'disc', random) };
}

/** Longest side about 0.5 with the radii, well above the threshold. */
const LARGE = [structure('large', 0.3, 0.7)];
/** Longest side about 0.06 with the radii, below the threshold. */
const SMALL = [structure('small', 0.48, 0.52, 0.01)];

describe('buildRegions', () => {
  it('keeps a structure below the extent threshold uniform', () => {
    expect(REGION_EXTENT_THRESHOLD).toBeGreaterThan(0.06);
    expect(build(SMALL).regions).toEqual([]);
  });

  it('grows one to the cap regions for a large structure', () => {
    const { regions } = build(LARGE, { regionDensity: 1 });

    expect(regions.length).toBeGreaterThanOrEqual(1);
    expect(regions.length).toBeLessThanOrEqual(MAX_REGIONS_PER_STRUCTURE);
  });

  it('returns no regions at zero density', () => {
    expect(build(LARGE, { regionDensity: 0 }).regions).toEqual([]);
  });

  it('keeps ids unique and points every region at its structure', () => {
    const { regions } = build(LARGE, { regionDensity: 0.5 });
    const ids = regions.map(region => region.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(regions.every(region => region.structureId === 'large')).toBe(true);
  });

  it('anchors every center inside the world shape with a normalized radius', () => {
    const { regions } = build(LARGE, { regionDensity: 0.5 });

    expect(regions.length).toBeGreaterThan(0);
    for (const region of regions) {
      const x = 2 * region.center.x - 1;
      const y = 2 * region.center.y - 1;
      expect(x * x + y * y).toBeLessThanOrEqual(1);
      expect(region.influenceRadius).toBeGreaterThan(0);
      expect(region.influenceRadius).toBeLessThanOrEqual(1);
    }
  });

  it('copies the parent profile into a region at zero variation', () => {
    const { profiles, regions } = build(LARGE, { regionDensity: 0.5, profileVariation: 0 });

    expect(regions.length).toBeGreaterThan(0);
    for (const region of regions) {
      for (const field of PROFILE_FIELDS) {
        expect(region.profile[field]).toBe(profiles[0][field]);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    expect(build(LARGE, { regionDensity: 0.5 }).regions).toEqual(
      build(LARGE, { regionDensity: 0.5 }).regions
    );
  });
});
