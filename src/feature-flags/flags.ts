export const FLAG_OPTIONS = {} as const;

export const FLAG_DEFAULTS = {
  exportPng: false,
} as const;

export type FlagName = keyof typeof FLAG_DEFAULTS;

export type Flags = {
  [K in FlagName]: K extends keyof typeof FLAG_OPTIONS ? (typeof FLAG_OPTIONS)[K][number] : boolean;
};
