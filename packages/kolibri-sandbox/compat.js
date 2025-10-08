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
