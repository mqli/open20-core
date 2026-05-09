import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/browser-artifact/**/*.test.ts'],
    exclude: ['node_modules', 'src'],
    environment: 'jsdom',
    name: 'artifact-browser',
    setupFiles: ['./tests/browser-artifact/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'dist'),
    },
  },
});
