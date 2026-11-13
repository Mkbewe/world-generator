import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { IconButton } from '@radix-ui/themes';

interface MenuTriggerProps {
  isOpen: boolean;
  onOpen: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}

export function MenuTrigger({ isOpen, onOpen, buttonRef }: MenuTriggerProps) {
  const { t } = useTranslation();

  return (
    <IconButton
      ref={buttonRef}
      size='3'
      variant='surface'
      aria-label={t('mobileMenu.open')}
      aria-expanded={isOpen}
      aria-controls='mobile-menu'
      aria-haspopup='dialog'
      onClick={onOpen}
    >
      <HamburgerMenuIcon />
    </IconButton>
  );
}
