import {
  DEFAULT_MACRO_DEFORMATION,
  DEFAULT_MACRO_REGIONS,
  MAX_MACRO_REGIONS,
} from '../../utils/map-generator/stages/macro-region-defaults';
import {
  createBandOverlay,
  type MacroRegionLayout,
  macroRegionPreset,
  type MacroRegionPresetId,
} from '../../utils/map-generator/stages/macro-region-presets';
import {
  applyRegionBoundaries,
  baseRegions,
  regionBoundaries,
  regionSegments,
  removeBaseRegion,
  splitLargestRegion,
} from '../../utils/map-generator/stages/macro-region-sizes';
import type { MacroRegionConfig, MacroRegionDeformation } from '../../utils/map-generator/types';
import { createStore } from '../create-store';

export const MACRO_REGION_FORM_DEFAULTS = {
  regions: DEFAULT_MACRO_REGIONS,
  layout: 'radial' as const,
  deformation: DEFAULT_MACRO_DEFORMATION,
  activePreset: 'rings' as MacroRegionPresetId,
};

interface MacroRegionFormState {
  regions: readonly MacroRegionConfig[];
  layout: MacroRegionLayout;
  deformation: MacroRegionDeformation;
  /** Preset chosen by the user; any manual edit clears it for good. */
  activePreset?: MacroRegionPresetId;
  setDeformation: (deformation: MacroRegionDeformation) => void;
  applyPreset: (preset: MacroRegionPresetId) => void;
  applyLayout: (layout: MacroRegionLayout) => void;
  setRegionBoundaries: (boundaries: readonly number[]) => void;
  addBaseRegion: () => void;
  addOverlay: (axis: 'x' | 'y') => void;
  removeRegion: (id: string) => void;
  updateRegion: (id: string, patch: Partial<Pick<MacroRegionConfig, 'label' | 'danger'>>) => void;
  updateOverlay: (
    id: string,
    patch: Partial<{ axis: 'x' | 'y'; center: number; width: number; irregularity: number }>
  ) => void;
}

let nextRegionNumber = 1;

function createRegionId(existing: readonly MacroRegionConfig[]): string {
  let id = `region-${nextRegionNumber}`;
  while (existing.some(region => region.id === id)) {
    nextRegionNumber += 1;
    id = `region-${nextRegionNumber}`;
  }
  nextRegionNumber += 1;
  return id;
}

function nextLabel(regions: readonly MacroRegionConfig[]): string {
  const highest = regions.reduce((max, region) => {
    const match = /^Region (\d+)$/.exec(region.label);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  return `Region ${highest + 1}`;
}

export const useMacroRegionFormStore = createStore<MacroRegionFormState>(set => ({
  ...MACRO_REGION_FORM_DEFAULTS,
  setDeformation: deformation => set({ deformation }),
  applyPreset: id => {
    const preset = macroRegionPreset(id);
    set({ layout: preset.layout, regions: preset.createRegions(), activePreset: id });
  },
  applyLayout: layout =>
    set(state => {
      if (layout === state.layout) {
        return state;
      }
      const boundaries = regionBoundaries(state.layout, state.regions);
      const converted = applyRegionBoundaries(layout, state.regions, boundaries);
      return { layout, regions: converted.regions, activePreset: undefined };
    }),
  setRegionBoundaries: boundaries =>
    set(state => {
      const change = applyRegionBoundaries(state.layout, state.regions, boundaries);
      return change.regions === state.regions
        ? state
        : { regions: change.regions, activePreset: undefined };
    }),
  addBaseRegion: () =>
    set(state => {
      if (state.regions.length >= MAX_MACRO_REGIONS) {
        return state;
      }

      const base = baseRegions(state.regions);
      const segments = regionSegments(state.layout, state.regions);
      const widestIndex = segments.reduce(
        (best, segment, index) => (segment.percent > segments[best].percent ? index : best),
        0
      );
      const source = base[widestIndex];
      const neighbour = base[widestIndex + 1];
      const region: MacroRegionConfig = {
        id: createRegionId(state.regions),
        label: nextLabel(state.regions),
        role: 'base',
        geometry: source.geometry,
        danger: neighbour ? (source.danger + neighbour.danger) / 2 : source.danger,
      };

      const change = splitLargestRegion(state.layout, state.regions, region);
      return change.regions === state.regions
        ? state
        : { regions: change.regions, activePreset: undefined };
    }),
  addOverlay: axis =>
    set(state => {
      if (state.regions.length >= MAX_MACRO_REGIONS) {
        return state;
      }
      const region = createBandOverlay(
        createRegionId(state.regions),
        nextLabel(state.regions),
        axis,
        0.5,
        0.16,
        1
      );
      return { regions: [...state.regions, region], activePreset: undefined };
    }),
  removeRegion: id =>
    set(state => {
      const region = state.regions.find(item => item.id === id);
      if (!region) {
        return state;
      }
      if (region.role === 'overlay') {
        return {
          regions: state.regions.filter(item => item.id !== id),
          activePreset: undefined,
        };
      }
      const change = removeBaseRegion(state.layout, state.regions, id);
      return change.regions === state.regions
        ? state
        : { regions: change.regions, activePreset: undefined };
    }),
  updateRegion: (id, patch) =>
    set(state => ({
      regions: state.regions.map(region => (region.id === id ? { ...region, ...patch } : region)),
      activePreset: undefined,
    })),
  updateOverlay: (id, patch) =>
    set(state => ({
      regions: state.regions.map(region => {
        if (region.id !== id || region.role !== 'overlay' || region.geometry.kind !== 'band') {
          return region;
        }
        const { irregularity, ...geometry } = patch;
        return {
          ...region,
          ...(irregularity === undefined ? {} : { irregularity }),
          geometry: {
            ...region.geometry,
            ...geometry,
          },
        };
      }),
      activePreset: undefined,
    })),
}));
