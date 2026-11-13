import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import { Cross1Icon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Button, Flex, IconButton, Text, VisuallyHidden } from '@radix-ui/themes';

import { LanguageSwitcher } from '../../header';
import { isActivePath, NAVIGATION_ITEMS } from '../../navigation';
import styles from './menu-drawer.module.scss';

function focusableElements(container: HTMLElement): HTMLElement[] {
  return [...container.getElementsByTagName('*')].filter(
    (element): element is HTMLElement => element instanceof HTMLElement && element.tabIndex >= 0
  );
}

function handleTab(event: KeyboardEvent, container: HTMLElement): void {
  if (event.key !== 'Tab') {
    return;
  }
  const focusable = focusableElements(container);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (!container.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
    return;
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

interface MenuDrawerProps {
  onClose: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MenuDrawer({ onClose, onToggleTheme, currentTheme }: MenuDrawerProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const themeLabel = currentTheme === 'light' ? t('theme.light') : t('theme.dark');
  const themeIcon = currentTheme === 'light' ? <SunIcon /> : <MoonIcon />;

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) {
      return;
    }
    closeRef.current?.focus();
    const listener = (event: KeyboardEvent): void => handleTab(event, drawer);
    drawer.addEventListener('keydown', listener);
    return () => drawer.removeEventListener('keydown', listener);
  }, []);

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
        id='mobile-menu'
        ref={drawerRef}
        className={styles.drawer}
        role='dialog'
        aria-modal='true'
        aria-labelledby='mobile-menu-title'
      >
        <Flex justify='between' align='center' mb='6'>
          <h2 id='mobile-menu-title' className={styles.title}>
            {t('mobileMenu.title')}
          </h2>
          <IconButton
            ref={closeRef}
            size='3'
            variant='ghost'
            color='gray'
            aria-label={t('mobileMenu.close')}
            onClick={onClose}
          >
            <Cross1Icon />
          </IconButton>
        </Flex>
        <VisuallyHidden>{t('mobileMenu.actions', { name: t('app.name') })}</VisuallyHidden>
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
              {t(item.labelKey)}
            </NavLink>
          ))}
          <Flex direction='column' className={styles.footer}>
            <LanguageSwitcher variant='row' />
            {onToggleTheme && (
              <Button
                variant='ghost'
                color='gray'
                className={styles.setting}
                onClick={onToggleTheme}
                title={t(currentTheme === 'light' ? 'theme.switchToDark' : 'theme.switchToLight')}
                aria-label={`${t('theme.title')}: ${themeLabel}`}
              >
                <Text as='span'>{t('theme.title')}</Text>
                <Flex align='center' gap='2' className={styles.settingValue}>
                  {themeIcon}
                  <Text as='span'>{themeLabel}</Text>
                </Flex>
              </Button>
            )}
          </Flex>
        </Flex>
      </section>
    </div>
  );
}
