import { useTranslation } from 'react-i18next';
import type { MacroRegionConfig } from '@generator/types';
import { Card, Flex, SegmentedControl } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../../stores';
import { InfoLabel } from '../../../../../info-label';
import { SegmentedControlScroll } from '../../../../../segmented-control-scroll';
import { SliderField } from '../../../../../slider-field';
import { irregularityKey, MAX_IRREGULARITY } from '../../../lib/irregularity';
import { RegionCardDanger } from '../region-card-danger';
import { RegionCardHeader } from '../region-card-header';

export function OverlayRegionCard({ region, index }: { region: MacroRegionConfig; index: number }) {
  const { t } = useTranslation();
  const updateOverlay = useMacroRegionFormStore(state => state.updateOverlay);
  const deformation = useMacroRegionFormStore(state => state.deformation);
  if (region.geometry.kind !== 'band') {
    return null;
  }
  const geometry = region.geometry;
  const horizontal = geometry.axis === 'y';
  const positionLabels: readonly [string, string] = horizontal
    ? [t('forms.macroRegion.north'), t('forms.macroRegion.south')]
    : [t('forms.macroRegion.west'), t('forms.macroRegion.east')];

  return (
    <Card size='1' variant='surface'>
      <Flex direction='column' gap='2'>
        <RegionCardHeader region={region} index={index} />
        <Flex direction='column' gap='1'>
          <InfoLabel
            label={t('forms.macroRegion.direction')}
            description={t('forms.macroRegion.directionDescription')}
          />
          <SegmentedControlScroll>
            <SegmentedControl.Root
              size='1'
              value={geometry.axis}
              onValueChange={axis => updateOverlay(region.id, { axis: axis as 'x' | 'y' })}
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
      </Flex>
    </Card>
  );
}
