import { Flex, Text } from '@radix-ui/themes';

import { appConfig } from '../../config';
import { PageSection } from '../page-section';
import styles from './footer.module.scss';

export interface FooterProps {
  /** Removes the footer from the tab order while the fullscreen overlay is open. */
  inert?: boolean;
}

export function Footer({ inert = false }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer} inert={inert || undefined}>
      <PageSection as='div' background='subtle' border='top' p='medium'>
        <Flex direction='column' align='center' gap='2'>
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
      </PageSection>
    </footer>
  );
}
