const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  // Ignore patterns
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**'],
  },

  // Core + Expo config via FlatCompat
  ...compat.extends('expo'),

  // Prettier (disable conflicting rules)
  ...compat.extends('prettier'),

  // Custom rules
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
