import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import { MAX_MACRO_REGIONS } from '../../../../../utils/map-generator/stages/macro-region/defaults';
import {
  baseRegions,
  overlayRegions,
} from '../../../../../utils/map-generator/stages/macro-region/editor/boundary-model';
import { regionColor } from '../../../../../utils/map-layers';
import { type RegionTabItem, RegionTabs } from '../../../../region-tabs';
import { useMacroRegionSelection } from '../hooks/use-macro-region-selection';
import { OverlayRegionCard } from '../region-card';

/** Overlay bands: their tabs and the selected band fields. */
export function OverlayRegionSection() {
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
            Overlay regions ({overlays.length})
          </Text>
          <Text size='1' color='gray'>
            Bands cut through the base layout. Later overlays appear on top.
          </Text>
        </Flex>
        <Flex gap='2' wrap='wrap'>
          <Button
            size='1'
            variant='soft'
            aria-label='Add horizontal overlay'
            onClick={() => addOverlay('y')}
            disabled={atLimit}
          >
            <PlusIcon /> Horizontal
          </Button>
          <Button
            size='1'
            variant='soft'
            aria-label='Add vertical overlay'
            onClick={() => addOverlay('x')}
            disabled={atLimit}
          >
            <PlusIcon /> Vertical
          </Button>
        </Flex>
      </Flex>
      {overlays.length > 0 && (
        <RegionTabs
          items={tabItems}
          selectedIndex={selectedIndex}
          onSelect={selectRegion}
          ariaLabel='Overlay regions'
        />
      )}
      {region && <OverlayRegionCard region={region} index={baseCount + selectedIndex} />}
    </Flex>
  );
}
