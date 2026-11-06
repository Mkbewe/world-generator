import { useState } from 'react';
import { Flex } from '@radix-ui/themes';

import { MenuDrawer } from './menu-drawer';
import { MenuTrigger } from './menu-trigger';
import { useEscapeKey } from '../../hooks/use-escape-key';

interface MobileMenuProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MobileMenu({ onToggleTheme, currentTheme }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  useEscapeKey(isOpen, () => setIsOpen(false));

  return (
    <Flex display={{ initial: 'flex', sm: 'none' }}>
      <MenuTrigger isOpen={isOpen} onOpen={() => setIsOpen(true)} />
      {isOpen && (
        <MenuDrawer
          onClose={() => setIsOpen(false)}
          onToggleTheme={onToggleTheme}
          currentTheme={currentTheme}
        />
      )}
    </Flex>
  );
}
