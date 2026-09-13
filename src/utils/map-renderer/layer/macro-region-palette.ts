const REGION_COLORS: readonly (readonly [number, number, number])[] = [
  [46, 125, 50],
  [124, 179, 66],
  [253, 216, 53],
  [229, 57, 53],
  [142, 36, 170],
  [30, 136, 229],
  [255, 112, 67],
  [0, 137, 123],
];

const UNKNOWN_COLOR = [120, 120, 120] as const;

export function regionColor(index: number): readonly [number, number, number] {
  return REGION_COLORS[index % REGION_COLORS.length] ?? UNKNOWN_COLOR;
}
