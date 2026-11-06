import { isBaseClimateConfig, validateBaseClimateConfig } from './base-climate-check';
import type { BaseClimateConfig } from '../../../types';
import { BASE_CLIMATE_PRESETS, baseClimatePresetConfig } from '../defaults';

function getBaseClimatePresets(): readonly BaseClimateConfig[] {
  return BASE_CLIMATE_PRESETS.map(preset => baseClimatePresetConfig(preset));
}

describe('validateBaseClimateConfig', () => {
  it('accepts every preset layout', () => {
    for (const preset of getBaseClimatePresets()) {
      expect(() => validateBaseClimateConfig(preset)).not.toThrow();
      expect(isBaseClimateConfig(preset)).toBe(true);
    }
  });

  it('rejects an empty and an oversized zone list', () => {
    const empty: BaseClimateConfig = { zones: [], currents: [], geologyCoupling: 1 };

    expect(() => validateBaseClimateConfig(empty)).toThrow('At least one heat zone');
    expect(() =>
      validateBaseClimateConfig({
        geologyCoupling: 1,
        currents: [],
        zones: Array.from({ length: 33 }, (_, index) => ({
          id: `zone-${index}`,
          label: `Zone ${index}`,
          thermal: 'cold' as const,
          geometry: { kind: 'band' as const, axis: 'y' as const, center: 0.5, width: 0.1 },
        })),
      })
    ).toThrow('At most 32 heat zones');
  });

  it('rejects duplicate ids, empty labels and an invalid thermal class', () => {
    const base = getBaseClimatePresets()[0];

    expect(() =>
      validateBaseClimateConfig({
        ...base,
        zones: base.zones.map(zone => ({ ...zone, id: 'same' })),
      })
    ).toThrow('Duplicate heat zone id');
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        zones: base.zones.map(zone => ({ ...zone, label: '' })),
      })
    ).toThrow('must have a label');
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        zones: [{ ...base.zones[0], thermal: 'hot' as never }],
      })
    ).toThrow('invalid thermal class');
  });

  it('rejects invalid band and ring geometry', () => {
    const base = getBaseClimatePresets()[0];

    expect(() =>
      validateBaseClimateConfig({
        ...base,
        zones: [
          {
            ...base.zones[0],
            geometry: { kind: 'band', axis: 'y', center: 1.5, width: 0.2 },
          },
        ],
      })
    ).toThrow('center must be within 0..1');
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        zones: [
          {
            ...base.zones[0],
            geometry: {
              kind: 'ring',
              center: { x: 0.5, y: 0.5 },
              innerRadius: 0.6,
              outerRadius: 0.4,
            },
          },
        ],
      })
    ).toThrow('valid radial range');
  });

  it('rejects invalid ocean-current sources', () => {
    const base = getBaseClimatePresets()[0];
    const source = base.currents[0];

    expect(() => validateBaseClimateConfig({ ...base, currents: [] })).toThrow(
      'At least one ocean current source'
    );
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        currents: [{ ...source, center: { x: 1.2, y: 0.5 } }],
      })
    ).toThrow('centre must be within 0..1');
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        currents: [{ ...source, flow: 'sideways' as never }],
      })
    ).toThrow('flow "sideways" is invalid');
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        currents: [{ ...source, strength: 1.2 }],
      })
    ).toThrow('strength must be within 0..1');
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        currents: [{ ...source, radius: 0 }],
      })
    ).toThrow('radius must be within');
    expect(() =>
      validateBaseClimateConfig({
        ...base,
        currents: Array.from({ length: 17 }, () => ({ ...source, center: { ...source.center } })),
      })
    ).toThrow('At most 16 ocean current sources');
  });

  it('rejects a coupling outside 0..1', () => {
    const base = getBaseClimatePresets()[0];

    expect(() => validateBaseClimateConfig({ ...base, geologyCoupling: 1.2 })).toThrow(
      'Geology coupling must be within 0..1'
    );
    expect(isBaseClimateConfig({ ...base, geologyCoupling: Number.NaN })).toBe(false);
  });

  it('rejects a moisture outside 0..1', () => {
    const base = getBaseClimatePresets()[0];

    expect(() => validateBaseClimateConfig({ ...base, moisture: -0.1 })).toThrow('moisture');
    expect(() => validateBaseClimateConfig({ ...base, moisture: 1.1 })).toThrow('moisture');
    expect(isBaseClimateConfig({ ...base, moisture: Number.NaN })).toBe(false);
    expect(isBaseClimateConfig({ ...base, moisture: 0.2 })).toBe(true);
  });

  it('rejects an invalid heat-zone irregularity', () => {
    const base = getBaseClimatePresets()[0];

    expect(() => validateBaseClimateConfig({ ...base, zoneIrregularity: -0.1 })).toThrow(
      'irregularity'
    );
    expect(() => validateBaseClimateConfig({ ...base, zoneIrregularity: 0.3 })).toThrow(
      'irregularity'
    );
    expect(isBaseClimateConfig({ ...base, zoneIrregularity: Number.NaN })).toBe(false);
    expect(isBaseClimateConfig({ ...base, zoneIrregularity: 0.1 })).toBe(true);
  });

  it('narrows only objects that pass validation', () => {
    const base = getBaseClimatePresets()[0];

    expect(isBaseClimateConfig(base)).toBe(true);
    expect(isBaseClimateConfig(null)).toBe(false);
    expect(isBaseClimateConfig({ zones: 'nope', geologyCoupling: 1 })).toBe(false);
  });
});
