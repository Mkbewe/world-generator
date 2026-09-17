import type { ReactNode } from 'react';
import { FrameIcon, GlobeIcon, LayersIcon, MixerHorizontalIcon } from '@radix-ui/react-icons';
import { Tabs } from '@radix-ui/themes';

import type { MapBaseLayerId, MapLayerNavigation } from '../../utils/map-renderer';
import styles from './layer-tabs.module.scss';

const LAYER_ICONS: Record<string, ReactNode> = {
  'world-shape': <GlobeIcon />,
  'macro-region': <LayersIcon />,
  noise: <MixerHorizontalIcon />,
};

interface LayerTabsProps {
  navigation: MapLayerNavigation;
  onLayerChange: (layer: MapBaseLayerId) => void;
  /** Centers the strip and releases its fixed height, used by the fullscreen mode. */
  expanded?: boolean;
}

export function LayerTabs({ navigation, onLayerChange, expanded = false }: LayerTabsProps) {
  const { tabs, activeTab } = navigation;
  const selectTab = (id: string): void => {
    const tab = tabs.find(tab => tab.id === id);
    if (tab?.available) {
      onLayerChange(tab.selectedLayer);
    }
  };

  return (
    <Tabs.Root
      orientation='vertical'
      value={activeTab ?? ''}
      onValueChange={selectTab}
      className={styles.root}
      data-expanded={expanded || undefined}
    >
      <Tabs.List aria-label='Map layers' className={styles.strip}>
        {tabs.map(tab => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            aria-label={tab.label}
            title={tab.label}
            disabled={!tab.available}
            className={styles.trigger}
          >
            <span className={styles.icon}>{LAYER_ICONS[tab.id] ?? <FrameIcon />}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
