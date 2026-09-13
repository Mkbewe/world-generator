import { Button, Flex, Grid, Text } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../stores';
import { MACRO_REGION_PRESETS } from '../../../../utils/map-generator/stages/macro-region-presets';

export function PresetPicker() {
  const applyPreset = useMacroRegionFormStore(state => state.applyPreset);

  return (
    <Flex direction='column' gap='2'>
      <Text size='2' weight='bold' color='gray'>
        Presets
      </Text>
      <Grid columns='2' gap='2'>
        {MACRO_REGION_PRESETS.map(preset => (
          <Button
            key={preset.id}
            size='1'
            variant='soft'
            title={preset.description}
            onClick={() => applyPreset(preset.id)}
          >
            {preset.label}
          </Button>
        ))}
      </Grid>
      <Text size='1' color='gray'>
        Choose a starting point, then adjust any region below.
      </Text>
    </Flex>
  );
}
