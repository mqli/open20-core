// @ts-check
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off', // TypeScript handles this
    },
  },
  // Test file specific rules
  {
    files: ['**/*.test.ts'],
    rules: {
      // Disable no-explicit-any for test files (tests use any for flexibility)
      '@typescript-eslint/no-explicit-any': 'off',
      // Restrict createRequire in test files (vitest supports ESM JSON imports natively)
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['node:module'],
          message: 'Use ESM imports instead of createRequire for JSON imports in vitest.',
        }],
      }],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
