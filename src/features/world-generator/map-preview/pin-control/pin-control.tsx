import { useTranslation } from 'react-i18next';
import { DrawingPinFilledIcon, DrawingPinIcon } from '@radix-ui/react-icons';
import { Button } from '@radix-ui/themes';

export interface PinControlProps {
  /** Whether map taps create pins. */
  pinning: boolean;
  onToggle: () => void;
}

/** Toggles the mode that lets map taps pin a location. */
export function PinControl({ pinning, onToggle }: PinControlProps) {
  const { t } = useTranslation();

  return (
    <Button
      size='1'
      variant={pinning ? 'solid' : 'soft'}
      color={pinning ? 'violet' : 'gray'}
      aria-pressed={pinning}
      onClick={onToggle}
    >
      {pinning ? <DrawingPinFilledIcon /> : <DrawingPinIcon />}
      {t('pinControls.toggle')}
    </Button>
  );
}
