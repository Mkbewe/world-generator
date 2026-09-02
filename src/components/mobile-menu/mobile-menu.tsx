import { NavLink, useLocation } from 'react-router';
import { Cross1Icon, HamburgerMenuIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Button, Dialog, Flex, IconButton, VisuallyHidden } from '@radix-ui/themes';

import { isActivePath, NAVIGATION_ITEMS } from '../navigation';
import styles from './mobile-menu.module.scss';

interface MobileMenuProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MobileMenu({ onToggleTheme, currentTheme }: MobileMenuProps) {
  const { pathname } = useLocation();
  const themeLabel = `Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`;
  const themeIcon = currentTheme === 'light' ? <MoonIcon /> : <SunIcon />;

  return (
    <Flex display={{ initial: 'flex', sm: 'none' }}>
      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton size='3' variant='surface' aria-label='Open menu'>
            <HamburgerMenuIcon />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content className={styles.drawer}>
          <Flex justify='between' align='center' mb='6'>
            <Dialog.Title size='6' mb='0'>
              Menu
            </Dialog.Title>
            <Dialog.Close>
              <IconButton size='3' variant='ghost' color='gray' aria-label='Close menu'>
                <Cross1Icon />
              </IconButton>
            </Dialog.Close>
          </Flex>
          <VisuallyHidden>
            <Dialog.Description>World Generator actions</Dialog.Description>
          </VisuallyHidden>
          <Flex direction='column' className={styles.actions}>
            {NAVIGATION_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
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
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
