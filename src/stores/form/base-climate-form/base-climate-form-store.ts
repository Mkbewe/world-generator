import {
  clampZoneBoundaries,
  convertLayout,
  DEFAULT_RING_EXTENT,
  type HeatZoneLayout,
  layoutOfZones,
  moveZoneIn,
  removeZoneFrom,
  ringExtentOf,
  splitLargestZone,
  zonesFromBoundaries,
} from './lib/zone-model';
import { baseClimatePresetConfig } from '../../../utils/map-generator';
import {
  MAX_HEAT_ZONE_IRREGULARITY,
  MAX_HEAT_ZONES,
} from '../../../utils/map-generator/stages/base-climate/defaults';
import type {
  BaseClimateConfig,
  HeatZoneClass,
  HeatZoneConfig,
  HeatZoneGeometry,
  OceanCurrentConfig,
} from '../../../utils/map-generator/types';
import { createStore } from '../../create-store';

/** Layout families offered as starting points in the form. */
export type BaseClimateFormPreset = 'horizontal' | 'vertical' | 'ring';

/** Visible-but-gentle border wobble so the default map is not a perfect target. */
const DEFAULT_IRREGULARITY = 0.06;
const DEFAULT_MOISTURE = 0.5;
const DEFAULT_PRESET: BaseClimateFormPreset = 'ring';
const defaultConfig = baseClimatePresetConfig('ring-world');

export const BASE_CLIMATE_FORM_DEFAULTS = {
  zones: defaultConfig.zones,
  currents: defaultConfig.currents,
  geologyCoupling: defaultConfig.geologyCoupling,
  irregularity: DEFAULT_IRREGULARITY,
  moisture: DEFAULT_MOISTURE,
  layout: layoutOfZones(defaultConfig.zones),
  ringExtent: ringExtentOf(defaultConfig.zones),
  activePreset: DEFAULT_PRESET,
  currentsEdited: false,
};

interface BaseClimateFormState {
  zones: readonly HeatZoneConfig[];
  currents: readonly OceanCurrentConfig[];
  geologyCoupling: number;
  irregularity: number;
  moisture: number;
  layout: HeatZoneLayout;
  /** Outer radius of the ring layout, remembered while editing bands. */
  ringExtent: number;
  /** Preset chosen by the user; any manual edit clears it for good. */
  activePreset?: BaseClimateFormPreset;
  /** Manual currents survive layout switches instead of being replaced. */
  currentsEdited: boolean;
  applyPreset: (preset: BaseClimateFormPreset) => void;
  applyLayout: (layout: HeatZoneLayout) => void;
  setIrregularity: (value: number) => void;
  setMoisture: (value: number) => void;
  setCurrents: (currents: readonly OceanCurrentConfig[]) => void;
  setZoneBoundaries: (boundaries: readonly number[]) => void;
  addZone: () => void;
  removeZone: (id: string) => void;
  updateZone: (id: string, patch: Partial<Pick<HeatZoneConfig, 'label' | 'thermal'>>) => void;
  moveZone: (id: string, direction: -1 | 1) => void;
}

