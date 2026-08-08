// String flags list their allowed values here; boolean flags need no entry.
export const FLAG_OPTIONS = {
  mapStyle: ['realistic', 'fantasy', 'minimal'],
} as const;

export const FLAG_DEFAULTS = {
  test: false,
  mapStyle: 'realistic',
} as const;

export type FlagName = keyof typeof FLAG_DEFAULTS;

export type Flags = {
  test: boolean;
  mapStyle: (typeof FLAG_OPTIONS.mapStyle)[number];
};
