import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import pkg from '../package.json' with { type: 'json' };

// https://vite.dev/config/
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@generator',
        replacement: fileURLToPath(new URL('../src/utils/map-generator', import.meta.url)),
      },
      {
        find: '@layers',
        replacement: fileURLToPath(new URL('../src/utils/map-layers', import.meta.url)),
      },
      {
        find: '@readout',
        replacement: fileURLToPath(new URL('../src/utils/map-readout', import.meta.url)),
      },
      {
        find: '@renderer',
        replacement: fileURLToPath(new URL('../src/utils/map-renderer', import.meta.url)),
      },
    ],
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Make shared variables/mixins available in every .scss file without an
        // explicit @use. loadPaths lets partials be referenced by bare name
        // regardless of the importing file's depth.
        loadPaths: [fileURLToPath(new URL('../src/styles', import.meta.url))],
        additionalData: '@use "variables" as *;\n@use "mixins" as *;\n',
      },
    },
  },
});
