import { useTranslation } from 'react-i18next';
import type { GeologicalRegionConfig } from '@generator/types';
import { Card, Flex, RadioCards, Text } from '@radix-ui/themes';

import { REGION_TYPE_OPTIONS } from '../lib/region-options';

export interface RegionEditorProps {
  index: number;
  region: GeologicalRegionConfig;
  onChange: (patch: Partial<GeologicalRegionConfig>) => void;
}

/** Type and character of the active region; its area is edited on the bar. */
export function RegionEditor({ index, region, onChange }: RegionEditorProps) {
  const { t } = useTranslation();
  const selected = REGION_TYPE_OPTIONS.find(option => option.id === region.type);
  return (
    <Card variant='surface'>
      <Flex direction='column' gap='3'>
        <Text size='2' weight='bold'>
          {t('common.regionName', { index: index + 1 })}
        </Text>
        <RadioCards.Root
          columns='2'
          gap='2'
          size='1'
          value={region.type}
          aria-label={t('forms.geology.regionTypeAria')}
          onValueChange={value => {
            const option = REGION_TYPE_OPTIONS.find(item => item.id === value);
            if (option) {
              onChange({ type: option.id });
            }
          }}
        >
          {REGION_TYPE_OPTIONS.map(option => (
            <RadioCards.Item key={option.id} value={option.id}>
              {t(option.labelKey)}
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
        {selected && (
          <Text size='1' color='gray'>
            {t('forms.geology.character', { character: t(selected.descriptionKey) })}
          </Text>
        )}
      </Flex>
    </Card>
  );
}
