import { Flex, Slider, Text } from '@radix-ui/themes';

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

  return (
    <Flex direction='column' gap='2'>
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
      </div>
      {boundaries.length > 0 && (
        <Slider
          value={boundaries}
          min={MIN_MACRO_REGION_SHARE}
          max={100 - MIN_MACRO_REGION_SHARE}
          step={1}
          minStepsBetweenThumbs={MIN_MACRO_REGION_SHARE}
          aria-label='Region boundaries'
          onValueChange={setRegionBoundaries}
        />
      )}
      <Text size='1' color='gray'>
        Drag a boundary to resize the two neighbouring regions.
      </Text>
    </Flex>
  );
}
