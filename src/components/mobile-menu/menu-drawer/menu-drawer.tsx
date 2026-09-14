import { NavLink, useLocation } from 'react-router';
import { Cross1Icon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Button, Flex, IconButton, VisuallyHidden } from '@radix-ui/themes';

import { isActivePath, NAVIGATION_ITEMS } from '../../navigation';
import styles from './menu-drawer.module.scss';

interface MenuDrawerProps {
  onClose: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MenuDrawer({ onClose, onToggleTheme, currentTheme }: MenuDrawerProps) {
  const { pathname } = useLocation();
  const themeLabel = `Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`;
  const themeIcon = currentTheme === 'light' ? <MoonIcon /> : <SunIcon />;

  return (
    <div className={styles.overlay}>
      <button
        type='button'
        className={styles.overlayClose}
        aria-hidden='true'
        tabIndex={-1}
        onClick={onClose}
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
            onClick={onClose}
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
              onClick={onClose}
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
            <Button onClick={onToggleTheme} size='3' variant='soft' className={styles.themeButton}>
              {themeIcon}
              {themeLabel}
            </Button>
          )}
        </Flex>
      </section>
    </div>
  );
}
