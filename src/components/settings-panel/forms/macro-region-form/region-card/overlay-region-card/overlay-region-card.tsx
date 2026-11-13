import { useTranslation } from 'react-i18next';
import { regionColor } from '@layers';
import { TrashIcon } from '@radix-ui/react-icons';
import { Button, Flex, SegmentedControl, TextField } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../../stores';
import { EditorCard } from '../../../../../editor-card';
import { EditorCardHeader } from '../../../../../editor-card-header';
import {
  EditorCardSelectionControls,
  type EditorCardSelectionControlsProps,
} from '../../../../../editor-card-selection-controls';
import { InfoLabel } from '../../../../../info-label';
import { isOneOf } from '../../../../../lib/option-value';
import { SegmentedControlScroll } from '../../../../../segmented-control-scroll';
import { SliderField } from '../../../../../slider-field';
import { irregularityKey, MAX_IRREGULARITY } from '../../../lib/irregularity';
import type { BandOverlayRegion } from '../../lib/boundary-model';
import { RegionCardDanger } from '../region-card-danger';

const BAND_AXES = ['x', 'y'] as const;

interface OverlayRegionCardProps {
  region: BandOverlayRegion;
  index: number;
  selection: EditorCardSelectionControlsProps;
}

export function OverlayRegionCard({ region, index, selection }: OverlayRegionCardProps) {
  const { t } = useTranslation();
  const updateRegion = useMacroRegionFormStore(state => state.updateRegion);
  const removeRegion = useMacroRegionFormStore(state => state.removeRegion);
  const updateOverlay = useMacroRegionFormStore(state => state.updateOverlay);
  const deformation = useMacroRegionFormStore(state => state.deformation);
  const geometry = region.geometry;
  const horizontal = geometry.axis === 'y';
  const positionLabels: readonly [string, string] = horizontal
    ? [t('forms.macroRegion.north'), t('forms.macroRegion.south')]
    : [t('forms.macroRegion.west'), t('forms.macroRegion.east')];

  return (
    <EditorCard>
      <EditorCardHeader
        color={regionColor(index)}
        actions={
          <Flex gap='1' align='center'>
            <EditorCardSelectionControls {...selection} />
            <Button
              size='1'
              variant='soft'
              color='red'
              aria-label={t('forms.macroRegion.removeRegion', { label: region.label })}
              onClick={() => removeRegion(region.id)}
            >
              <TrashIcon />
            </Button>
          </Flex>
        }
      >
        <TextField.Root
          value={region.label}
          aria-label={t('forms.macroRegion.regionLabelAria')}
          onChange={event => updateRegion(region.id, { label: event.target.value })}
        />
      </EditorCardHeader>
      <Flex direction='column' gap='1'>
        <InfoLabel
          label={t('forms.macroRegion.direction')}
          description={t('forms.macroRegion.directionDescription')}
        />
        <SegmentedControlScroll>
          <SegmentedControl.Root
            size='1'
            value={geometry.axis}
            onValueChange={axis => {
              if (isOneOf(axis, BAND_AXES)) {
                updateOverlay(region.id, { axis });
              }
            }}
          >
            <SegmentedControl.Item value='y'>
              {t('forms.macroRegion.horizontal')}
            </SegmentedControl.Item>
            <SegmentedControl.Item value='x'>
              {t('forms.macroRegion.vertical')}
            </SegmentedControl.Item>
          </SegmentedControl.Root>
        </SegmentedControlScroll>
      </Flex>
      <SliderField
        label={t('forms.macroRegion.position')}
        description={t(
          horizontal
            ? 'forms.macroRegion.positionHorizontalDescription'
            : 'forms.macroRegion.positionVerticalDescription'
        )}
        value={geometry.center * 100}
        min={0}
        max={100}
        step={1}
        format={value => `${Math.round(value)}%`}
        rangeLabels={positionLabels}
        onChange={center => updateOverlay(region.id, { center: center / 100 })}
      />
      <SliderField
        label={t('forms.macroRegion.width')}
        description={t('forms.macroRegion.widthDescription')}
        value={geometry.width * 100}
        min={5}
        max={100}
        step={1}
        format={value => `${Math.round(value)}%`}
        onChange={width => updateOverlay(region.id, { width: width / 100 })}
      />
      <SliderField
        label={t('forms.macroRegion.overlayIrregularity')}
        description={t('forms.macroRegion.overlayIrregularityDescription')}
        value={region.irregularity ?? deformation.amplitude}
        min={0}
        max={MAX_IRREGULARITY}
        step={0.01}
        format={value => t(irregularityKey(value))}
        rangeLabels={[t('forms.irregularity.none'), t('forms.irregularity.large')]}
        onChange={value => updateOverlay(region.id, { irregularity: value })}
      />
      <RegionCardDanger region={region} />
    </EditorCard>
  );
}
