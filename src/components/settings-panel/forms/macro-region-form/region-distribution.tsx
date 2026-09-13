import { useRef } from 'react';
import { Flex, Text } from '@radix-ui/themes';

import { colorString } from './color';
import { useMacroRegionFormStore } from '../../../../stores';
import {
  MIN_MACRO_REGION_SHARE,
  regionBoundaries,
  regionSegments,
} from '../../../../utils/map-generator/stages/macro-region-sizes';
import type { MacroRegionConfig } from '../../../../utils/map-generator/types';
import { regionColor } from '../../../../utils/map-renderer/layer/macro-region-palette';
import styles from './macro-region-form.module.scss';

export function RegionDistribution({ regions }: { regions: readonly MacroRegionConfig[] }) {
  const layout = useMacroRegionFormStore(state => state.layout);
  const setRegionBoundaries = useMacroRegionFormStore(state => state.setRegionBoundaries);
  const segments = regionSegments(layout, regions);
  const boundaries = regionBoundaries(layout, regions);

  const moveBoundary = (index: number, percent: number): void => {
    const next = [...boundaries];
    next[index] = Math.round(percent);
    setRegionBoundaries(next);
  };

  return (
    <Flex direction='column' gap='2'>
      <div role='group' aria-label='Region boundaries'>
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
            <DistributionHandle
              key={segments[index].id}
              boundary={boundary}
              index={index}
              onMove={moveBoundary}
            />
          ))}
        </div>
      </div>
      <Text size='1' color='gray'>
        Drag a boundary on the bar to resize the two neighbouring regions.
      </Text>
    </Flex>
  );
}

function DistributionHandle({
  boundary,
  index,
  onMove,
}: {
  boundary: number;
  index: number;
  onMove: (index: number, percent: number) => void;
}) {
  const handleRef = useRef<HTMLButtonElement>(null);

  const moveTo = (clientX: number): void => {
    const track = handleRef.current?.parentElement;
    if (!track) {
      return;
    }
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    onMove(index, ((clientX - rect.left) / rect.width) * 100);
  };

  return (
    <button
      ref={handleRef}
      type='button'
      role='slider'
      aria-label={`Boundary ${index + 1}`}
      aria-valuemin={MIN_MACRO_REGION_SHARE}
      aria-valuemax={100 - MIN_MACRO_REGION_SHARE}
      aria-valuenow={Math.round(boundary)}
      className={styles.distributionHandle}
      style={{ left: `${boundary}%` }}
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onMove(index, boundary - 1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onMove(index, boundary + 1);
        }
      }}
      onPointerDown={event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event.clientX);
      }}
      onPointerMove={event => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          moveTo(event.clientX);
        }
      }}
    />
  );
}
