import { defineVectorReadout } from '../contracts';
import { EMPTY, oceanCurrentText } from '../format/readout-format';

/** Readout of the BaseClimate current under the pointer. */
export const oceanCurrentReadout = defineVectorReadout(
  'ocean-currents',
  () => true,
  (_payload, inspection) => {
    const hit = inspection.hit;
    if (!hit) {
      return undefined;
    }
    return [
      {
        id: 'current',
        labelKey: 'readout.oceanCurrent',
        value: hit.oceanCurrent
          ? oceanCurrentText(hit.oceanCurrent.angle, hit.oceanCurrent.strength)
          : (hit.label ?? EMPTY),
      },
    ];
  }
);
