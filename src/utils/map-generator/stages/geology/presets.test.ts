import { isGeologyConfig } from './geology-check';
import {
  createGeographyPreset,
  createGeologicalArea,
  DEFAULT_GEOLOGICAL_AREA,
  GEOGRAPHY_PRESET_IDS,
  GEOLOGICAL_AREA_PRESETS,
  normalizeDirection,
} from './presets';

const SMALL = { widthMeters: 1000, heightMeters: 1000, sampleWidth: 32, sampleHeight: 32 };
const LARGE = { widthMeters: 4000, heightMeters: 4000, sampleWidth: 32, sampleHeight: 32 };

describe('geological area presets', () => {
  it('keeps every preset inside the contract', () => {
    for (const [id, preset] of Object.entries(GEOLOGICAL_AREA_PRESETS)) {
      const key = id as keyof typeof GEOLOGICAL_AREA_PRESETS;
      expect(isGeologyConfig({ areas: [createGeologicalArea('area-1', key)] })).toBe(true);
      expect(preset.relief).toBeTruthy();
    }
  });

  it('gives each example a distinct seabed and form signature', () => {
    const shallow = GEOLOGICAL_AREA_PRESETS['shallow-archipelago'];
    expect(shallow.shelfWidthMeters).toBeGreaterThan(0);
    expect(shallow.seabedOffsetMeters).toBeGreaterThan(0);
    expect(shallow.fragmentation).toBeGreaterThanOrEqual(0.5);

    const volcanic = GEOLOGICAL_AREA_PRESETS.volcanic;
    expect(volcanic.shelfWidthMeters).toBe(0);
    expect(volcanic.seabedOffsetMeters).toBeLessThan(0);
    expect(volcanic.relief).toBe('mountains');

    const atoll = GEOLOGICAL_AREA_PRESETS.atoll;
    expect(atoll.rimStrength).toBeGreaterThan(0);
    expect(atoll.shelfWidthMeters).toBeGreaterThan(0);
    expect(atoll.relief).toBe('plains');
  });

  it('keeps the entry id, placement and direction out of the preset', () => {
    const area = createGeologicalArea(
      'island-group',
      'atoll',
      { kind: 'fixed', position: { x: 0.2, y: 0.3 } },
      1.25
    );
    expect(area.id).toBe('island-group');
    expect(area.direction).toBe(1.25);
    expect(area.placement).toEqual({ kind: 'fixed', position: { x: 0.2, y: 0.3 } });
    expect(area.rimStrength).toBe(GEOLOGICAL_AREA_PRESETS.atoll.rimStrength);
  });

  it('normalizes headings into the contract range', () => {
    expect(normalizeDirection(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 10);
    expect(normalizeDirection(Math.PI * 2)).toBe(0);
    const area = createGeologicalArea('area-1', 'volcanic', { kind: 'automatic' }, -Math.PI / 2);
    expect(area.direction).toBeCloseTo((3 * Math.PI) / 2, 10);
  });

  it('keeps the per-field default entry valid', () => {
    expect(DEFAULT_GEOLOGICAL_AREA.direction).toBe(0);
    expect(isGeologyConfig({ areas: [DEFAULT_GEOLOGICAL_AREA] })).toBe(true);
  });

  it('resolves every geography recipe to a valid, unique area list', () => {
    for (const id of GEOGRAPHY_PRESET_IDS) {
      const preset = createGeographyPreset(id, 17, LARGE, 'disc');
      expect(isGeologyConfig(preset)).toBe(true);
      const ids = preset.areas.map(area => area.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(preset.areas.length).toBeGreaterThan(0);
    }
  });

  it('scales the area count with the physical map size', () => {
    const small = createGeographyPreset('archipelago', 17, SMALL, 'disc');
    const large = createGeographyPreset('archipelago', 17, LARGE, 'disc');
    expect(large.areas.length).toBeGreaterThan(small.areas.length);
    expect(large.areas[0].extent).toBeLessThan(small.areas[0].extent);
  });

  it('keeps an archipelago ordinary and starts other recipes with their main character', () => {
    const volcanic = GEOLOGICAL_AREA_PRESETS.volcanic;
    const atoll = GEOLOGICAL_AREA_PRESETS.atoll;
    const archipelago = createGeographyPreset('archipelago', 17, LARGE, 'disc');
    const volcanicIslands = createGeographyPreset('volcanic-islands', 17, SMALL, 'disc');
    const lagoons = createGeographyPreset('lagoons-atolls', 17, SMALL, 'disc');

    expect(
      archipelago.areas.every(
        area => area.rimStrength === 0 && area.seabedOffsetMeters > 0 && area.shelfWidthMeters > 0
      )
    ).toBe(true);
    expect(volcanicIslands.areas[0].relief).toBe(volcanic.relief);
    expect(lagoons.areas[0].rimStrength).toBe(atoll.rimStrength);
  });

  it('resolves every recipe deterministically', () => {
    for (const id of GEOGRAPHY_PRESET_IDS) {
      expect(createGeographyPreset(id, 17, LARGE, 'disc')).toEqual(
        createGeographyPreset(id, 17, LARGE, 'disc')
      );
    }
  });

  it('is deterministic for a seed and changes when the seed changes', () => {
    const first = createGeographyPreset('random', 17, LARGE, 'disc');
    expect(createGeographyPreset('random', 17, LARGE, 'disc')).toEqual(first);
    expect(createGeographyPreset('random', 18, LARGE, 'disc')).not.toEqual(first);
  });

  it('allows ordinary archipelagos to include hills and occasional mountains', () => {
    const reliefs = new Set(
      Array.from({ length: 40 }, (_value, index) =>
        createGeographyPreset('archipelago', index + 1, LARGE, 'disc').areas.map(
          area => area.relief
        )
      ).flat()
    );

    expect(reliefs).toEqual(new Set(['plains', 'hills', 'mountains']));
  });
});
