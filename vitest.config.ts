import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test-setup.ts'],
      // Property tests over wide seed pools need more than the 5 s default,
      // especially on CI; individual heavy tests may raise it further.
      testTimeout: 20000,
    },
  })
);
