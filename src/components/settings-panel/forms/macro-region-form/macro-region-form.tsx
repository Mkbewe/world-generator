import { Flex } from '@radix-ui/themes';

import { BaseLayoutField } from './base-layout-field';
import { BaseRegionSection } from './base-region-section';
import { BorderSettings } from './border-settings';
import { OverlayRegionSection } from './overlay-region-section';
import { PresetPicker } from './preset-picker';

export function MacroRegionForm() {
  return (
    <Flex direction='column' gap='4'>
      <PresetPicker />
      <BaseLayoutField />
      <BaseRegionSection />
      <OverlayRegionSection />
      <BorderSettings />
    </Flex>
  );
}