function createZoneId(existing: readonly HeatZoneConfig[]): string {
  const highest = existing.reduce((max, zone) => {
    const match = /^zone-(\d+)$/.exec(zone.id);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  return `zone-${highest + 1}`;
}

function nextZoneLabel(zones: readonly HeatZoneConfig[]): string {
  const highest = zones.reduce((max, zone) => {
    const match = /^Zone (\d+)$/.exec(zone.label);
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  return `Zone ${highest + 1}`;
}

function defaultGeometry(layout: HeatZoneLayout, ringExtent: number): HeatZoneGeometry {
  if (layout === 'rings') {
    return { kind: 'ring', center: { x: 0.5, y: 0.5 }, innerRadius: 0, outerRadius: ringExtent };
  }
  return { kind: 'band', axis: layout === 'vertical' ? 'x' : 'y', center: 0.5, width: 1 };
}

/** Currents that match the layout family; vertical turns the horizontal gyres by 90°. */
function currentsForLayout(layout: HeatZoneLayout): readonly OceanCurrentConfig[] {
  const source = baseClimatePresetConfig(layout === 'rings' ? 'ring-world' : 'earth-like');
  if (layout !== 'vertical') {
    return source.currents;
  }
  return source.currents.map(current => ({
    ...current,
    center: { x: current.center.y, y: current.center.x },
  }));
}

export const useBaseClimateFormStore = createStore<BaseClimateFormState>(set => ({
  ...BASE_CLIMATE_FORM_DEFAULTS,
  applyPreset: preset => {
    const source = baseClimatePresetConfig(preset === 'ring' ? 'ring-world' : 'earth-like');
    const sourceLayout: HeatZoneLayout = preset === 'ring' ? 'rings' : 'horizontal';
    const layout: HeatZoneLayout = preset === 'vertical' ? 'vertical' : sourceLayout;
    const zones =
      preset === 'vertical'
        ? convertLayout(source.zones, 'horizontal', 'vertical', DEFAULT_RING_EXTENT)
        : source.zones;
    set({
      zones,
      currents: currentsForLayout(layout),
      geologyCoupling: source.geologyCoupling,
      layout,
      ringExtent: preset === 'ring' ? ringExtentOf(source.zones) : DEFAULT_RING_EXTENT,
      activePreset: preset,
      currentsEdited: false,
    });
  },
  applyLayout: layout =>
    set(state => {
      if (layout === state.layout) {
        return state;
      }
      return {
        layout,
        zones: convertLayout(state.zones, state.layout, layout, state.ringExtent),
        currents: state.currentsEdited ? state.currents : currentsForLayout(layout),
        activePreset: undefined,
      };
    }),
  setIrregularity: value =>
    set({
      irregularity: Math.min(MAX_HEAT_ZONE_IRREGULARITY, Math.max(0, value)),
    }),
  setMoisture: value => set({ moisture: Math.min(1, Math.max(0, value)) }),
  setCurrents: currents => set({ currents, currentsEdited: true, activePreset: undefined }),
  setZoneBoundaries: boundaries =>
    set(state => {
      if (boundaries.length !== state.zones.length - 1) {
        return state;
      }
      const clamped = clampZoneBoundaries(boundaries, state.zones.length);
      return {
        zones: zonesFromBoundaries(state.zones, state.layout, state.ringExtent, clamped),
        activePreset: undefined,
      };
    }),
  addZone: () =>
    set(state => {
      if (state.zones.length >= MAX_HEAT_ZONES) {
        return state;
      }
      const thermal: HeatZoneClass = state.zones[0]?.thermal ?? 'temperate';
      const zone: HeatZoneConfig = {
        id: createZoneId(state.zones),
        label: nextZoneLabel(state.zones),
        thermal,
        geometry: state.zones[0]?.geometry ?? defaultGeometry(state.layout, state.ringExtent),
      };
      return {
        zones: splitLargestZone(state.zones, state.layout, state.ringExtent, zone),
        activePreset: undefined,
      };
    }),
  removeZone: id =>
    set(state => {
      if (state.zones.length <= 1) {
        return state;
      }
      const zones = removeZoneFrom(state.zones, state.layout, state.ringExtent, id);
      return zones === state.zones ? state : { zones, activePreset: undefined };
    }),
  updateZone: (id, patch) =>
    set(state => {
      const zones = state.zones.map(zone => (zone.id === id ? { ...zone, ...patch } : zone));
      return { zones, activePreset: undefined };
    }),
  moveZone: (id, direction) =>
    set(state => {
      const zones = moveZoneIn(state.zones, state.layout, state.ringExtent, id, direction);
      return zones === state.zones ? state : { zones, activePreset: undefined };
    }),
}));

export function baseClimateConfigOf(
  state: Pick<
    BaseClimateFormState,
    'zones' | 'currents' | 'geologyCoupling' | 'irregularity' | 'moisture'
  >
): BaseClimateConfig {
  return {
    zones: state.zones,
    currents: state.currents,
    geologyCoupling: state.geologyCoupling,
    moisture: state.moisture,
    zoneIrregularity: state.irregularity,
  };
}
