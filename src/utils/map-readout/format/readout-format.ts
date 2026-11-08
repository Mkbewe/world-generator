import type { MessageKey } from '../../../i18n';
import { formatMeasure } from '../../format';
import type { TranslatedText } from '../contracts';

export const EMPTY = '—';

const DIRECTION_KEYS: readonly MessageKey[] = [
  'directions.east',
  'directions.southeast',
  'directions.south',
  'directions.southwest',
  'directions.west',
  'directions.northwest',
  'directions.north',
  'directions.northeast',
];

export function oceanCurrentText(angle: number, strength: number): TranslatedText {
  if (strength < 0.01) {
    return { key: 'readout.calm' };
  }
  const turn = Math.round(angle / (Math.PI / 4)) % DIRECTION_KEYS.length;
  const directionKey = DIRECTION_KEYS[(turn + DIRECTION_KEYS.length) % DIRECTION_KEYS.length];
  if (directionKey === undefined) {
    throw new RangeError(`Ocean-current angle is out of range: ${angle}.`);
  }
  return {
    key: 'readout.oceanCurrentValue',
    params: { strength: Math.round(strength * 100), direction: { key: directionKey } },
  };
}

/** Number with at most one decimal, e.g. "25" or "18.7". */
export function percent(value: number): string {
  return formatMeasure(value, 1);
}

export function formatMeters(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
