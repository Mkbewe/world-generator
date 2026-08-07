import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import pkg from './package.json';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Make shared variables/mixins available in every .scss file without an
        // explicit @use. loadPaths lets partials be referenced by bare name
        // regardless of the importing file's depth.
        loadPaths: [fileURLToPath(new URL('./src/styles', import.meta.url))],
        additionalData: '@use "variables" as *;\n@use "mixins" as *;\n',
      },
    },
  },
});
