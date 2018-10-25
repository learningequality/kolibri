var path = require('path');

module.exports = {
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  overrides: [
    {
      files: ['*.spec.js'],
      env: {
        es6: true,
        browser: true,
        node: true,
        jest: true,
      },
      parserOptions: {
        ecmaVersion: 8,
      },
    },
  ],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      impliedStrict: true,
    },
  },
  globals: {
    __version: true,
    __coreAPISpec: true,
    __filename: true,
    __publicPath: true,
    __copyrightYear: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier',
  ],
  plugins: ['import', 'vue', 'kolibri'],
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
    'max-len': [
      2,
      100,
      {
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreUrls: true,
      },
    ],
    'vue/attribute-hyphenation': [2, 'never'],
    'vue/require-default-prop': 0,
    'vue/html-self-closing': [
      2,
      {
        html: {
          void: 'never',
          normal: 'never',
          component: 'always',
        },
        svg: 'always',
        math: 'always',
      },
    ],
    'vue/max-attributes-per-line': [
      2,
      {
        singleline: 5,
        multiline: {
          max: 1,
          allowFirstLine: false,
        },
      },
    ],
    'vue/html-closing-bracket-newline': [
      2,
      {
        singleline: 'never',
        multiline: 'always',
      },
    ],
    'vue/component-name-in-template-casing': [
      2,
      'PascalCase',
      {
        ignores: [
          'mat-svg',
          'file-svg',
          'component',
          'transition',
          'transition-group',
          'router-link',
          'router-view',
        ],
      },
    ],
    'vue/no-spaces-around-equal-signs-in-attribute': 2,
    'import/first': 2,
    'import/no-duplicates': 2,
    'import/newline-after-import': 2,
    'import/order': 2,

    // Custom vue rules
    'kolibri/vue-filename-and-component-name-match': 2,
    'kolibri/vue-component-registration-casing': 2,
  },
};
