import { useTranslation } from 'react-i18next';
import type { GeologicalRegionConfig } from '@generator/types';
import { geologyRegionColor } from '@layers';
import { RadioCards, Text } from '@radix-ui/themes';

import { EditorCard } from '../../../../editor-card';
import { EditorCardHeader } from '../../../../editor-card-header';
import {
  EditorCardSelectionControls,
  type EditorCardSelectionControlsProps,
} from '../../../../editor-card-selection-controls';
import { REGION_TYPE_OPTIONS } from '../lib/region-options';

interface GeologicalRegionCardProps {
  index: number;
  region: GeologicalRegionConfig;
  selection: EditorCardSelectionControlsProps;
  onChange: (patch: Partial<GeologicalRegionConfig>) => void;
}

/** Type and character of the active region; its area is edited on the bar. */
export function GeologicalRegionCard({
  index,
  region,
  selection,
  onChange,
}: GeologicalRegionCardProps) {
  const { t } = useTranslation();
  const selected = REGION_TYPE_OPTIONS.find(option => option.id === region.type);

  return (
    <EditorCard>
      <EditorCardHeader
        color={geologyRegionColor(region.type, index)}
        actions={<EditorCardSelectionControls {...selection} />}
      >
        <Text size='2' weight='bold'>
          {t('common.regionName', { index: index + 1 })}
        </Text>
      </EditorCardHeader>
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
    </EditorCard>
  );
}
