import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import { Cross1Icon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Button, Flex, IconButton, Text, VisuallyHidden } from '@radix-ui/themes';

import { LanguageSwitcher } from '../../header';
import { isActivePath, NAVIGATION_ITEMS } from '../../navigation';
import styles from './menu-drawer.module.scss';

interface MenuDrawerProps {
  onClose: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function MenuDrawer({ onClose, onToggleTheme, currentTheme }: MenuDrawerProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const themeLabel = currentTheme === 'light' ? t('theme.light') : t('theme.dark');
  const themeIcon = currentTheme === 'light' ? <SunIcon /> : <MoonIcon />;

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
            {t('mobileMenu.title')}
          </h2>
          <IconButton
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
