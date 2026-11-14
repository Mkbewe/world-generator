import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FrameIcon, GlobeIcon, LayersIcon, SewingPinIcon, SunIcon } from '@radix-ui/react-icons';
import { Tabs } from '@radix-ui/themes';

import type { MapBaseLayerId, MapLayerNavigation } from '../../../../utils/map-renderer';
import styles from './layer-tabs.module.scss';

const LAYER_ICONS: Readonly<Partial<Record<MapBaseLayerId, ReactNode>>> = {
  'world-shape': <GlobeIcon />,
  'macro-region': <LayersIcon />,
  'heat-zones': <SunIcon />,
  'moisture': <SunIcon />,
  'ocean-currents': <SunIcon />,
  'geology': <SewingPinIcon />,
};

interface LayerTabsProps {
  navigation: MapLayerNavigation;
  onLayerChange: (layer: MapBaseLayerId) => void;
  /** Centers the strip and releases its fixed height, used by the fullscreen mode. */
  expanded?: boolean;
}

export const LayerTabs = memo(function LayerTabs({
  navigation,
  onLayerChange,
  expanded = false,
}: LayerTabsProps) {
  const { t } = useTranslation();
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
      <Tabs.List aria-label={t('layers.aria')} className={styles.strip}>
        {tabs.map(tab => (
          <Tabs.Trigger
            key={tab.id}
            value={tab.id}
            aria-label={t(tab.labelKey)}
            title={t(tab.labelKey)}
            disabled={!tab.available}
            className={styles.trigger}
          >
            <span className={styles.icon}>{tabIcon(tab.selectedLayer)}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
});

function tabIcon(id: MapBaseLayerId): ReactNode {
  return LAYER_ICONS[id] ?? <FrameIcon />;
}
