import { DownloadIcon, MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Avatar, Button, Container, Flex, Heading, IconButton } from '@radix-ui/themes';

import styles from './header.module.scss';

interface HeaderProps {
  onExportMap?: () => void;
  onToggleTheme?: () => void;
  currentTheme?: 'light' | 'dark';
}

export function Header({ onExportMap, onToggleTheme, currentTheme }: HeaderProps) {
  return (
    <header className={styles.header}>
      <Container size='4' py='4'>
        <Flex
          justify='between'
          px={{ initial: '4', sm: '8' }}
          align='center'
          className={styles.headerContent}
        >
          <Flex align='center' gap='4'>
            <Avatar src='/favicon.svg' alt='World Generator Logo' size='3' fallback='WG' />
            <Heading size='6' weight='bold' className={styles.title}>
              World Generator
            </Heading>
          </Flex>

          <Flex gap='4' align='center'>
            {onExportMap && (
              <Button onClick={onExportMap} size='3' variant='solid'>
                <DownloadIcon />
                Export PNG
              </Button>
            )}
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
