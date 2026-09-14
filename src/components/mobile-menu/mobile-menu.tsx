import { useState } from 'react';
import { Flex } from '@radix-ui/themes';

import { useEscapeClose } from './lib/use-escape-close';
import { MenuDrawer } from './menu-drawer';
import { MenuTrigger } from './menu-trigger';

interface MobileMenuProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MobileMenu({ onToggleTheme, currentTheme }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  useEscapeClose(isOpen, () => setIsOpen(false));

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
