import { formatPercent } from '../../format';
import { defineRasterReadout } from '../contracts';

/** Normalized temperature as a percentage of its 0..1 range. */
export const temperatureReadout = defineRasterReadout(
  'temperature',
  () => true,
  (_payload, inspection) => {
    const value = inspection.value;
    if (value === undefined) {
      return undefined;
    }
    return [{ id: 'temperature', labelKey: 'readout.temperature', value: formatPercent(value) }];
  }
);
