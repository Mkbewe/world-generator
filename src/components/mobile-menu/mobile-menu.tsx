import { NavLink } from 'react-router';
import {
  Cross1Icon,
  DownloadIcon,
  HamburgerMenuIcon,
  MoonIcon,
  SunIcon,
} from '@radix-ui/react-icons';
import { Button, Dialog, Flex, IconButton, VisuallyHidden } from '@radix-ui/themes';

import { useFlag } from '../../feature-flags';
import { useHeaderActions } from '../header/header-actions-context';
import styles from './mobile-menu.module.scss';

interface MobileMenuProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MobileMenu({ onToggleTheme, currentTheme }: MobileMenuProps) {
  const { setIsExportDialogOpen, isMapGenerated } = useHeaderActions();
  const showExportPng = useFlag('exportPng');

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
          <Flex direction='column' gap='3' className={styles.actions}>
            <Button asChild variant='soft' size='3'>
              <NavLink
                to='/legacy-generator'
                className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
              >
                Legacy Generator
              </NavLink>
            </Button>
            <Button asChild variant='soft' size='3'>
              <NavLink
                to='/statistics'
                className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
              >
                Statistics
              </NavLink>
            </Button>
            {showExportPng && (
              <Button
                onClick={() => setIsExportDialogOpen(true)}
                size='3'
                variant='solid'
                disabled={!isMapGenerated}
                title={!isMapGenerated ? 'Generate a map first' : undefined}
              >
                <DownloadIcon />
                Export PNG
              </Button>
            )}
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
