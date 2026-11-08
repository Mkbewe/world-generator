import { defineRasterReadout } from '../contracts';
import { formatMeters } from '../format/readout-format';

/** Height under the pointer relative to the sea level; 0 is the waterline. */
export const heightmapReadout = defineRasterReadout(
  'heightmap',
  () => true,
  (_payload, inspection) => {
    const height = inspection.value;
    if (height === undefined) {
      return undefined;
    }
    return [
      {
        id: 'surface',
        labelKey: 'readout.surface',
        value: { key: height > 0 ? 'readout.land' : 'readout.water' },
      },
      { id: 'height', labelKey: 'readout.height', value: `${formatMeters(height)} m` },
    ];
  }
);
