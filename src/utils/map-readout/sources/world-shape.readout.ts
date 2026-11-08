import { defineRasterReadout } from '../contracts';

/** Whether the pointer cell lies inside the world shape. */
export const worldShapeReadout = defineRasterReadout(
  'world-shape',
  () => true,
  (_payload, inspection) => {
    if (inspection.value === undefined) {
      return undefined;
    }
    return [
      {
        id: 'value',
        labelKey: 'readout.value',
        value: { key: inspection.value === 1 ? 'readout.inside' : 'readout.outside' },
      },
    ];
  }
);
