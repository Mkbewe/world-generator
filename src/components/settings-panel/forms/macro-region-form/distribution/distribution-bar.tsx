import { BoundaryHandle } from './boundary-handle';
import type { MacroRegionSegment } from '../../../../../utils/map-generator/stages/macro-region-sizes';
import { regionColor } from '../../../../../utils/map-layers';
import { colorString } from '../color';
import styles from '../macro-region-form.module.scss';

interface DistributionBarProps {
  segments: readonly MacroRegionSegment[];
  boundaries: readonly number[];
  onMove: (index: number, percent: number) => void;
}

export function DistributionBar({ segments, boundaries, onMove }: DistributionBarProps) {
  return (
    <div className={styles.distribution} aria-label='Region width distribution'>
      {segments.map((segment, index) => (
        <div
          key={segment.id}
          className={styles.distributionSegment}
          style={{
            backgroundColor: colorString(regionColor(index)),
            width: `${segment.percent}%`,
          }}
        >
          {Math.round(segment.percent)}%
        </div>
      ))}
      {boundaries.map((boundary, index) => (
        <BoundaryHandle
          key={segments[index].id}
          boundary={boundary}
          index={index}
          onMove={onMove}
        />
      ))}
    </div>
  );
}
