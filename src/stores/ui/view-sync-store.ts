import { LAYER_CATALOG } from '../../utils/map-layers';
import { type MapBaseLayerId } from '../../utils/map-renderer';
import { createStore } from '../create-store';

/** Settings form tabs: the shared general tab plus one per map layer with a form. */
export type SettingsTab = 'general' | MapBaseLayerId;

const SETTINGS_TABS: readonly SettingsTab[] = ['general', ...LAYER_CATALOG.map(layer => layer.id)];

export interface ViewSyncValues {
  /** Active settings form tab; remembered across navigation. */
  settingsTab: SettingsTab;
  /** Whether settings tabs and preview layers follow each other. */
  linked: boolean;
  /** Region selected for editing in the Geology form and highlighted on the map. */
  selectedRegionId?: string;
}

export const VIEW_SYNC_DEFAULTS: ViewSyncValues = {
  settingsTab: 'general',
  linked: false,
  selectedRegionId: undefined,
};

interface ViewSyncState extends ViewSyncValues {
  setSettingsTab: (tab: SettingsTab) => void;
  setLinked: (linked: boolean) => void;
  setSelectedRegion: (regionId: string | undefined) => void;
}

export const useViewSyncStore = createStore<ViewSyncState>(set => ({
  ...VIEW_SYNC_DEFAULTS,
  setSettingsTab: settingsTab => set({ settingsTab }),
  setLinked: linked => set({ linked }),
  setSelectedRegion: selectedRegionId => set({ selectedRegionId }),
}));

/** Preview layer a settings tab drives; the general tab has no counterpart. */
export function layerForTab(tab: SettingsTab): MapBaseLayerId | undefined {
  return tab === 'general' ? undefined : tab;
}

/** Settings tab that owns a preview layer. */
export function tabForLayer(layer: MapBaseLayerId): SettingsTab | undefined {
  return SETTINGS_TABS.includes(layer) ? layer : undefined;
}
