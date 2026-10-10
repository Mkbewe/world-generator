import { Flex } from '@radix-ui/themes';

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
  colorForIndex?: (index: number) => readonly [number, number, number];
  labelForIndex?: (index: number) => string;
  ariaLabel?: string;
  /** What the shares mean, e.g. ring thickness along the radius. */
  header?: { readonly label: string; readonly description: string };
}

export function DistributionBar({
  segments,
  draft,
  minShare,
  colorForIndex,
  labelForIndex,
  ariaLabel = 'Region width distribution',
  header,
}: DistributionBarProps) {
  return (
    <Flex direction='column' gap='2'>
      {header && <InfoLabel label={header.label} description={header.description} />}
      <div className={styles.distribution} aria-label={ariaLabel}>
        {segments.map((segment, index) => (
          <div
            key={segment.id}
            className={styles.distributionSegment}
            title={labelForIndex?.(index)}
            aria-label={labelForIndex?.(index)}
            style={{
              backgroundColor: colorString(colorForIndex?.(index) ?? regionColor(index)),
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
    </Flex>
  );
}
