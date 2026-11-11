import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import { type BoundaryDraft } from './hooks/use-boundary-draft';
import { BoundaryHandle } from './boundary-handle';
import { regionColor } from '../../utils/map-layers';
import { InfoLabel } from '../info-label';
import { colorString } from '../lib/color';
import type { DistributionSegment } from '../lib/distribution-segment';
import styles from './distribution-bar.module.scss';

interface DistributionBarProps {
  segments: readonly DistributionSegment[];
  draft: BoundaryDraft;
  /** Smallest share one side may keep, in percent of the whole bar. */
  minShare?: number;
  /** Accessible name for the grouping container; sets role='group'. */
  groupAriaLabel?: string;
  /** What the shares mean, e.g. ring thickness along the radius. */
  header?: { readonly label: string; readonly description: string };
}

export function DistributionBar({
  segments,
  draft,
  minShare,
  groupAriaLabel,
  header,
}: DistributionBarProps) {
  const { t } = useTranslation();

  return (
    <Flex
      direction='column'
      gap='2'
      role={groupAriaLabel ? 'group' : undefined}
      aria-label={groupAriaLabel}
    >
      {header && <InfoLabel label={header.label} description={header.description} />}
      <div className={styles.distribution}>
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className={styles.distributionSegment}
            style={{
              backgroundColor: colorString(segment.color ?? regionColor(index)),
              width: `${draft.shares[index]}%`,
            }}
          >
            {Math.round(draft.shares[index])}%
          </div>
        ))}
        {draft.boundaries.map((boundary, index) => (
          <BoundaryHandle
            key={segments[index].id}
            boundary={boundary}
            index={index}
            minShare={minShare}
            onMove={draft.preview}
            onStep={draft.step}
            onCommit={draft.commit}
            onCancel={draft.cancel}
          />
        ))}
      </div>
      {draft.boundaries.length > 0 && (
        <Text size='1' color='gray'>
          {t('forms.distribution.hint')}
        </Text>
      )}
    </Flex>
  );
}
