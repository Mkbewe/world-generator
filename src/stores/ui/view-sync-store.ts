import { LAYER_CATALOG } from '../../utils/map-layers';
import { type MapBaseLayerId, type MapFeatureSelection } from '../../utils/map-renderer';
import { createStore } from '../create-store';

export type { MapFeatureSelection };

/** Settings form tabs: the shared general tab plus one per map layer with a form. */
export type SettingsTab = 'general' | MapBaseLayerId;

const SETTINGS_TABS: readonly SettingsTab[] = [
  'general',
  ...LAYER_CATALOG.filter(layer => layer.settingsForm !== false).map(layer => layer.id),
];

export interface ViewSyncValues {
  /** Active settings form tab; remembered across navigation. */
  settingsTab: SettingsTab;
  /** Whether settings tabs and preview layers follow each other. */
  linked: boolean;
  /** Feature selected for editing and highlighted on the map. */
  selectedFeature?: MapFeatureSelection;
}

export const VIEW_SYNC_DEFAULTS: ViewSyncValues = {
  settingsTab: 'general',
  linked: false,
  selectedFeature: undefined,
};

interface ViewSyncState extends ViewSyncValues {
  setSettingsTab: (tab: SettingsTab) => void;
  setLinked: (linked: boolean) => void;
  selectFeature: (feature: MapFeatureSelection | undefined, settingsTab?: SettingsTab) => void;
}

export const useViewSyncStore = createStore<ViewSyncState>(set => ({
  ...VIEW_SYNC_DEFAULTS,
  setSettingsTab: settingsTab => set({ settingsTab }),
  setLinked: linked => set({ linked }),
  selectFeature: (selectedFeature, settingsTab) =>
    set(state => ({
      selectedFeature,
      ...(settingsTab === undefined || settingsTab === state.settingsTab ? {} : { settingsTab }),
    })),
}));

/** Feature id when the selection belongs to `layerId`; otherwise undefined. */
export function featureIdOnLayer(
  selection: MapFeatureSelection | undefined,
  layerId: MapBaseLayerId
): string | undefined {
  return selection?.layerId === layerId ? selection.featureId : undefined;
}

/** Preview layer a settings tab drives; the general tab has no counterpart. */
export function layerForTab(tab: SettingsTab): MapBaseLayerId | undefined {
  return SETTINGS_TABS.includes(tab) && tab !== 'general' ? tab : undefined;
}

/** Settings tab that owns a preview layer. */
export function tabForLayer(layer: MapBaseLayerId): SettingsTab | undefined {
  return SETTINGS_TABS.includes(layer) ? layer : undefined;
}
