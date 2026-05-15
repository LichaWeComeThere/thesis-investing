import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'electron-vite';

const configDirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(configDirname, 'src/main/main.ts')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(configDirname, 'src/preload/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(configDirname, 'src/renderer'),
    resolve: {
      alias: {
        '@thesis-investing/core': resolve(configDirname, '../../packages/core/src'),
        '@thesis-investing/ui': resolve(configDirname, '../../packages/ui/src')
      }
    },
    plugins: [react()]
  }
});
