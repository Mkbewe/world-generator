import { Container, Flex, Text } from '@radix-ui/themes';

import styles from './footer.module.css';

const version = '0.0.5';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container size='4'>
        <Flex direction='column' align='center' gap='2'>
          <Text size='2' weight='medium'>
            World Generator v{version}
          </Text>
          <Text size='1' color='gray'>
            Create procedural island worlds
          </Text>
          <Text size='1' color='gray'>
            © {currentYear} World Generator
          </Text>
        </Flex>
      </Container>
    </footer>
  );
}
