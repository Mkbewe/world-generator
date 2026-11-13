import { useTranslation } from 'react-i18next';
import { LayersIcon } from '@radix-ui/react-icons';
import { Flex, Switch, Text } from '@radix-ui/themes';
import type { MapOverlayId, MapRendererState } from '@renderer';

import styles from './overlay-controls.module.scss';

export interface OverlayControlsProps {
  preview: MapRendererState;
  onOverlayChange: (id: MapOverlayId, visible: boolean) => void;
}

export function OverlayControls({ preview, onOverlayChange }: OverlayControlsProps) {
  const { t } = useTranslation();

  return (
    <Flex direction='column' gap='3'>
      <Flex align='center' gap='2' className={styles.title}>
        <LayersIcon width={20} height={20} />
        <Text size='3' weight='bold'>
          {t('overlays.title')}
        </Text>
      </Flex>
      {preview.overlays.map(overlay => {
        const inactive = !overlay.available || overlay.disabled;
        return (
          <Flex key={overlay.id} justify='between' align='center' gap='3'>
            <Text size='2' color={inactive ? 'gray' : undefined}>
              {t(overlay.labelKey)}
            </Text>
            <Switch
              checked={overlay.visible}
              disabled={inactive}
              title={overlay.disabled ? t('overlays.visibleOnOtherLayers') : undefined}
              onCheckedChange={visible => onOverlayChange(overlay.id, visible)}
              aria-label={t(overlay.labelKey)}
            />
          </Flex>
        );
      })}
    </Flex>
  );
}
