import { TrashIcon } from '@radix-ui/react-icons';
import { Box, Button, Card, Flex, RadioCards, Text, TextField } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import type { HeatZoneConfig } from '../../../../../utils/map-generator/types';
import { heatZoneColor } from '../../../../../utils/map-layers';
import { colorString } from '../../../../lib/color';
import { MoveControls } from '../../../../move-controls';
import { HEAT_ZONE_CLASS_OPTIONS } from '../lib/thermal-options';
import styles from './heat-zone-card.module.scss';

interface HeatZoneCardProps {
  zone: HeatZoneConfig;
  canRemove: boolean;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
}

export function HeatZoneCard({ zone, canRemove, canMoveEarlier, canMoveLater }: HeatZoneCardProps) {
  const updateZone = useBaseClimateFormStore(state => state.updateZone);
  const removeZone = useBaseClimateFormStore(state => state.removeZone);
  const moveZone = useBaseClimateFormStore(state => state.moveZone);
  const swatch = heatZoneColor(zone.thermal, zone.id);

  return (
    <Card size='1' variant='surface'>
      <Flex direction='column' gap='3'>
        <Flex gap='2' align='center'>
          <Box
            aria-hidden
            className={styles.swatch}
            style={{ backgroundColor: colorString(swatch) }}
          />
          <TextField.Root
            value={zone.label}
            aria-label='Zone label'
            className={styles.name}
            onChange={event => updateZone(zone.id, { label: event.target.value })}
          />
          <Button
            size='1'
            variant='soft'
            color='red'
            aria-label={`Remove ${zone.label}`}
            disabled={!canRemove}
            onClick={() => removeZone(zone.id)}
          >
            <TrashIcon />
          </Button>
        </Flex>
        <RadioCards.Root
          columns='3'
          gap='2'
          size='1'
          aria-label='Thermal class'
          value={zone.thermal}
          onValueChange={value => {
            const option = HEAT_ZONE_CLASS_OPTIONS.find(item => item.id === value);
            if (option) {
              updateZone(zone.id, { thermal: option.id });
            }
          }}
        >
          {HEAT_ZONE_CLASS_OPTIONS.map(option => (
            <RadioCards.Item key={option.id} value={option.id}>
              {option.label}
            </RadioCards.Item>
          ))}
        </RadioCards.Root>
        <Flex justify='between' align='center'>
          <Text size='1' color='gray'>
            {geometrySummary(zone)}
          </Text>
          <MoveControls
            canMoveEarlier={canMoveEarlier}
            canMoveLater={canMoveLater}
            onMoveEarlier={() => moveZone(zone.id, -1)}
            onMoveLater={() => moveZone(zone.id, 1)}
          />
        </Flex>
      </Flex>
    </Card>
  );
}

function geometrySummary(zone: HeatZoneConfig): string {
  if (zone.geometry.kind === 'ring') {
    return `Radius ${zone.geometry.innerRadius.toFixed(2)}–${zone.geometry.outerRadius.toFixed(2)}`;
  }
  return `Width ${Math.round(zone.geometry.width * 100)}% · centre ${Math.round(zone.geometry.center * 100)}%`;
}
