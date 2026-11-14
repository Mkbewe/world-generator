import { useTranslation } from 'react-i18next';
import { MAX_VIEW_SCALE, MIN_VIEW_SCALE } from '@renderer';
import { MagnifyingGlassIcon, MinusIcon, PlusIcon, ResetIcon } from '@radix-ui/react-icons';
import { Button, Flex, IconButton, Text } from '@radix-ui/themes';

import styles from './view-controls.module.scss';

export interface ViewControlsProps {
  /** Current zoom relative to the fitted view; the default zoom shows the whole map. */
  zoom: number;
  /** Whether the view is the default fitted placement. */
  fitted: boolean;
  /** Zoom and reset belong to the fullscreen mode; they are hidden outside it. */
  zoomable?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export function ViewControls({
  zoom,
  fitted,
  zoomable = true,
  onZoomIn,
  onZoomOut,
  onReset,
}: ViewControlsProps) {
  const { t } = useTranslation();

  return (
    <Flex direction='column' gap='3'>
      <Flex align='center' justify='between' gap='3'>
        <Flex align='center' gap='2' className={styles.title}>
          <MagnifyingGlassIcon width={20} height={20} />
          <Text size='3' weight='bold'>
            {t('viewControls.title')}
          </Text>
        </Flex>
        {zoomable && (
          <Button
            size='1'
            variant='soft'
            color='gray'
            disabled={fitted}
            onClick={onReset}
            title={t('viewControls.showWholeMap')}
          >
            <ResetIcon />
            {t('viewControls.reset')}
          </Button>
        )}
      </Flex>
      {zoomable && (
        <Flex align='center' justify='between' gap='3'>
          <Flex align='center' gap='2'>
            <IconButton
              size='2'
              variant='soft'
              color='gray'
              aria-label={t('viewControls.zoomOut')}
              disabled={zoom <= MIN_VIEW_SCALE}
              onClick={onZoomOut}
            >
              <MinusIcon />
            </IconButton>
            <Text size='2' weight='medium' className={styles.zoom}>
              {zoom.toFixed(1)}x
            </Text>
            <IconButton
              size='2'
              variant='soft'
              color='gray'
              aria-label={t('viewControls.zoomIn')}
              disabled={zoom >= MAX_VIEW_SCALE}
              onClick={onZoomIn}
            >
              <PlusIcon />
            </IconButton>
          </Flex>
          <Text size='1' color='gray'>
            {t('viewControls.scrollToZoom')}
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
