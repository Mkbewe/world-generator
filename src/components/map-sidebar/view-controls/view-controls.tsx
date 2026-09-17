import { MagnifyingGlassIcon, MinusIcon, PlusIcon, ResetIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, IconButton, Text } from '@radix-ui/themes';

import styles from './view-controls.module.scss';

interface ViewControlsProps {
  /** Current zoom relative to the fitted view; 1 shows the whole map. */
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  /** Renders without its own card, for use inside a shared panel. */
  bare?: boolean;
}

export function ViewControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  bare = false,
}: ViewControlsProps) {
  const content = (
    <Flex direction='column' gap='3'>
      <Flex align='center' justify='between' gap='3'>
        <Flex align='center' gap='2' className={styles.title}>
          <MagnifyingGlassIcon width={20} height={20} />
          <Text size='3' weight='bold'>
            View
          </Text>
        </Flex>
        <Button
          size='1'
          variant='soft'
          color='gray'
          disabled={zoom <= 1}
          onClick={onReset}
          title='Show the whole map'
        >
          <ResetIcon />
          Reset
        </Button>
      </Flex>
      <Flex align='center' justify='between' gap='3'>
        <Flex align='center' gap='2'>
          <IconButton
            size='2'
            variant='soft'
            color='gray'
            aria-label='Zoom out'
            disabled={zoom <= 1}
            onClick={onZoomOut}
          >
            <MinusIcon />
          </IconButton>
          <Text size='2' weight='medium' className={styles.zoom}>
            {zoom.toFixed(1)}x
          </Text>
          <IconButton size='2' variant='soft' color='gray' aria-label='Zoom in' onClick={onZoomIn}>
            <PlusIcon />
          </IconButton>
        </Flex>
        <Text size='1' color='gray'>
          Scroll to zoom
        </Text>
      </Flex>
    </Flex>
  );

  if (bare) {
    return content;
  }

  return (
    <Card size='1' variant='surface' className={styles.view}>
      {content}
    </Card>
  );
}
