import { Link } from 'react-router';
import { Crosshair2Icon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

import styles from './not-found-page.module.scss';

export function NotFoundPage() {
  return (
    <Flex align='center' justify='center' className={styles.root}>
      <Card size={{ initial: '3', sm: '4' }} className={styles.card}>
        <Flex direction='column' align='center' gap='5' py='5'>
          <Crosshair2Icon className={styles.icon} aria-hidden />
          <Text size='8' color='violet' weight='bold'>
            Error 404
          </Text>
          <Heading size='6' align='center'>
            This island hasn&apos;t been generated yet
          </Heading>
          <Text size='3' color='gray' align='center'>
            The page you are looking for drifted beyond the world border or never made it into this
            seed.
          </Text>
          <Button asChild>
            <Link to='/'>Back to home</Link>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
