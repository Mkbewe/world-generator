import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const name = t('app.name');

  return (
    <footer className={styles.footer} inert={inert || undefined}>
      <PageSection as='div' background='subtle' border='top' p='medium'>
        <Flex direction='column' align='center' gap='2'>
          <Text size='2' weight='medium'>
            {t('footer.version', { name, version: appConfig.version })}
          </Text>
          <Text size='1' color='gray'>
            {t('app.description')}
          </Text>
          <Text size='1' color='gray'>
            {t('footer.copyright', { year: currentYear, name })}
          </Text>
        </Flex>
      </PageSection>
    </footer>
  );
}
