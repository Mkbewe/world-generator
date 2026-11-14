import { useTranslation } from 'react-i18next';
import type { HeatZoneConfig } from '@generator/types';
import { heatZoneColor } from '@layers';
import { TrashIcon } from '@radix-ui/react-icons';
import { Button, Flex, RadioCards, Text, TextField } from '@radix-ui/themes';

import { EditorCard } from '../../../../../../components/editor-card';
import { EditorCardHeader } from '../../../../../../components/editor-card-header';
import {
  EditorCardSelectionControls,
  type EditorCardSelectionControlsProps,
} from '../../../../../../components/editor-card-selection-controls';
import { useBaseClimateFormStore } from '../../../../../../stores';
import { HEAT_ZONE_CLASS_OPTIONS } from '../lib/thermal-options';

interface HeatZoneCardProps {
  zone: HeatZoneConfig;
  selection: EditorCardSelectionControlsProps;
  canRemove: boolean;
}

export function HeatZoneCard({ zone, selection, canRemove }: HeatZoneCardProps) {
  const { t } = useTranslation();
  const updateZone = useBaseClimateFormStore(state => state.updateZone);
  const removeZone = useBaseClimateFormStore(state => state.removeZone);

  return (
    <EditorCard>
      <EditorCardHeader
        color={heatZoneColor(zone.thermal, zone.id)}
        actions={
          <Flex gap='1' align='center'>
            <EditorCardSelectionControls {...selection} />
            <Button
              size='1'
              variant='soft'
              color='red'
              aria-label={t('forms.baseClimate.removeZone', { label: zone.label })}
              disabled={!canRemove}
              onClick={() => removeZone(zone.id)}
            >
              <TrashIcon />
            </Button>
          </Flex>
        }
      >
        <TextField.Root
          value={zone.label}
          aria-label={t('forms.baseClimate.zoneLabelAria')}
          onChange={event => updateZone(zone.id, { label: event.target.value })}
        />
      </EditorCardHeader>
      <RadioCards.Root
        columns='3'
        gap='2'
        size='1'
        aria-label={t('forms.baseClimate.thermalClassAria')}
        value={zone.thermal}
        onValueChange={value => {
          const option = HEAT_ZONE_CLASS_OPTIONS.find(item => item.id === value);
          if (option) {
            updateZone(zone.id, { thermal: option.id });
          }
        }}
      >
        {HEAT_ZONE_CLASS_OPTIONS.map(option => (
          <RadioCards.Item key={option.id} value={option.id}>
            {t(option.labelKey)}
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
      <Text size='1' color='gray'>
        {zone.geometry.kind === 'ring'
          ? t('forms.baseClimate.ringSummary', {
              inner: zone.geometry.innerRadius.toFixed(2),
              outer: zone.geometry.outerRadius.toFixed(2),
            })
          : t('forms.baseClimate.bandSummary', {
              width: Math.round(zone.geometry.width * 100),
              centre: Math.round(zone.geometry.center * 100),
            })}
      </Text>
    </EditorCard>
  );
}
