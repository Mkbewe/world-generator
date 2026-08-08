import { DownloadIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Avatar, Button, Container, Flex, Heading, IconButton } from '@radix-ui/themes';

import { useHeaderActions } from './header-actions-context';
import styles from './header.module.scss';

interface HeaderProps {
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function Header({ onToggleTheme, currentTheme }: HeaderProps) {
  const { exportMapRef } = useHeaderActions();

  return (
    <header className={styles.header}>
      <Container py='4'>
        <Flex
          justify='between'
          px={{ initial: '4', md: '8', sm: '6' }}
          align='center'
          className={styles.headerContent}
        >
          <Flex align='center' gap='4' minWidth='0'>
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
          </Flex>

          <Flex gap='4' align='center'>
            <Button onClick={() => exportMapRef.current?.()} size='3' variant='solid'>
              <DownloadIcon />
              Export PNG
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
        </Flex>
      </Container>
    </header>
  );
}
