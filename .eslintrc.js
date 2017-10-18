var path = require('path');

module.exports = {
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 7,
    ecmaFeatures: {
      impliedStrict: true,
      experimentalObjectRestSpread: true,
    },
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
      [path.resolve(
        path.join(path.dirname(__filename), './frontend_build/src/alias_import_resolver.js')
      )]: {
        extensions: ['.js', '.vue'],
      },
    },
  },
  rules: {
    'comma-style': 2,

    'vue/no-dupe-keys': 2,
    'vue/no-reserved-keys': 2,
    'vue/no-shared-component-data': 2,
    'vue/no-template-key': 2,
    'vue/require-valid-default-prop': 2,
    'vue/return-in-computed-property': 2,

    'vue/no-async-in-computed-properties': 2,
    'vue/no-duplicate-attributes': [
      2,
      {
        allowCoexistClass: true,
        allowCoexistStyle: false,
      },
    ],
    'vue/no-side-effects-in-computed-properties': 2,
    'vue/order-in-components': 2,
    // 'vue/require-default-prop': 2,
    // 'vue/require-prop-types': 2,
    'vue/this-in-template': [2, 'never'],

    'vue/attribute-hyphenation': [2, 'never'],
    // Coming soon
    /*
    'vue/html-indent': ['error', 2, {
        'attribute': 1,
        'closeBracket': 0,
        'ignores': []
    }],
    */
    'vue/html-quotes': [2, 'double'],
    'vue/html-self-closing': [2],
    'vue/max-attributes-per-line': [
      2,
      {
        singleline: 10,
        multiline: {
          max: 1,
          allowFirstLine: false,
        },
      },
    ],
    'vue/mustache-interpolation-spacing': [2, 'always'],
    'vue/name-property-casing': [2, 'camelCase'],
    'vue/no-multi-spaces': 2,
    'vue/v-bind-style': 2,
    'vue/v-on-style': 2,
  },
};
