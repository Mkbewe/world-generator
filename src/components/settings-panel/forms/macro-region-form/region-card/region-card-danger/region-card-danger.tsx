import { useMacroRegionFormStore } from '../../../../../../stores';
import type { MacroRegionConfig } from '../../../../../../utils/map-generator/types';
import { colorString } from '../../../../../lib/color';
import { SliderField } from '../../../../../slider-field';
import { dangerColor } from '../../lib/color';

export function RegionCardDanger({ region }: { region: MacroRegionConfig }) {
  const updateRegion = useMacroRegionFormStore(state => state.updateRegion);

  return (
    <SliderField
      label='Danger'
      description='Target gameplay danger used to constrain biome variants, encounters, and rewards.'
      value={region.danger}
      min={0}
      max={1}
      step={0.05}
      swatch={colorString(dangerColor(region.danger))}
      onChange={danger => updateRegion(region.id, { danger })}
    />
  );
}
