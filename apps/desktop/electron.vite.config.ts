import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'electron-vite';
import { developmentRendererCsp } from './src/tooling/rendererCsp';

const configDirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          main: resolve(configDirname, 'src/main/main.ts'),
          verifyStorageRuntime: resolve(
            configDirname,
            'src/main/verifyStorageRuntime.ts'
          ),
          verifyDesktopRuntime: resolve(configDirname, 'src/main/verifyDesktopRuntime.ts')
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: resolve(configDirname, 'src/preload/preload.ts'),
        output: {
          entryFileNames: '[name].cjs',
          format: 'cjs'
        }
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
    server: { host: '127.0.0.1' },
    plugins: [react(), developmentRendererCsp()]
  }
});
