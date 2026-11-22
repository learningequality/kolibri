/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
const compat = require('eslint-plugin-compat');
const cutoffConfig = require('../../build_tools/eslint.cutoff.config');

module.exports = [
  ...cutoffConfig,
  {
    files: ['src/**/*.{js,mjs}'],
    plugins: { compat },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'compat/compat': 'error',
      'cutoff/no-excluded-web-api': ['error', 'sandbox'],
    },
    settings: {
      polyfills: [
        'Object.values',
        'Object.assign',
        'Object.entries',
        'array-includes',
        'Promise',
        'Set',
        'URL',
        'URLSearchParams',
        // MDN marks Firefox < 60 partial: document.body exists on HTMLDocument only.
        'document.body',
      ],
    },
  },
];
