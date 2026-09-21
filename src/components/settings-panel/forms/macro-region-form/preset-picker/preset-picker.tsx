import { useMemo } from 'react';
import { Button, Flex, Grid, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../stores';
import {
  activePresetId,
  MACRO_REGION_PRESETS,
} from '../../../../../utils/map-generator/stages/macro-region-presets';

export function PresetPicker() {
  const applyPreset = useMacroRegionFormStore(state => state.applyPreset);
  const layout = useMacroRegionFormStore(state => state.layout);
  const regions = useMacroRegionFormStore(state => state.regions);
  const activeId = useMemo(() => activePresetId(regions, layout), [regions, layout]);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Presets
      </Text>
      <Grid columns='2' gap='2'>
        {MACRO_REGION_PRESETS.map(preset => {
          const active = preset.id === activeId;
          return (
            <Button
              key={preset.id}
              size='1'
              variant={active ? 'solid' : 'soft'}
              title={preset.description}
              aria-pressed={active}
              onClick={() => applyPreset(preset.id)}
            >
              {preset.label}
            </Button>
          );
        })}
      </Grid>
      <Text size='1' color='gray'>
        {activeId
          ? 'Choose a starting point, then adjust any region below.'
          : 'Regions were edited manually — choose a preset to start over.'}
      </Text>
    </Flex>
  );
}
