import type { MessageKey } from '../../../../../i18n';

export const MAX_IRREGULARITY = 0.2;

export function irregularityKey(value: number): MessageKey {
  if (value === 0) {
    return 'forms.irregularity.none';
  }
  if (value <= 0.1) {
    return 'forms.irregularity.small';
  }
  if (value <= 0.15) {
    return 'forms.irregularity.medium';
  }
  return 'forms.irregularity.large';
}
