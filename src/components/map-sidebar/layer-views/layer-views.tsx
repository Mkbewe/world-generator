import { useTranslation } from 'react-i18next';
import { Flex, RadioCards, Text } from '@radix-ui/themes';

import type { MapBaseLayerId, MapLayerNavigation, MapLayerNode } from '../../../utils/map-renderer';
import styles from './layer-views.module.scss';

interface LayerViewsProps extends MapLayerNavigation {
  onViewChange: (layer: MapBaseLayerId) => void;
}

/** Groups are a single level deep, so only the active one is shown. */
function rendersViews(
  node: MapLayerNode
): node is MapLayerNode & { children: readonly MapLayerNode[] } {
  return node.children !== undefined && node.children.length > 1;
}

export function LayerViews({ tabs, activeTab, onViewChange }: LayerViewsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.sections}>
      {tabs.filter(rendersViews).map(group => (
        <Flex
          key={group.id}
          direction='column'
          gap='3'
          className={styles.section}
          data-active={group.id === activeTab}
          aria-hidden={group.id !== activeTab}
          inert={group.id !== activeTab}
        >
          <Text size='2' weight='bold' color='gray'>
            {t(group.labelKey)}
          </Text>
          <RadioCards.Root
            columns='1'
            gap='2'
            size='1'
            className={styles.options}
            aria-label={t('layers.view', { name: t(group.labelKey) })}
            value={group.selectedChild}
            onValueChange={value => {
              const child = group.children.find(child => child.id === value);
              if (child?.available) {
                onViewChange(child.selectedLayer);
              }
            }}
          >
            {group.children.map(child => (
              <RadioCards.Item
                key={child.id}
                value={child.id}
                disabled={!child.available}
                className={styles.option}
              >
                {t(child.labelKey)}
              </RadioCards.Item>
            ))}
          </RadioCards.Root>
        </Flex>
      ))}
    </div>
  );
}
