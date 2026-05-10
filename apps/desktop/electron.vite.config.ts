import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/main.ts')
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@thesis-investing/core': resolve(__dirname, '../../packages/core/src'),
        '@thesis-investing/ui': resolve(__dirname, '../../packages/ui/src')
      }
    },
    plugins: [react()]
  }
});
