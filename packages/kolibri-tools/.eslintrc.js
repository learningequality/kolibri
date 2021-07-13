var path = require('path');
var OFF = 0;
var ERROR = 2;

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
    },
    {
      files: ['**/__mocks__/*.*'],
      env: {
        jest: true,
      },
    },
    {
      files: ['*.int.js'],
      env: {
        jest: true,
      },
      globals: {
        page: true,
        browser: true,
        context: true,
        jestPuppeteer: true,
      },
    },
  ],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: {
      impliedStrict: true,
    },
  },
  globals: {
    __version: true,
    __filename: true,
    __copyrightYear: true,
    __kolibriModuleName: true,
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
      [path.resolve(path.join(path.dirname(__filename), './lib/alias_import_resolver.js'))]: {
        extensions: ['.js', '.vue'],
      },
    },
  },
  rules: {
    'comma-style': ERROR,
    'max-len': [
      ERROR,
      100,
      {
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreUrls: true,
        ignoreTrailingComments: true,
      },
    ],
    'vue/max-len': [
      ERROR,
      {
        code: 100,
        template: 100,
        comments: 100,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreHTMLTextContents: true,
        ignoreTrailingComments: true,
      },
    ],
    'vue/attribute-hyphenation': [ERROR, 'never'],
    'vue/require-default-prop': ERROR,
    'vue/html-self-closing': [
      ERROR,
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
      ERROR,
      {
        singleline: 5,
        multiline: {
          max: 1,
          allowFirstLine: false,
        },
      },
    ],
    'vue/html-closing-bracket-newline': [
      ERROR,
      {
        singleline: 'never',
        multiline: 'always',
      },
    ],
    'vue/component-name-in-template-casing': [
      ERROR,
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
    'vue/no-spaces-around-equal-signs-in-attribute': ERROR,
    'vue/multiline-html-element-content-newline': [
      ERROR,
      {
        // because of compatibility with our custom HTMLHint rule
        // enforcing top-level content surrounded by one empty line
        allowEmptyLines: true,
      },
    ],
    'vue/order-in-components': [
      ERROR,
      {
        order: [
          'el',
          'name',
          'metaInfo',
          'parent',
          'functional',
          ['delimiters', 'comments'],
          ['components', 'directives', 'filters'],
          'extends',
          'mixins',
          'inheritAttrs',
          'setup',
          'model',
          ['props', 'propsData'],
          'data',
          'computed',
          'watch',
          'beforeRouteEnter',
          'beforeRouteUpdate',
          'beforeRouteLeave',
          'LIFECYCLE_HOOKS',
          'methods',
          ['template', 'render'],
          'renderError',
          '$trs',
        ],
      },
    ],
    'vue/html-indent': [
      ERROR,
      2, // Base indent spaces
      {
        attribute: 1,
        baseIndent: 1,
        closeBracket: 0,
        alignAttributesVertically: true,
      },
    ],
    'vue/static-class-names-order': ERROR,
    'vue/no-deprecated-scope-attribute': ERROR,
    'vue/valid-v-bind-sync': ERROR,
    // TODO Enforcing these rules requires bigger refactor
    'vue/no-deprecated-slot-attribute': ERROR,
    'vue/no-deprecated-slot-scope-attribute': ERROR,
    'vue/valid-v-slot': ERROR,
    'vue/v-slot-style': ERROR,
    // ESLint rules for interpolated JS
    'vue/object-curly-spacing': [ERROR, 'always'],
    'vue/eqeqeq': [ERROR, 'always'],
    'vue/key-spacing': [ERROR, { afterColon: true }],
    'vue/space-infix-ops': ERROR,
    'vue/space-unary-ops': ERROR,
    'vue/no-lone-template': OFF,

    'import/first': ERROR,
    'import/no-duplicates': ERROR,
    'import/newline-after-import': ERROR,
    'import/order': ERROR,

    // Custom vue rules
    'kolibri/vue-filename-and-component-name-match': ERROR,
    'kolibri/vue-component-registration-casing': ERROR,
    'kolibri/vue-no-unused-properties': ERROR,
    'kolibri/vue-no-unused-vuex-properties': ERROR,
    'kolibri/vue-no-unused-methods': ERROR,
    'kolibri/vue-no-unused-vuex-methods': ERROR,
    'kolibri/vue-watch-no-string': ERROR,
    'kolibri/vue-no-unused-translations': ERROR,
    'kolibri/vue-no-undefined-string-uses': ERROR,
  },
};
