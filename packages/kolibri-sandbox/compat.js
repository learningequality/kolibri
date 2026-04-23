/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
// Eslint configuration to check browser compatibility
module.exports = {
  env: {
    browser: true,
  },
  plugins: ['compat'],
  rules: {
    'compat/compat': 'error',
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
    ],
  },
};
