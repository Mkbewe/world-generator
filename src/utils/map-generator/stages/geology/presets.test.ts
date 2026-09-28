import { isGeologyConfig } from './geology-check';
import {
  createGeologicalArea,
  DEFAULT_GEOLOGICAL_AREA,
  GEOGRAPHY_PRESETS,
  GEOLOGICAL_AREA_PRESETS,
  normalizeDirection,
} from './presets';

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

  it('fills every geography preset with a valid, unique area list', () => {
    for (const preset of Object.values(GEOGRAPHY_PRESETS)) {
      expect(isGeologyConfig(preset)).toBe(true);
      const ids = preset.areas.map(area => area.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(preset.areas.length).toBeGreaterThan(0);
    }
  });

  it('gives each geography preset its own mix of area characters', () => {
    const reliefs = Object.values(GEOGRAPHY_PRESETS).map(preset =>
      preset.areas.map(area => area.relief)
    );

    expect(reliefs[0]).not.toEqual(reliefs[1]);
    expect(reliefs[1]).not.toEqual(reliefs[2]);
  });
});
