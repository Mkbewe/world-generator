import { Link, NavLink } from 'react-router';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Avatar, Button, Flex, Heading, IconButton } from '@radix-ui/themes';

import { MobileMenu } from '../mobile-menu';
import { PageSection } from '../page-section';
import styles from './header.module.scss';

interface HeaderProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function Header({ onToggleTheme, currentTheme }: HeaderProps) {
  return (
    <PageSection as='header' background='subtle' border='bottom' p='small'>
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
        </Flex>

        <Flex gap='4' align='center' display={{ initial: 'none', sm: 'flex' }}>
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
          {onToggleTheme && (
            <IconButton
              onClick={onToggleTheme}
              size='3'
              variant='soft'
              title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
            >
              {currentTheme === 'light' ? <MoonIcon /> : <SunIcon />}
            </IconButton>
          )}
        </Flex>

        <MobileMenu onToggleTheme={onToggleTheme} currentTheme={currentTheme} />
      </Flex>
    </PageSection>
  );
}
