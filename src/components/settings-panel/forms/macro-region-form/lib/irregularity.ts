export const MAX_IRREGULARITY = 0.3;

export function irregularityLabel(value: number): string {
  if (value === 0) {
    return 'None';
  }
  if (value <= 0.1) {
    return 'Small';
  }
  if (value <= 0.2) {
    return 'Medium';
  }
  return 'Large';
}
