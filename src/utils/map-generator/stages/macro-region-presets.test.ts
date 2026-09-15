import { DEFAULT_MACRO_DEFORMATION } from './macro-region-defaults';
import {
  activePresetId,
  createBandOverlay,
  createHorizontalLayout,
  createMacroRegionLayout,
  createRadialLayout,
  createRadialPolesLayout,
  createVerticalLayout,
  MACRO_REGION_PRESETS,
  macroRegionPreset,
} from './macro-region-presets';

describe('macro region presets', () => {
  it('builds adjacent radial regions ordered by danger', () => {
    const regions = createRadialLayout(4);

    expect(regions.map(region => region.id)).toEqual([
      'radial-1',
      'radial-2',
      'radial-3',
      'radial-4',
    ]);
    expect(regions.map(region => region.role)).toEqual(['base', 'base', 'base', 'base']);
    expect(regions.map(region => region.danger)).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(regions.map(region => region.geometry)).toMatchObject([
      { kind: 'ring', innerRadius: 0, outerRadius: 0.125 },
      { kind: 'ring', innerRadius: 0.125, outerRadius: 0.25 },
      { kind: 'ring', innerRadius: 0.25, outerRadius: 0.375 },
      { kind: 'ring', innerRadius: 0.375, outerRadius: 0.5 },
    ]);
  });

  it('builds horizontal base regions in spatial order', () => {
    const regions = createHorizontalLayout(5);

    expect(regions.map(region => region.danger)).toEqual([1, 0.5, 0, 0.5, 1]);
    expect(regions.map(region => region.geometry)).toMatchObject([
      { kind: 'band', axis: 'y', center: 0.1, width: 0.2 },
      { kind: 'band', axis: 'y', center: 0.3, width: 0.2 },
      { kind: 'band', axis: 'y', center: 0.5, width: 0.2 },
      { kind: 'band', axis: 'y', center: 0.7, width: 0.2 },
      { kind: 'band', axis: 'y', center: 0.9, width: 0.2 },
    ]);
  });

  it('builds vertical base regions in spatial order', () => {
    const regions = createVerticalLayout(3);

    expect(regions.map(region => region.geometry)).toMatchObject([
      { kind: 'band', axis: 'x', center: 1 / 6, width: 1 / 3 },
      { kind: 'band', axis: 'x', center: 0.5, width: 1 / 3 },
      { kind: 'band', axis: 'x', center: 5 / 6, width: 1 / 3 },
    ]);
  });

  it('creates ordinary band overlays and uses them for poles', () => {
    const overlay = createBandOverlay('road', 'Road', 'x', 0.25, 0.1, 0.2);
    const poles = createRadialPolesLayout(6);

    expect(overlay).toMatchObject({
      role: 'overlay',
      danger: 0.2,
      geometry: { kind: 'band', axis: 'x', center: 0.25, width: 0.1 },
    });
    const poleOverlays = poles.filter(region => region.role === 'overlay');
    expect(poles.filter(region => region.role === 'base')).toHaveLength(4);
    expect(poleOverlays).toMatchObject([
      { id: 'pole-north', geometry: { axis: 'y', center: 0, width: 0.32 } },
      { id: 'pole-south', geometry: { axis: 'y', center: 1, width: 0.32 } },
    ]);
    expect(
      poleOverlays.every(
        region =>
          region.irregularity !== undefined &&
          region.irregularity < DEFAULT_MACRO_DEFORMATION.amplitude
      )
    ).toBe(true);
  });

  it('creates every base layout with the requested count', () => {
    expect(createMacroRegionLayout('horizontal', 7)).toHaveLength(7);
    expect(createMacroRegionLayout('vertical', 7)).toHaveLength(7);
    expect(createMacroRegionLayout('radial', 7)).toHaveLength(7);
  });

  it('recognizes every preset from its own regions and layout', () => {
    for (const preset of MACRO_REGION_PRESETS) {
      expect(activePresetId(preset.createRegions(), preset.layout)).toBe(preset.id);
    }
  });

  it('distinguishes presets that share the same layout', () => {
    expect(activePresetId(createRadialLayout(4), 'radial')).toBe('rings');
    expect(activePresetId(createRadialPolesLayout(6), 'radial')).toBe('rings-with-poles');
  });

  it('returns nothing after manual edits or a layout-only change', () => {
    const [first, ...rest] = createRadialLayout(4);

    expect(activePresetId([{ ...first, danger: 0.5 }, ...rest], 'radial')).toBeUndefined();
    expect(activePresetId([{ ...first, label: 'Safe haven' }, ...rest], 'radial')).toBeUndefined();
    expect(activePresetId(createHorizontalLayout(5), 'vertical')).toBeUndefined();
    expect(activePresetId(createRadialLayout(5), 'radial')).toBeUndefined();
  });

  it('exposes reusable starting presets built from the same region model', () => {
    expect(MACRO_REGION_PRESETS.map(preset => preset.id)).toEqual([
      'rings',
      'horizontal',
      'vertical',
      'rings-with-poles',
    ]);

    const ringsWithPoles = macroRegionPreset('rings-with-poles');
    const first = ringsWithPoles.createRegions();
    const second = ringsWithPoles.createRegions();

    expect(ringsWithPoles.layout).toBe('radial');
    expect(first.filter(region => region.role === 'base')).toHaveLength(4);
    expect(first.filter(region => region.role === 'overlay')).toHaveLength(2);
    expect(second).not.toBe(first);
  });
});
