import { useTranslation } from 'react-i18next';
import { Link, useRouteError } from 'react-router';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import styles from '../not-found/not-found-page.module.scss';

export function ErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : undefined;

  return (
    <Flex align='center' justify='center' className={styles.root}>
      <Card size={{ initial: '3', sm: '4' }} className={styles.card}>
        <Flex direction='column' align='center' gap='5' py='5'>
          <ExclamationTriangleIcon className={styles.icon} aria-hidden />
          <Text size='8' color='violet' weight='bold'>
            {t('errorPage.code')}
          </Text>
          <Heading size='6' align='center'>
            {t('errorPage.title')}
          </Heading>
          <Text size='3' color='gray' align='center'>
            {t('errorPage.description')}
          </Text>
          {message && (
            <Text size='2' color='gray' align='center'>
              {message}
            </Text>
          )}
          <Button asChild>
            <Link to='/'>{t('errorPage.back')}</Link>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
