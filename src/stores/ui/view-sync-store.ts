import { PIPELINE_STAGES, type PipelineStageId } from '../../utils/map-generator';
import { type MapBaseLayerId } from '../../utils/map-renderer';
import { createStore } from '../create-store';

/** Settings form tabs: the shared general tab plus one per pipeline stage. */
export type SettingsTab = 'general' | PipelineStageId;

const SETTINGS_TABS: readonly SettingsTab[] = [
  'general',
  ...PIPELINE_STAGES.map(stage => stage.id),
];

export interface ViewSyncValues {
  /** Active settings form tab; remembered across navigation. */
  settingsTab: SettingsTab;
  /** Whether settings tabs and preview layers follow each other. */
  linked: boolean;
}

export const VIEW_SYNC_DEFAULTS: ViewSyncValues = {
  settingsTab: 'general',
  linked: false,
};

interface ViewSyncState extends ViewSyncValues {
  setSettingsTab: (tab: SettingsTab) => void;
  setLinked: (linked: boolean) => void;
}

export const useViewSyncStore = createStore<ViewSyncState>(set => ({
  ...VIEW_SYNC_DEFAULTS,
  setSettingsTab: settingsTab => set({ settingsTab }),
  setLinked: linked => set({ linked }),
}));

/** Preview layer a settings tab drives; the general tab has no counterpart. */
export function layerForTab(tab: SettingsTab): MapBaseLayerId | undefined {
  return tab === 'general' ? undefined : tab;
}

/** Settings tab that owns a preview layer; layers without a stage tab are ignored. */
export function tabForLayer(layer: MapBaseLayerId): SettingsTab | undefined {
  return SETTINGS_TABS.find(tab => tab === layer);
}
