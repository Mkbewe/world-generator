import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MacroRegionConfig } from '@generator/types';
import { regionColor } from '@layers';
import { TrashIcon } from '@radix-ui/react-icons';
import { Button, Flex, TextField } from '@radix-ui/themes';

import { EditorCard } from '../../../../../../../components/editor-card';
import { EditorCardHeader } from '../../../../../../../components/editor-card-header';
import { EditorCardSelectionControls } from '../../../../../../../components/editor-card-selection-controls';
import { useMacroRegionFormStore } from '../../../../../../../stores';
import { RegionCardDanger } from '../region-card-danger';

interface BaseRegionCardProps {
  region: MacroRegionConfig;
  index: number;
  canRemove: boolean;
  selectionIds: readonly string[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

/** Memoized so a boundary drag only re-renders the two cards it resizes. */
export const BaseRegionCard = memo(function BaseRegionCard({
  region,
  index,
  canRemove,
  selectionIds,
  selectedId,
  onSelect,
}: BaseRegionCardProps) {
  const { t } = useTranslation();
  const updateRegion = useMacroRegionFormStore(state => state.updateRegion);
  const removeRegion = useMacroRegionFormStore(state => state.removeRegion);

  return (
    <EditorCard>
      <EditorCardHeader
        color={regionColor(index)}
        actions={
          <Flex gap='1' align='center'>
            <EditorCardSelectionControls
              ids={selectionIds}
              selectedId={selectedId}
              onSelect={onSelect}
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
        }
      >
        <TextField.Root
          value={region.label}
          aria-label={t('forms.macroRegion.regionLabelAria')}
          onChange={event => updateRegion(region.id, { label: event.target.value })}
        />
      </EditorCardHeader>
      <RegionCardDanger region={region} />
    </EditorCard>
  );
});
