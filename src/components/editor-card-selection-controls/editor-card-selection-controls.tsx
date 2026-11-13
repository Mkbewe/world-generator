import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { Button, Flex } from '@radix-ui/themes';

export interface EditorCardSelectionControlsProps {
  ids: readonly string[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

/** Moves the selection to the previous or next item without reordering the list. */
export function EditorCardSelectionControls({
  ids,
  selectedId,
  onSelect,
}: EditorCardSelectionControlsProps) {
  const { t } = useTranslation();
  const index = selectedId === undefined ? -1 : ids.indexOf(selectedId);
  const hasPrevious = index > 0;
  const hasNext = index >= 0 && index < ids.length - 1;

  const selectAt = (offset: -1 | 1): void => {
    if (index < 0) {
      return;
    }
    const id = ids[index + offset];
    if (id !== undefined) {
      onSelect(id);
    }
  };

  return (
    <Flex gap='1'>
      <Button
        size='1'
        variant='soft'
        aria-label={t('selectionControls.previous')}
        disabled={!hasPrevious}
        onClick={() => selectAt(-1)}
      >
        <ArrowLeftIcon />
      </Button>
      <Button
        size='1'
        variant='soft'
        aria-label={t('selectionControls.next')}
        disabled={!hasNext}
        onClick={() => selectAt(1)}
      >
        <ArrowRightIcon />
      </Button>
    </Flex>
  );
}
