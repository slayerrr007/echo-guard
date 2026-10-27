import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { handleSonarApiRequest } from './src/server/sonarBackend';

const sonarApiPlugin = (): Plugin => ({
  name: 'sonar-api-plugin',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      try {
        const handled = await handleSonarApiRequest(req, res);
        if (!handled) {
          next();
        }
      } catch (err) {
        console.error('Error handling API request:', err);
        next();
      }
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), sonarApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

