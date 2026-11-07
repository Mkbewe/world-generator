import { useTranslation } from 'react-i18next';
import { Flex, Text } from '@radix-ui/themes';

import { formatBytes } from '../../../../../utils/format';
import { summarizeWorldGrid } from '../../../../../utils/world-grid';

interface GridSummaryFieldProps {
  sizeMeters: number;
  metersPerSample: number;
}

/** Shows the derived sample grid and the estimated memory before generating. */
export function GridSummaryField({ sizeMeters, metersPerSample }: GridSummaryFieldProps) {
  const { t } = useTranslation();
  const grid = summarizeWorldGrid(sizeMeters, metersPerSample);
  const effective = grid.metersPerSample;
  const effectiveLabel = effective >= 1 ? effective.toFixed(0) : effective.toFixed(1);

  return (
    <Flex direction='column' gap='1'>
      <Text size='1' color='gray'>
        {t('forms.worldShape.gridSummary', {
          width: grid.dimensions.sampleWidth,
          height: grid.dimensions.sampleHeight,
          memory: formatBytes(grid.memoryBytes),
          detail: effectiveLabel,
        })}
      </Text>
      {grid.clamped && (
        <Text size='1' color='orange'>
          {t('forms.worldShape.gridClamped', {
            requested: metersPerSample,
            effective: effectiveLabel,
          })}
        </Text>
      )}
    </Flex>
  );
}
