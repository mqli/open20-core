import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/artifact/**/*.test.ts'],
    exclude: ['node_modules', 'src'],
    environment: 'node',
    name: 'artifact-node',
    // Import from dist/ instead of src/
    alias: {
      '@': path.resolve(__dirname, 'dist'),
    },
  },
  resolve: {
    conditions: ['node', 'import', 'default'],
  },
});
