import { MAX_GEOLOGICAL_AREAS } from './defaults';
import { isGeologicalAreaConfig, isGeologyConfig, isGeologyPlan } from './geology-check';
import { createGeologicalArea, DEFAULT_GEOLOGY_CONFIG, GEOLOGICAL_AREA_PRESETS } from './presets';
import type { GeologicalAreaPlan, TerrainProfile } from '../../types';

const PROFILE: TerrainProfile = {
  elevation: 0.5,
  roughness: 0.5,
  mountainStrength: 0.5,
  hillStrength: 0.5,
  plateauStrength: 0.5,
  lakePotential: 0.5,
  erosionStrength: 0.5,
  coastalCliffStrength: 0.5,
};

function planArea(id: string): GeologicalAreaPlan {
  return {
    id,
    character: 'ordinary',
    centre: { x: 0.5, y: 0.5 },
    extent: 0.2,
    elongation: 0.3,
    direction: 0,
    upliftDensity: 0.5,
    upliftScaleMeters: 600,
    fragmentation: 0.4,
    seabedOffsetMeters: 0,
    shelfWidthMeters: 400,
    rimStrength: 0,
    reefSites: [],
    relief: 'plains',
    profile: PROFILE,
  };
}

describe('isGeologyConfig', () => {
  it('accepts the default configuration and every preset', () => {
    expect(isGeologyConfig(DEFAULT_GEOLOGY_CONFIG)).toBe(true);
    for (const preset of Object.keys(GEOLOGICAL_AREA_PRESETS)) {
      const id = preset as keyof typeof GEOLOGICAL_AREA_PRESETS;
      expect(isGeologyConfig({ areas: [createGeologicalArea('area-1', id)] })).toBe(true);
    }
  });

  it('rejects out-of-range numbers', () => {
    const base = createGeologicalArea('area-1', 'shallow-archipelago');
    expect(isGeologyConfig({ areas: [{ ...base, extent: 0.01 }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, upliftScaleMeters: 50 }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, seabedOffsetMeters: -500 }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, shelfWidthMeters: 2000 }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, elongation: 1.2 }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, rimStrength: -0.1 }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, direction: Number.NaN }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, direction: -1 }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, direction: Math.PI * 2 }] })).toBe(false);
  });

  it('rejects malformed entries and duplicate ids', () => {
    const base = createGeologicalArea('area-1', 'shallow-archipelago');
    expect(isGeologyConfig({ areas: [{ ...base, id: '' }] })).toBe(false);
    expect(isGeologyConfig({ areas: [base, base] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, relief: 'swamp' }] })).toBe(false);
    expect(isGeologyConfig({ areas: [{ ...base, placement: { kind: 'fixed' } }] })).toBe(false);
    expect(
      isGeologyConfig({
        areas: [{ ...base, placement: { kind: 'fixed', position: { x: 1.4, y: 0.5 } } }],
      })
    ).toBe(false);
    expect(isGeologyConfig({ areas: [null] })).toBe(false);
    expect(isGeologyConfig({})).toBe(false);
    expect(isGeologyConfig(undefined)).toBe(false);
  });

  it('accepts a fixed placement inside the world', () => {
    const area = createGeologicalArea('area-1', 'atoll', {
      kind: 'fixed',
      position: { x: 0.25, y: 0.75 },
    });
    expect(isGeologyConfig({ areas: [area] })).toBe(true);
  });

  it('caps the area list length', () => {
    const areas = Array.from({ length: MAX_GEOLOGICAL_AREAS + 1 }, (_, index) =>
      createGeologicalArea(`area-${index}`, 'volcanic')
    );
    expect(isGeologyConfig({ areas })).toBe(false);
  });
});

describe('isGeologicalAreaConfig', () => {
  it('accepts a preset area and rejects a broken one', () => {
    const area = createGeologicalArea('area-1', 'volcanic');
    expect(isGeologicalAreaConfig(area)).toBe(true);
    expect(isGeologicalAreaConfig({ ...area, extent: 0 })).toBe(false);
  });
});

describe('isGeologyPlan', () => {
  it('accepts areas ordered by id', () => {
    expect(isGeologyPlan({ areas: [planArea('alpha'), planArea('beta')] })).toBe(true);
  });

  it('rejects ids out of order or duplicated', () => {
    expect(isGeologyPlan({ areas: [planArea('beta'), planArea('alpha')] })).toBe(false);
    expect(isGeologyPlan({ areas: [planArea('alpha'), planArea('alpha')] })).toBe(false);
  });

  it('rejects an invalid centre or profile', () => {
    expect(isGeologyPlan({ areas: [{ ...planArea('alpha'), centre: { x: 2, y: 0.5 } }] })).toBe(
      false
    );
    expect(
      isGeologyPlan({ areas: [{ ...planArea('alpha'), profile: { ...PROFILE, elevation: 2 } }] })
    ).toBe(false);
    expect(
      isGeologyPlan({
        areas: [{ ...planArea('alpha'), reefSites: [{ centre: { x: 2, y: 0.5 }, radius: 0.1 }] }],
      })
    ).toBe(false);
    expect(
      isGeologyPlan({
        areas: [{ ...planArea('alpha'), character: 'mountain' }],
      })
    ).toBe(false);
  });
});
