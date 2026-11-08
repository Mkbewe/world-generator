import { formatPercent } from '../../format';
import { defineRasterReadout } from '../contracts';

/** Base moisture as a percentage of its 0..1 range. */
export const moistureReadout = defineRasterReadout(
  'moisture',
  () => true,
  (_payload, inspection) => {
    const value = inspection.value;
    if (value === undefined) {
      return undefined;
    }
    return [{ id: 'moisture', labelKey: 'readout.moisture', value: formatPercent(value) }];
  }
);
