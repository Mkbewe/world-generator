import { useTranslation } from 'react-i18next';
import { MAX_MACRO_REGIONS } from '@generator/stages/macro-region/defaults';
import { regionColor } from '@layers';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import { type RegionTabItem, RegionTabs } from '../../../../region-tabs';
import { useMacroRegionSelection } from '../hooks/use-macro-region-selection';
import { baseRegions, overlayRegions } from '../lib/boundary-model';
import { OverlayRegionCard } from '../region-card';

/** Overlay bands: their tabs and the selected band fields. */
export function OverlayRegionSection() {
  const { t } = useTranslation();
  const regions = useMacroRegionFormStore(state => state.regions);
  const addOverlay = useMacroRegionFormStore(state => state.addOverlay);
  const baseCount = baseRegions(regions).length;
  const overlays = overlayRegions(regions);
  const { region, selectedIndex, selectRegion } = useMacroRegionSelection(overlays);
  const atLimit = regions.length >= MAX_MACRO_REGIONS;
  const tabItems: readonly RegionTabItem[] = overlays.map((item, index) => ({
    id: item.id,
    label: item.label,
    color: regionColor(baseCount + index),
  }));

  return (
    <Flex direction='column' gap='2'>
      <Flex justify='between' align='center'>
        <Flex direction='column'>
          <Text size='2' weight='bold' color='gray'>
            {t('forms.macroRegion.overlayRegions', { count: overlays.length })}
          </Text>
          <Text size='1' color='gray'>
            {t('forms.macroRegion.overlayHint')}
          </Text>
        </Flex>
        <Flex gap='2' wrap='wrap'>
          <Button
            size='1'
            variant='soft'
            aria-label={t('forms.macroRegion.addHorizontal')}
            onClick={() => addOverlay('y')}
            disabled={atLimit}
          >
            <PlusIcon /> {t('forms.macroRegion.horizontal')}
          </Button>
          <Button
            size='1'
            variant='soft'
            aria-label={t('forms.macroRegion.addVertical')}
            onClick={() => addOverlay('x')}
            disabled={atLimit}
          >
            <PlusIcon /> {t('forms.macroRegion.vertical')}
          </Button>
        </Flex>
      </Flex>
      {overlays.length > 0 && (
        <RegionTabs
          items={tabItems}
          selectedIndex={selectedIndex}
          onSelect={selectRegion}
          ariaLabel={t('forms.macroRegion.overlayRegionsAria')}
        />
      )}
      {region && <OverlayRegionCard region={region} index={baseCount + selectedIndex} />}
    </Flex>
  );
}
