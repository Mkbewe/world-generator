import type { MacroRegionSegment } from '../../../../../../utils/map-generator/stages/macro-region/editor/boundary-model';
import { regionColor } from '../../../../../../utils/map-layers';
import type { BoundaryDraft } from '../../hooks/use-boundary-draft';
import { colorString } from '../../lib/color';
import { BoundaryHandle } from '../boundary-handle';
import styles from './distribution-bar.module.scss';

interface DistributionBarProps {
  segments: readonly MacroRegionSegment[];
  draft: BoundaryDraft;
}

export function DistributionBar({ segments, draft }: DistributionBarProps) {
  return (
    <div className={styles.distribution} aria-label='Region width distribution'>
      {segments.map((segment, index) => (
        <div
          key={segment.id}
          className={styles.distributionSegment}
          style={{
            backgroundColor: colorString(regionColor(index)),
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
          onMove={draft.preview}
          onStep={draft.step}
          onCommit={draft.commit}
          onCancel={draft.cancel}
        />
      ))}
    </div>
  );
}
