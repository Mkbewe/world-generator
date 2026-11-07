import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Crosshair2Icon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import styles from './not-found-page.module.scss';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Flex align='center' justify='center' className={styles.root}>
      <Card size={{ initial: '3', sm: '4' }} className={styles.card}>
        <Flex direction='column' align='center' gap='5' py='5'>
          <Crosshair2Icon className={styles.icon} aria-hidden />
          <Text size='8' color='violet' weight='bold'>
            {t('notFoundPage.code')}
          </Text>
          <Heading size='6' align='center'>
            {t('notFoundPage.title')}
          </Heading>
          <Text size='3' color='gray' align='center'>
            {t('notFoundPage.description')}
          </Text>
          <Button asChild>
            <Link to='/'>{t('notFoundPage.back')}</Link>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
