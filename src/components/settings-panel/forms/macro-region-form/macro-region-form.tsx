import { Flex } from '@radix-ui/themes';

import { BaseLayoutField } from './base-layout-field';
import { BaseRegionSection } from './base-region-section';
import { BorderSettings } from './border-settings';
import { BorderSourceField } from './border-source-field';
import { OverlayRegionSection } from './overlay-region-section';
import { PresetPicker } from './preset-picker';

export function MacroRegionForm() {
  return (
    <Flex direction='column' gap='4'>
      <BorderSourceField />
      <PresetPicker />
      <BaseLayoutField />
      <BorderSettings />
      <BaseRegionSection />
      <OverlayRegionSection />
    </Flex>
  );
}
