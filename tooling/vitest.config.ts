import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: [fileURLToPath(new URL('../src/test-setup.ts', import.meta.url))],
      execArgv: ['--no-experimental-webstorage'],
      // Property tests over wide seed pools need more than the 5 s default,
      // especially on CI; individual heavy tests may raise it further.
      testTimeout: 20000,
    },
  })
);
