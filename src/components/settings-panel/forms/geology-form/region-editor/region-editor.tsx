import { Card, Flex, SegmentedControl, Text } from '@radix-ui/themes';

import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';
import { REGION_TYPE_OPTIONS } from '../lib/region-options';

export interface RegionEditorProps {
  index: number;
  region: GeologicalRegionConfig;
  onChange: (patch: Partial<GeologicalRegionConfig>) => void;
}

/** Type and character of the active region; its area is edited on the bar. */
export function RegionEditor({ index, region, onChange }: RegionEditorProps) {
  const selected = REGION_TYPE_OPTIONS.find(option => option.id === region.type);
  return (
    <Card variant='surface'>
      <Flex direction='column' gap='3'>
        <Text size='2' weight='bold'>{`Region ${index + 1}`}</Text>
        <SegmentedControl.Root
          value={region.type}
          aria-label='Region type'
          onValueChange={value => {
            const option = REGION_TYPE_OPTIONS.find(item => item.id === value);
            if (option) {
              onChange({ type: option.id });
            }
          }}
        >
          {REGION_TYPE_OPTIONS.map(option => (
            <SegmentedControl.Item key={option.id} value={option.id}>
              {option.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
        {selected && <Text size='1' color='gray'>{`Character: ${selected.description}`}</Text>}
      </Flex>
    </Card>
  );
}
