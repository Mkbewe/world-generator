import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, ArrowRightIcon } from '@radix-ui/react-icons';
import { Button, Flex } from '@radix-ui/themes';

interface MoveControlsProps {
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onMoveEarlier: () => void;
  onMoveLater: () => void;
}

/** Reorders the selected item within its ordered list. */
export function MoveControls({
  canMoveEarlier,
  canMoveLater,
  onMoveEarlier,
  onMoveLater,
}: MoveControlsProps) {
  const { t } = useTranslation();

  return (
    <Flex gap='1'>
      <Button
        size='1'
        variant='soft'
        aria-label={t('moveControls.earlier')}
        disabled={!canMoveEarlier}
        onClick={onMoveEarlier}
      >
        <ArrowLeftIcon />
      </Button>
      <Button
        size='1'
        variant='soft'
        aria-label={t('moveControls.later')}
        disabled={!canMoveLater}
        onClick={onMoveLater}
      >
        <ArrowRightIcon />
      </Button>
    </Flex>
  );
}
