import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import type { GeologicalRegionType } from '../../../../../utils/map-generator/types';
import { geologyRegionColor } from '../../../../../utils/map-layers';
import { type BoundaryDraft, DistributionBar } from '../../../../distribution-bar';
import type { DistributionSegment } from '../../../../lib/distribution-segment';
import { GEOLOGY_SHARE_COPY } from '../../lib/share-copy';
import { regionTypeOption } from '../lib/region-options';

interface RegionDistributionProps {
  segments: readonly DistributionSegment[];
  draft: BoundaryDraft;
  minShare: number;
  types: readonly GeologicalRegionType[];
}

/** Direct area editor for geology regions. */
export function RegionDistribution({
  segments,
  draft,
  minShare,
  types,
}: RegionDistributionProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Flex direction='column' gap='2'>
      <div role='group' aria-label={t('forms.geology.areaAria')}>
        <DistributionBar
          segments={segments}
          draft={draft}
          minShare={minShare}
          ariaLabel={t('forms.geology.areaDistributionAria')}
          header={{
            label: t(GEOLOGY_SHARE_COPY.labelKey),
            description: t(GEOLOGY_SHARE_COPY.descriptionKey),
          }}
          colorForIndex={index => geologyRegionColor(types[index], index)}
          labelForIndex={index =>
            t('forms.geology.regionShareLabel', {
              index: index + 1,
              type: t(regionTypeOption(types[index]).labelKey),
              percent: Math.round(draft.shares[index] ?? 0),
            })
          }
        />
      </div>
      <Text size='1' color='gray'>
        {t('forms.geology.areaHint')}
      </Text>
    </Flex>
  );
}
