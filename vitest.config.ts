import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import pkg from './package.json' with { type: 'json' };

const alias = { '@': path.resolve(import.meta.dirname, './src') };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __IS_TAURI_BUILD__: 'false',
    __IS_ANDROID_BUILD__: 'false',
    __TAURI_PLATFORM__: '"web"',
    __APP_COMMIT__: '"test"',
    __APP_BUILD_DATE__: '"1970-01-01"',
  },
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'app',
          include: ['src/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          // jsdom binds localStorage to the document origin; the default
          // `about:blank` returns a stripped Storage shim. A proper http URL
          // gives the full API.
          environmentOptions: {
            jsdom: {
              url: 'http://localhost/',
            },
          },
          setupFiles: ['./src/test/setup.ts'],
          css: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'worker',
          include: ['worker/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
    // Vitest 5 clears mocks between tests by default; keep that explicit.
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}', 'worker/**/*.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'worker/**/*.test.ts',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/components/ui/**',
      ],
    },
  },
});
