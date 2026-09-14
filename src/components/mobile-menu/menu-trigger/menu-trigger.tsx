import { HamburgerMenuIcon } from '@radix-ui/react-icons';
import { IconButton } from '@radix-ui/themes';

interface MenuTriggerProps {
  isOpen: boolean;
  onOpen: () => void;
}

export function MenuTrigger({ isOpen, onOpen }: MenuTriggerProps) {
  return (
    <IconButton
      size='3'
      variant='surface'
      aria-label='Open menu'
      aria-expanded={isOpen}
      onClick={onOpen}
    >
      <HamburgerMenuIcon />
    </IconButton>
  );
}
