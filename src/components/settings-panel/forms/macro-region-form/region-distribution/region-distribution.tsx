import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import { type BoundaryDraft, DistributionBar } from '../../../../distribution-bar';
import type { DistributionSegment } from '../../../../lib/distribution-segment';
import type { ShareCopy } from '../../lib/share-copy';
import { MIN_MACRO_REGION_SHARE } from '../lib/boundary-model';

interface RegionDistributionProps {
  segments: readonly DistributionSegment[];
  draft: BoundaryDraft;
  /** Name and explanation of the share, e.g. ring thickness along the radius. */
  header: ShareCopy;
}

export function RegionDistribution({ segments, draft, header }: RegionDistributionProps) {
  const { t } = useTranslation();

  return (
    <Flex direction='column' gap='2'>
      <div role='group' aria-label={t('forms.macroRegion.regionBoundariesAria')}>
        <DistributionBar
          segments={segments}
          draft={draft}
          minShare={MIN_MACRO_REGION_SHARE}
          header={{
            label: t(header.labelKey),
            description: t(header.descriptionKey),
          }}
        />
      </div>
      <Text size='1' color='gray'>
        {t('forms.macroRegion.distributionHint')}
      </Text>
    </Flex>
  );
}
