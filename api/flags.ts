import { getAll } from '@vercel/global-config';

import { FLAG_DEFAULTS, type FlagName } from '../shared/feature-flags/flags.js';

const FLAG_NAMES = Object.keys(FLAG_DEFAULTS) as FlagName[];

export default {
  async fetch() {
    try {
      const flags = await getAll(FLAG_NAMES);
      return Response.json(flags, {
        headers: { 'cache-control': 'no-store' },
      });
    } catch (error) {
      console.warn('Failed to read feature flags from Global Config; using defaults.', error);

      return Response.json(FLAG_DEFAULTS, {
        headers: { 'cache-control': 'no-store' },
      });
    }
  },
};
