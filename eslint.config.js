const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // no-undef stays off for .ts/.tsx (see eslint-config-expo's typescript.js) but this file
    // is plain JS, and `jest` global setup files aren't matched by any *.test.* jest-aware
    // config — declare the global explicitly instead.
    files: ['jest.setup.js'],
    languageOptions: {
      globals: { jest: 'readonly' },
    },
  },
]);
