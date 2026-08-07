import { Container, Flex, Text } from '@radix-ui/themes';

import { appConfig } from '../../config';
import styles from './footer.module.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container size='4' py='6'>
        <Flex direction='column' px={{ initial: '4', sm: '8' }} align='center' gap='2'>
          <Text size='2' weight='medium'>
            {appConfig.name} v{appConfig.version}
          </Text>
          <Text size='1' color='gray'>
            {appConfig.description}
          </Text>
          <Text size='1' color='gray'>
            © {currentYear} {appConfig.name}
          </Text>
        </Flex>
      </Container>
    </footer>
  );
}
