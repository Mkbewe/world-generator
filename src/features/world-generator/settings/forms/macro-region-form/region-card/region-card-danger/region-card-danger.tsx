import { useTranslation } from 'react-i18next';
import type { MacroRegionConfig } from '@generator/types';

import { colorString } from '../../../../../../../components/lib/color';
import { SliderField } from '../../../../../../../components/slider-field';
import { useMacroRegionFormStore } from '../../../../../../../stores';
import { dangerColor } from '../../lib/color';

export function RegionCardDanger({ region }: { region: MacroRegionConfig }) {
  const { t } = useTranslation();
  const updateRegion = useMacroRegionFormStore(state => state.updateRegion);

  return (
    <SliderField
      label={t('forms.macroRegion.danger')}
      description={t('forms.macroRegion.dangerDescription')}
      value={region.danger}
      min={0}
      max={1}
      step={0.05}
      swatch={colorString(dangerColor(region.danger))}
      onChange={danger => updateRegion(region.id, { danger })}
    />
  );
}
