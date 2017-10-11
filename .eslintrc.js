var path = require('path');

module.exports = {
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  globals: {
    __version: true,
    __coreAPISpec: true,
    __filename: true,
    __publicPath: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:vue/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  plugins: ['import', 'vue'],
  settings: {
    'import/resolver': {
      [path.resolve('./frontend_build/src/alias_import_resolver.js')]: {
        extensions: ['.js', '.vue'],
      },
    },
  },
  rules: {
    'vue/v-bind-style': 2,
    'vue/v-on-style': 2,
    'vue/html-quotes': [2, 'double'],
    'vue/order-in-components': 2,
    'comma-style': 2,
  },
};
