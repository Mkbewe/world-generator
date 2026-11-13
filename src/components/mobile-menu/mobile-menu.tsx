import { useCallback, useRef, useState } from 'react';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  useEscapeKey(isOpen, close);

  return (
    <Flex display={{ initial: 'flex', sm: 'none' }}>
      <MenuTrigger isOpen={isOpen} onOpen={() => setIsOpen(true)} buttonRef={triggerRef} />
      {isOpen && (
        <MenuDrawer onClose={close} onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
      )}
    </Flex>
  );
}
