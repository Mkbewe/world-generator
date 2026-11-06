import { zoneBoundaries, zoneShares } from './lib/zone-model';
import {
  BASE_CLIMATE_FORM_DEFAULTS,
  baseClimateConfigOf,
  useBaseClimateFormStore,
} from './base-climate-form-store';
import { baseClimatePresetConfig, isBaseClimateConfig } from '../../../utils/map-generator';
import { MAX_HEAT_ZONES } from '../../../utils/map-generator/stages/base-climate/defaults';

function reset(): void {
  useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
}

function state() {
  return useBaseClimateFormStore.getState();
}

describe('useBaseClimateFormStore', () => {
  beforeEach(reset);

  it('starts from the ring preset', () => {
    expect(state().activePreset).toBe('ring');
    expect(state().layout).toBe('rings');
    expect(state().zones).toHaveLength(3);
    expect(isBaseClimateConfig(baseClimateConfigOf(state()))).toBe(true);
  });

  it('applies the horizontal preset and keeps its currents', () => {
    state().applyPreset('horizontal');

    const preset = baseClimatePresetConfig('earth-like');
    expect(state().activePreset).toBe('horizontal');
    expect(state().layout).toBe('horizontal');
    expect(state().zones).toHaveLength(5);
    expect(state().currents).toEqual(preset.currents);
    expect(state().geologyCoupling).toBe(preset.geologyCoupling);
  });

  it('applies the vertical preset by turning the bands', () => {
    state().applyPreset('vertical');

    expect(state().activePreset).toBe('vertical');
    expect(state().layout).toBe('vertical');
    expect(state().zones.every(zone => zone.geometry.kind === 'band')).toBe(true);
    expect(
      state().zones.every(zone => zone.geometry.kind === 'band' && zone.geometry.axis === 'x')
    ).toBe(true);
  });

  it('turns vertical currents by mirroring centres without changing their flow', () => {
    state().applyPreset('vertical');

    const source = baseClimatePresetConfig('earth-like');
    expect(state().currents.map(current => current.center)).toEqual(
      source.currents.map(current => ({ x: current.center.y, y: current.center.x }))
    );
    expect(state().currents.map(current => current.flow)).toEqual(
      source.currents.map(current => current.flow)
    );
  });

  it('converts the layout while preserving labels, classes and shares', () => {
    state().applyPreset('horizontal');
    const zone = state().zones[2];
    if (!zone) {
      throw new Error('Expected a third zone.');
    }
    state().updateZone(zone.id, { label: 'Custom', thermal: 'warm' });
    state().setZoneBoundaries([25, 45, 65, 85]);
    state().applyLayout('vertical');

    const converted = state().zones.find(item => item.id === zone.id);
    expect(converted).toMatchObject({ label: 'Custom', thermal: 'warm' });
    expect(
      zoneShares(state().zones, state().layout, state().ringExtent).map(value => Math.round(value))
    ).toEqual([25, 20, 20, 20, 15]);
    expect(state().activePreset).toBeUndefined();
  });

  it('keeps manually edited currents when the layout changes', () => {
    const [current] = state().currents;
    if (!current) {
      throw new Error('Expected a current.');
    }
    const edited = [{ ...current, strength: 0.9 }];
    state().setCurrents(edited);
    state().applyLayout('vertical');

    expect(state().currents).toBe(edited);
    expect(state().currentsEdited).toBe(true);
    expect(state().activePreset).toBeUndefined();
  });

  it('updates the border irregularity without clearing the preset', () => {
    state().setIrregularity(0.15);

    expect(state().irregularity).toBe(0.15);
    expect(state().activePreset).toBe('ring');
    expect(baseClimateConfigOf(state()).zoneIrregularity).toBe(0.15);
  });

  it('updates the world moisture without clearing the preset', () => {
    state().setMoisture(0.8);

    expect(state().moisture).toBe(0.8);
    expect(state().activePreset).toBe('ring');
    expect(baseClimateConfigOf(state()).moisture).toBe(0.8);
  });

  it('resizes zones from the distribution bar', () => {
    state().applyPreset('horizontal');
    state().setZoneBoundaries([20, 40, 60, 90]);

    const shares = zoneShares(state().zones, state().layout, state().ringExtent);
    expect(shares.map(value => Math.round(value))).toEqual([20, 20, 20, 30, 10]);
    expect(state().activePreset).toBeUndefined();
  });

  it('derives new zone ids from the current list', () => {
    state().addZone();

    expect(state().zones.some(zone => zone.id === 'zone-1')).toBe(true);
  });

  it('adds a zone by splitting the widest one and stops at the limit', () => {
    state().applyPreset('horizontal');
    state().addZone();
    expect(state().zones).toHaveLength(6);
    expect(state().activePreset).toBeUndefined();
    expect(isBaseClimateConfig(baseClimateConfigOf(state()))).toBe(true);

    while (state().zones.length < MAX_HEAT_ZONES) {
      state().addZone();
    }
    state().addZone();
    expect(state().zones).toHaveLength(MAX_HEAT_ZONES);
  });

  it('removes a zone and gives its share to the previous one', () => {
    state().applyPreset('horizontal');
    const currents = state().currents;
    const removed = state().zones[1];
    if (!removed) {
      throw new Error('Expected a second zone.');
    }
    state().removeZone(removed.id);

    expect(state().zones).toHaveLength(4);
    expect(state().zones.map(zone => zone.id)).not.toContain(removed.id);
    expect(state().currents).toBe(currents);
    expect(
      zoneShares(state().zones, state().layout, state().ringExtent).map(value => Math.round(value))
    ).toEqual([40, 20, 20, 20]);
  });

  it('keeps at least one zone', () => {
    const [first] = state().zones;
    if (!first) {
      throw new Error('Expected a zone.');
    }
    useBaseClimateFormStore.setState({ zones: [first] });

    state().removeZone(first.id);

    expect(state().zones).toHaveLength(1);
  });

  it('updates the label and thermal class of a zone', () => {
    const first = state().zones[0];
    if (!first) {
      throw new Error('Expected a zone.');
    }
    state().updateZone(first.id, { label: 'Equator', thermal: 'warm' });

    expect(state().zones[0]).toMatchObject({ label: 'Equator', thermal: 'warm' });
    expect(state().activePreset).toBeUndefined();
  });

  it('moves a zone one slot earlier or later', () => {
    const second = state().zones[1];
    if (!second) {
      throw new Error('Expected a second zone.');
    }
    state().moveZone(second.id, -1);

    expect(state().zones[0]?.id).toBe(second.id);
    expect(state().activePreset).toBeUndefined();
  });

  it('exposes boundaries that match the edited zones', () => {
    state().applyPreset('horizontal');
    state().setZoneBoundaries([20, 40, 60, 90]);

    expect(
      zoneBoundaries(state().zones, state().layout, state().ringExtent).map(value =>
        Math.round(value)
      )
    ).toEqual([20, 40, 60, 90]);
  });
});
