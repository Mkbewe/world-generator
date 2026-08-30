import { Link, useRouteError } from 'react-router';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import styles from '../not-found/not-found-page.module.scss';

export function ErrorPage() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : undefined;

  return (
    <Flex align='center' justify='center' className={styles.root}>
      <Card size={{ initial: '3', sm: '4' }} className={styles.card}>
        <Flex direction='column' align='center' gap='5' py='5'>
          <ExclamationTriangleIcon className={styles.icon} aria-hidden />
          <Text size='8' color='violet' weight='bold'>
            Error 500
          </Text>
          <Heading size='6' align='center'>
            The world generator ran aground
          </Heading>
          <Text size='3' color='gray' align='center'>
            An unexpected current wrecked this page. You can try sailing again or head back to
            charted waters.
          </Text>
          {message && (
            <Text size='2' color='gray' align='center'>
              {message}
            </Text>
          )}
          <Button asChild>
            <Link to='/'>Back to home</Link>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
