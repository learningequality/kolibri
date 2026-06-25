import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginImportX from 'eslint-plugin-import-x';
import pluginJest from 'eslint-plugin-jest';
import pluginJestDom from 'eslint-plugin-jest-dom';
import jsdoc from 'eslint-plugin-jsdoc';
import pluginKolibri from 'eslint-plugin-kolibri';
import pluginN from 'eslint-plugin-n';
import pluginSmallImport from 'eslint-plugin-small-import';
import pluginVue from 'eslint-plugin-vue';
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility';
import globals from 'globals';

const OFF = 0;
const ERROR = 2;
const jsdocRecommended = jsdoc.configs['flat/recommended-error'];

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/vue2-recommended'],
  pluginImportX.flatConfigs.errors,
  pluginImportX.flatConfigs.warnings,
  pluginJestDom.configs['flat/recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  {
    rules: {
      // Kolibri design-system components that always render accessible text content
      // (e.g. via :text prop). The rule cannot see through component boundaries, so
      // we declare them here to prevent false positives on headings that wrap these.
      'vuejs-accessibility/heading-has-content': [
        'error',
        {
          accessibleChildren: ['KButton', 'KLabeledIcon', 'KRouterLink', 'KTextTruncator'],
        },
      ],
      // Kolibri intentionally uses autofocus for accessibility (focus management on modal
      // open, wizard step transitions). Suppress false positives on non-DOM components only.
      'vuejs-accessibility/no-autofocus': ['error', { ignoreNonDOM: true }],
      // Accept either nesting (label wraps input) or id (for/id association) — not both required.
      'vuejs-accessibility/label-has-for': [
        'error',
        { required: { some: ['nesting', 'id'] } },
      ],
    },
  },
  eslintConfigPrettier,
  // JSDoc linting for .js and .vue files
  {
    ...jsdocRecommended,
    files: ['**/*.js', '**/*.vue'],
    rules: {
      ...jsdocRecommended.rules,
      'jsdoc/require-jsdoc': OFF,
      'jsdoc/reject-function-type': OFF,
      // Default values like `[size=2.5MB]` are useful documentation, not a redundant
      // restatement of a code default; `no-defaults` rejects all of them indiscriminately.
      'jsdoc/no-defaults': OFF,
      // A specific `@returns` shape/typedef is self-documenting; requiring prose after it just
      // forces a restatement of the type.
      'jsdoc/require-returns-description': OFF,
      'jsdoc/no-blank-blocks': ERROR,
      'jsdoc/no-blank-block-descriptions': ERROR,
      'jsdoc/informative-docs': ERROR,
      'jsdoc/sort-tags': ERROR,
      'jsdoc/check-line-alignment': [ERROR, 'never'],
      'jsdoc/require-description': ERROR,
      'jsdoc/require-hyphen-before-param-description': ERROR,
      'jsdoc/require-throws': ERROR,
      // `@affects` documents side-effects on outer state; used widely in Kolibri composables.
      'jsdoc/check-tag-names': [ERROR, { definedTags: ['affects'] }],
    },
  },
  {
    plugins: {
      kolibri: pluginKolibri,
      jest: pluginJest,
      n: pluginN,
      'small-import': pluginSmallImport,
    },
    linterOptions: {
      // Match ESLint 8 behavior: don't report/fix unused disable directives
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          impliedStrict: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2015,
        __version: 'readonly',
        __filename: 'readonly',
        __copyrightYear: 'readonly',
        __kolibriModuleName: 'readonly',
        __webpack_public_path__: 'readonly',
      },
    },
    settings: {
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.json', '.vue'],
        },
        exports: true,
      },
    },
    rules: {
      'comma-style': ERROR,
      'no-console': ERROR,
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
          singleline: {
            max: 1,
          },
          multiline: {
            max: 1,
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
      'vue/multi-word-component-names': 'off',
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
      // Turn this rule off explicitly so that it doesn't interfere
      // with our vendored version that implements our Kolibri
      // specific component formatting specifications.
      'vue/block-tag-newline': 'off',
      // By default this rule doesn't indent switch cases, so set this to indent them
      // by our base indent amount.
      'vue/script-indent': [ERROR, 2, { baseIndent: 1, switchCase: 1 }],
      'vue/static-class-names-order': ERROR,
      'vue/no-deprecated-scope-attribute': ERROR,
      'vue/valid-v-bind-sync': ERROR,
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
      'vue/match-component-file-name': ERROR,
      'vue/component-options-name-casing': [ERROR, 'PascalCase'],
      'vue/no-unused-properties': [
        ERROR,
        {
          groups: ['props', 'data', 'computed', 'methods', 'setup'],
          deepData: true,
          ignorePublicMembers: true,
        },
      ],
      // Prevent unwrapped strings in templates to ensure we are doing i18n properly
      'vue/no-bare-strings-in-template': [
        ERROR,
        {
          allowlist: [
            '(',
            ')',
            ',',
            '.',
            '&',
            '+',
            '-',
            '=',
            '*',
            '/',
            '#',
            '%',
            '!',
            '?',
            ':',
            '[',
            ']',
            '{',
            '}',
            '<',
            '>',
            '\u00b7',
            '\u2022',
            '\u2010',
            '\u2013',
            '\u2014',
            '\u2212',
            '|',
          ],
          attributes: {
            '/.+/': [
              'title',
              'aria-label',
              'aria-placeholder',
              'aria-roledescription',
              'aria-valuetext',
              'ariaLabel',
              'ariaPlaceholder',
              'ariaRoledescription',
              'ariaValuetext',
              'label',
              'text',
              'description',
              'tooltip',
              'submitText',
              'cancelText',
              'errorMessage',
            ],
            input: ['placeholder'],
            img: ['alt'],
          },
          directives: ['v-text'],
        },
      ],

      'import-x/first': ERROR,
      'import-x/no-duplicates': ERROR,
      'import-x/no-extraneous-dependencies': ERROR,
      'import-x/no-self-import': ERROR,
      'import-x/no-useless-path-segments': ERROR,
      'import-x/newline-after-import': ERROR,
      'import-x/order': [
        ERROR,
        {
          pathGroups: [
            { pattern: 'kolibri', group: 'external' },
            { pattern: 'kolibri/**', group: 'external' },
            { pattern: 'kolibri-*', group: 'external' },
            { pattern: 'kolibri-*/**', group: 'external' },
          ],
          pathGroupsExcludedImportTypes: [],
        },
      ],
      // Disable rules not present in eslint-plugin-import or with resolver issues
      'import-x/no-rename-default': OFF,
      // import-x/default doesn't handle CJS module.exports as default exports
      // unlike the old eslint-plugin-import, so disable for parity
      'import-x/default': OFF,
      'import-x/no-commonjs': ERROR,
      'import-x/no-amd': ERROR,
      'import-x/no-import-module-exports': ERROR,

      'small-import/no-full-import': ERROR,

      // Node.js rules
      'n/prefer-node-protocol': ERROR,
      'n/no-deprecated-api': ERROR,
      'n/no-exports-assign': ERROR,
      'n/no-path-concat': ERROR,

      // Custom vue rules
      'kolibri/vue-no-unused-vuex-properties': ERROR,
      'kolibri/vue-no-unused-vuex-methods': ERROR,
      'kolibri/vue-watch-no-string': ERROR,
      'kolibri/vue-no-unused-translations': ERROR,
      'kolibri/vue-no-undefined-string-uses': ERROR,
      'kolibri/no-undefined-translator-keys': ERROR,
      'kolibri/vue-string-objects-formatting': ERROR,
      'kolibri/vue-component-block-padding': ERROR,
      'kolibri/vue-component-block-tag-newline': ERROR,
      'kolibri/vue-component-require-img-src': ERROR,
      'kolibri/vue-component-class-name-casing': ERROR,
      'kolibri/vue-component-no-duplicate-ids': ERROR,

      // Match ESLint 8 behavior: don't flag unused catch binding variables
      'no-unused-vars': [ERROR, { caughtErrors: 'none' }],

      'prefer-const': [
        ERROR,
        {
          destructuring: 'any',
          ignoreReadBeforeAssign: false,
        },
      ],

      // Enforce data-testid over data-test in templates
      'vue/no-restricted-static-attribute': [
        ERROR,
        { key: 'data-test', message: 'Use data-testid instead of data-test.' },
        { key: 'data-cy', message: 'Use data-testid instead of data-cy.' },
      ],

      // jest rules
      'jest/consistent-test-it': [ERROR, { fn: 'it', withinDescribe: 'it' }],
      'jest/require-top-level-describe': ERROR,
      'jest/no-deprecated-functions': ERROR,
      'jest/no-identical-title': ERROR,
      'jest/valid-expect': ERROR,
    },
  },
  // Override: spec files get jest globals
  {
    files: ['**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'kolibri/tests-no-hardcoded-strings': ERROR,
      'kolibri/tests-no-stubs': ERROR,
    },
  },
  // Override: __mocks__ files get jest globals
  {
    files: ['**/__mocks__/**/*.*'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  // Override: integration test files get jest + puppeteer globals
  {
    files: ['**/*.int.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly',
        jestPuppeteer: 'readonly',
      },
    },
  },
  // Override: Vue files - disable indent in favor of vue/script-indent
  // Recommended by https://eslint.vuejs.org/rules/script-indent.html
  {
    files: ['**/*.vue'],
    rules: {
      indent: 'off',
    },
  },
];
