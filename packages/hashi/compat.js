// Eslint configuration to check browser compatibility
module.exports = {
  // ...
  env: {
    browser: true,
  },
  plugins: ['compat'],
  rules: {
    'compat/compat': 'error',
  },
  settings: {
    browsers: ['last 2 versions', 'ie >= 11', 'ios >= 9.3', 'Firefox ESR'],
    polyfills: ['Object.values', 'Object.assign', 'Object.entries', 'array-includes'],
  },
};
