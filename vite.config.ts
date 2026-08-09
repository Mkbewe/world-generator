import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

import pkg from './package.json';

// Dev-only stand-in for the Vercel `api/flags` function: `vite dev` does not run
// serverless functions, so we serve feature-flag values from a gitignored
// `flags.local.json`. Edit that file and refresh — no dev-server restart needed.
// Missing/invalid file => empty response => the client falls back to FLAG_DEFAULTS.
function localFlags(): Plugin {
  const flagsPath = fileURLToPath(new URL('./flags.local.json', import.meta.url));

  return {
    name: 'local-flags',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/flags', (_req, res) => {
        let body = '{}';
        try {
          body = readFileSync(flagsPath, 'utf-8');
        } catch {
          // No local flags file — fall back to defaults on the client.
        }
        res.setHeader('content-type', 'application/json');
        res.setHeader('cache-control', 'no-store');
        res.end(body);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localFlags()],
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
