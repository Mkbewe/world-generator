import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EnterFullScreenIcon, ExitFullScreenIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Avatar, Badge, Flex, Heading, IconButton } from '@radix-ui/themes';

import { useHeaderActions } from './header-actions-context';
import { LanguageSwitcher } from './language-switcher';
import { MobileMenu } from '../mobile-menu';
import { PageSection } from '../page-section';
import styles from './header.module.scss';

interface HeaderProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function Header({ onToggleTheme, currentTheme }: HeaderProps) {
  const { canFullscreen, isFullscreen, setIsFullscreen } = useHeaderActions();
  const { t } = useTranslation();
  const fullscreenTriggerRef = useRef<HTMLButtonElement>(null);
  const wasFullscreenRef = useRef(false);

  useEffect(() => {
    if (wasFullscreenRef.current && !isFullscreen) {
      fullscreenTriggerRef.current?.focus();
    }
    wasFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  return (
    <div className={styles.root} data-fullscreen={isFullscreen || undefined}>
      <PageSection
        as='header'
        background='subtle'
        border='bottom'
        fluid={isFullscreen}
        px={isFullscreen ? 'compact' : 'default'}
        p={isFullscreen ? 'compact' : 'small'}
      >
        <Flex justify='between' align='center' className={styles.headerContent}>
          <Flex align='center' gap='4' minWidth='0'>
            <Link
              to='/'
              className={styles.logoLink}
              aria-label={t('header.home', { name: t('app.name') })}
            >
              <Avatar
                src='/favicon.svg'
                alt={t('header.logoAlt', { name: t('app.name') })}
                size='3'
                radius='full'
                fallback='WG'
              />
              <Heading size='6' weight='bold' truncate className={styles.title}>
                {t('app.name')}
              </Heading>
            </Link>
            {isFullscreen && (
              <Badge variant='soft' color='gray' size='2'>
                {t('header.fullscreen')}
              </Badge>
            )}
          </Flex>
          <Flex gap='4' align='center' display={{ initial: 'none', sm: 'flex' }}>
            <LanguageSwitcher />
            {canFullscreen && (
              <Flex align='center' gap='2'>
                <IconButton
                  ref={fullscreenTriggerRef}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  size='3'
                  color='gray'
                  variant='surface'
                  title={t(isFullscreen ? 'header.exitFullscreen' : 'header.enterFullscreen')}
                  aria-label={t(isFullscreen ? 'header.exitFullscreen' : 'header.enterFullscreen')}
                >
                  {isFullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
                </IconButton>
                {isFullscreen && (
                  <Badge variant='outline' color='gray' size='3'>
                    {t('header.esc')}
                  </Badge>
                )}
              </Flex>
            )}
            {onToggleTheme && (
              <IconButton
                onClick={onToggleTheme}
                size='3'
                variant='surface'
                color='gray'
                title={t(currentTheme === 'light' ? 'theme.switchToDark' : 'theme.switchToLight')}
                aria-label={t(
                  currentTheme === 'light' ? 'theme.switchToDark' : 'theme.switchToLight'
                )}
              >
                {currentTheme === 'light' ? <MoonIcon /> : <SunIcon />}
              </IconButton>
            )}
          </Flex>

          <MobileMenu onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
        </Flex>
      </PageSection>
    </div>
  );
}
