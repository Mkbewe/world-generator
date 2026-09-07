import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { Cross1Icon, HamburgerMenuIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Button, Flex, IconButton, VisuallyHidden } from '@radix-ui/themes';

import { isActivePath, NAVIGATION_ITEMS } from '../navigation';
import styles from './mobile-menu.module.scss';

interface MobileMenuProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MobileMenu({ onToggleTheme, currentTheme }: MobileMenuProps) {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const themeLabel = `Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`;
  const themeIcon = currentTheme === 'light' ? <MoonIcon /> : <SunIcon />;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Flex display={{ initial: 'flex', sm: 'none' }}>
      <IconButton
        size='3'
        variant='surface'
        aria-label='Open menu'
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <HamburgerMenuIcon />
      </IconButton>
      {isOpen && (
        <div className={styles.overlay}>
          <button
            type='button'
            className={styles.overlayClose}
            aria-hidden='true'
            tabIndex={-1}
            onClick={() => setIsOpen(false)}
          />
          <section
            className={styles.drawer}
            role='dialog'
            aria-modal='false'
            aria-labelledby='mobile-menu-title'
          >
            <Flex justify='between' align='center' mb='6'>
              <h2 id='mobile-menu-title' className={styles.title}>
                Menu
              </h2>
              <IconButton
                size='3'
                variant='ghost'
                color='gray'
                aria-label='Close menu'
                onClick={() => setIsOpen(false)}
              >
                <Cross1Icon />
              </IconButton>
            </Flex>
            <VisuallyHidden>World Generator actions</VisuallyHidden>
            <Flex direction='column' className={styles.actions}>
              {NAVIGATION_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={
                    isActivePath(pathname, item.to)
                      ? `${styles.navLink} ${styles.navLinkActive}`
                      : styles.navLink
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {onToggleTheme && (
                <Button
                  onClick={onToggleTheme}
                  size='3'
                  variant='soft'
                  className={styles.themeButton}
                >
                  {themeIcon}
                  {themeLabel}
                </Button>
              )}
            </Flex>
          </section>
        </div>
      )}
    </Flex>
  );
}
