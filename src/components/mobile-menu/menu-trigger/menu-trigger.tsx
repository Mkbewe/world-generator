import { useTranslation } from 'react-i18next';
import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { IconButton } from '@radix-ui/themes';

interface MenuTriggerProps {
  isOpen: boolean;
  onOpen: () => void;
}

export function MenuTrigger({ isOpen, onOpen }: MenuTriggerProps) {
  const { t } = useTranslation();

  return (
    <IconButton
      size='3'
      variant='surface'
      aria-label={t('mobileMenu.open')}
      aria-expanded={isOpen}
      onClick={onOpen}
    >
      <HamburgerMenuIcon />
    </IconButton>
  );
}
