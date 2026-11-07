import { useTranslation } from 'react-i18next';
import { TrashIcon } from '@radix-ui/react-icons';
import { Box, Button, Flex, TextField } from '@radix-ui/themes';

import { useMacroRegionFormStore } from '../../../../../../stores';
import type { MacroRegionConfig } from '../../../../../../utils/map-generator/types';
import { regionColor } from '../../../../../../utils/map-layers';
import { colorString } from '../../../../../lib/color';
import styles from './region-card-header.module.scss';

export function RegionCardHeader({
  region,
  index,
  canRemove = true,
}: {
  region: MacroRegionConfig;
  index: number;
  canRemove?: boolean;
}) {
  const { t } = useTranslation();
  const updateRegion = useMacroRegionFormStore(state => state.updateRegion);
  const removeRegion = useMacroRegionFormStore(state => state.removeRegion);

  return (
    <Flex gap='2' align='center'>
      <Box
        aria-hidden
        className={styles.regionSwatch}
        style={{ backgroundColor: colorString(regionColor(index)) }}
      />
      <TextField.Root
        value={region.label}
        aria-label={t('forms.macroRegion.regionLabelAria')}
        className={styles.regionName}
        onChange={event => updateRegion(region.id, { label: event.target.value })}
      />
      <Button
        size='1'
        variant='soft'
        color='red'
        aria-label={t('forms.macroRegion.removeRegion', { label: region.label })}
        disabled={!canRemove}
        onClick={() => removeRegion(region.id)}
      >
        <TrashIcon />
      </Button>
    </Flex>
  );
}
