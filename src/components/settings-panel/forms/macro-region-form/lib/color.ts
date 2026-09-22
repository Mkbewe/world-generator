type Color = readonly [number, number, number];

const DANGER_RAMP: readonly { at: number; color: Color }[] = [
  { at: 0, color: [252, 245, 174] },
  { at: 0.25, color: [253, 174, 107] },
  { at: 0.5, color: [230, 85, 13] },
  { at: 0.75, color: [165, 15, 21] },
  { at: 1, color: [103, 0, 13] },
];

export function colorString(color: readonly [number, number, number]): string {
  return `rgb(${color[0]} ${color[1]} ${color[2]})`;
}

export function dangerColor(value: number): Color {
  const clamped = Math.min(1, Math.max(0, value));
  for (let index = 1; index < DANGER_RAMP.length; index++) {
    const to = DANGER_RAMP[index];
    if (clamped <= to.at) {
      return interpolate(DANGER_RAMP[index - 1], to, clamped);
    }
  }
  return DANGER_RAMP[DANGER_RAMP.length - 1].color;
}

function interpolate(
  from: (typeof DANGER_RAMP)[number],
  to: (typeof DANGER_RAMP)[number],
  value: number
): Color {
  const ratio = (value - from.at) / (to.at - from.at);
  return [
    Math.round(from.color[0] + (to.color[0] - from.color[0]) * ratio),
    Math.round(from.color[1] + (to.color[1] - from.color[1]) * ratio),
    Math.round(from.color[2] + (to.color[2] - from.color[2]) * ratio),
  ];
}
