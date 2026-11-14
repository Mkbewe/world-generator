import { Flex } from '@radix-ui/themes';

import { HeatZoneSection } from './heat-zone-section';
import { IrregularityField } from './irregularity-field';
import { LayoutField } from './layout-field';
import { MoistureField } from './moisture-field';
import { PresetPicker } from './preset-picker';

export function BaseClimateForm() {
  return (
    <Flex direction='column' gap='4'>
      <PresetPicker />
      <LayoutField />
      <IrregularityField />
      <HeatZoneSection />
      <MoistureField />
    </Flex>
  );
}
