import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { EnterFullScreenIcon, ExitFullScreenIcon } from '@radix-ui/react-icons';
import { IconButton } from '@radix-ui/themes';

import styles from './fullscreen-control.module.scss';

export interface FullscreenControlProps {
  /** Whether the preview currently fills the viewport. */
  active: boolean;
  /** The sidebar trigger, which takes focus back when the mode closes. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}

/** The desktop-only fullscreen switch beside the map in both sidebar modes. */
export function FullscreenControl({ active, triggerRef, onToggle }: FullscreenControlProps) {
  const { t } = useTranslation();
  const label = t(active ? 'fullscreenControls.exit' : 'fullscreenControls.enter');

  return (
    <IconButton
      ref={triggerRef}
      className={styles.control}
      size='2'
      variant='soft'
      color='gray'
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onToggle}
    >
      {active ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
    </IconButton>
  );
}
