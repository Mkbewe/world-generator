import { useTranslation } from 'react-i18next';
import { MAX_HEAT_ZONES } from '@generator/stages/base-climate/defaults';
import { heatZoneColor } from '@layers';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Text } from '@radix-ui/themes';

import { useBaseClimateFormStore } from '../../../../../stores';
import {
  clampZoneBoundaries,
  MIN_HEAT_ZONE_SHARE,
  zoneBoundaries,
  zoneSegments,
} from '../../../../../stores/form/base-climate-form';
import { DistributionBar, useBoundaryDraft } from '../../../../distribution-bar';
import { type RegionTabItem, RegionTabs } from '../../../../region-tabs';
import { HeatZoneCard } from '../heat-zone-card';
import { useHeatZoneSelection } from '../hooks/use-heat-zone-selection';
import { heatZoneShareCopy } from '../lib/share-copy';
import { heatZoneClassKey } from '../lib/thermal-options';

export function HeatZoneSection() {
  const { t } = useTranslation();
  const zones = useBaseClimateFormStore(state => state.zones);
  const layout = useBaseClimateFormStore(state => state.layout);
  const ringExtent = useBaseClimateFormStore(state => state.ringExtent);
  const setZoneBoundaries = useBaseClimateFormStore(state => state.setZoneBoundaries);
  const addZone = useBaseClimateFormStore(state => state.addZone);
  const { zone, selectedIndex, selectZone } = useHeatZoneSelection(zones);
  const boundaries = zoneBoundaries(zones, layout, ringExtent);
  const segments = zoneSegments(zones, layout, ringExtent);
  const draft = useBoundaryDraft(
    boundaries,
    (current, index, value) =>
      clampZoneBoundaries(
        current.map((boundary, position) => (position === index ? value(boundary) : boundary)),
        zones.length
      ),
    setZoneBoundaries
  );
  const atLimit = zones.length >= MAX_HEAT_ZONES;
  const share = heatZoneShareCopy(layout);
  const tabItems: readonly RegionTabItem[] = zones.map(item => ({
    id: item.id,
    label: item.label,
    color: heatZoneColor(item.thermal, item.id),
  }));

  return (
    <Flex direction='column' gap='2'>
      <Flex justify='between' align='center'>
        <Text size='2' weight='bold' color='gray'>
          {t('forms.baseClimate.heatZones', { count: zones.length })}
        </Text>
        <Button size='1' variant='soft' onClick={addZone} disabled={atLimit}>
          <PlusIcon /> {t('forms.baseClimate.addZone')}
        </Button>
      </Flex>
      <div role='group' aria-label={t('forms.baseClimate.boundariesAria')}>
        <DistributionBar
          segments={segments}
          draft={draft}
          minShare={MIN_HEAT_ZONE_SHARE}
          ariaLabel={t('forms.baseClimate.distributionAria')}
          header={{
            label: t(share.labelKey),
            description: t(share.descriptionKey),
          }}
          colorForIndex={index =>
            heatZoneColor(zones[index]?.thermal ?? 'temperate', zones[index]?.id)
          }
          labelForIndex={index => {
            const item = zones[index];
            if (!item) {
              return '';
            }
            const share = Math.round(draft.shares[index] ?? 0);
            return `${item.label}: ${t(heatZoneClassKey(item.thermal))} (${share}%)`;
          }}
        />
      </div>
      <Text size='1' color='gray'>
        {t('forms.baseClimate.distributionHint')}
      </Text>
      <RegionTabs
        items={tabItems}
        selectedIndex={selectedIndex}
        onSelect={selectZone}
        ariaLabel={t('forms.baseClimate.heatZonesAria')}
      />
      {zone && (
        <HeatZoneCard
          zone={zone}
          canRemove={zones.length > 1}
          canMoveEarlier={selectedIndex > 0}
          canMoveLater={selectedIndex < zones.length - 1}
        />
      )}
    </Flex>
  );
}
