import { Flex, SegmentedControl, Separator, Text } from '@radix-ui/themes';

import type { MapBaseLayerId, MapLayerNavigation, MapLayerNode } from '../../utils/map-renderer';
import styles from './map-layer-views.module.scss';

interface MapLayerViewsProps extends MapLayerNavigation {
  onViewChange: (layer: MapBaseLayerId) => void;
}

/** Groups are a single level deep, so only the active one is shown. */
function rendersViews(
  node: MapLayerNode
): node is MapLayerNode & { children: readonly MapLayerNode[] } {
  return node.children !== undefined && node.children.length > 1;
}

export function MapLayerViews({ tabs, activeTab, onViewChange }: MapLayerViewsProps) {
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
          <Separator size='4' />
          <Text size='2' weight='bold' color='gray'>
            {group.label}
          </Text>
          <SegmentedControl.Root
            size='1'
            className={styles.options}
            aria-label={group.label + ' view'}
            value={group.selectedChild}
            onValueChange={value => {
              const child = group.children.find(child => child.id === value);
              if (child?.available) {
                onViewChange(child.selectedLayer);
              }
            }}
          >
            {group.children.map(child => (
              <SegmentedControl.Item
                key={child.id}
                value={child.id}
                aria-disabled={!child.available}
                className={styles.option}
              >
                {child.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>
        </Flex>
      ))}
    </div>
  );
}
