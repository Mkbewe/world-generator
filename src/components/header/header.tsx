import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { EnterFullScreenIcon, ExitFullScreenIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Avatar, Badge, Flex, Heading, IconButton } from '@radix-ui/themes';

import { useHeaderActions } from './header-actions-context';
import { MobileMenu } from '../mobile-menu';
import { PageSection } from '../page-section';
import styles from './header.module.scss';

interface HeaderProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function Header({ onToggleTheme, currentTheme }: HeaderProps) {
  const { canFullscreen, isFullscreen, setIsFullscreen } = useHeaderActions();
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
            <Link to='/' className={styles.logoLink} aria-label='World Generator home'>
              <Avatar
                src='/favicon.svg'
                alt='World Generator Logo'
                size='3'
                radius='full'
                fallback='WG'
              />
              <Heading size='6' weight='bold' truncate className={styles.title}>
                World Generator
              </Heading>
            </Link>
            {isFullscreen && (
              <Badge variant='soft' color='gray' size='2'>
                Fullscreen
              </Badge>
            )}
          </Flex>
          <Flex gap='4' align='center' display={{ initial: 'none', sm: 'flex' }}>
            {canFullscreen && (
              <Flex align='center' gap='2'>
                <IconButton
                  ref={fullscreenTriggerRef}
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  size='3'
                  color='gray'
                  variant='surface'
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <ExitFullScreenIcon /> : <EnterFullScreenIcon />}
                </IconButton>
                {isFullscreen && (
                  <Badge variant='outline' color='gray' size='3'>
                    Esc
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
                title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
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
