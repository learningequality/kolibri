import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import importPlugin from 'eslint-plugin-import';
import kolibri from 'eslint-plugin-kolibri';
import jestDom from 'eslint-plugin-jest-dom';
import jest from 'eslint-plugin-jest';
import prettier from 'eslint-config-prettier';

const OFF = 0;
const ERROR = 2;

export default [
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Base configuration for all files
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          impliedStrict: true,
        },
      },
      globals: {
        __version: true,
        __filename: true,
        __copyrightYear: true,
        __kolibriModuleName: true,
        __webpack_public_path__: true,
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        // Node globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      kolibri,
      'jest-dom': jestDom,
      jest,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.json', '.vue'],
        },
      },
    },
    rules: {
      ...prettier.rules,
      // Apply jest-dom rules globally like the old config
      ...jestDom.configs.recommended.rules,
      
      // From plugin:import/errors
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/default': 'error',
      'import/namespace': 'error',
      'import/no-restricted-paths': 'off',
      'import/no-absolute-path': 'error',
      'import/no-dynamic-require': 'off',
      'import/no-internal-modules': 'off',
      'import/no-webpack-loader-syntax': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'off',
      'import/no-useless-path-segments': 'error',
      'import/no-relative-parent-imports': 'off',
      'import/no-relative-packages': 'error',
      'import/export': 'error',
      
      // From plugin:import/warnings
      'import/no-named-as-default': 'warn',
      'import/no-named-as-default-member': 'warn',
      'import/no-deprecated': 'off',
      // Disable this rule globally - we'll enable it selectively
      'import/no-extraneous-dependencies': 'off',
      'import/no-mutable-exports': 'error',
      'import/no-unused-modules': 'off',
      
      // Additional import rules (style/ordering)
      'import/first': ERROR,
      'import/no-duplicates': ERROR,
      'import/newline-after-import': ERROR,
      'import/order': ERROR,
      
      // === OTHER RULES ===
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
      'prefer-const': [
        ERROR,
        {
          destructuring: 'any',
          ignoreReadBeforeAssign: false,
        },
      ],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },

  // Enable import/no-extraneous-dependencies only for main application code
  {
    files: [
      'kolibri/**/*.js',
      'kolibri/**/*.mjs', 
      'src/**/*.js',
      'src/**/*.mjs',
      'lib/**/*.js',
      'lib/**/*.mjs'
    ],
    ignores: [
      '**/*.spec.{js,mjs}',
      '**/*.test.{js,mjs}',
      '**/*.int.{js,mjs}',
      '**/test/**/*',
      '**/tests/**/*',
      '**/__tests__/**/*',
      '**/__mocks__/**/*',
    ],
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: false,
          optionalDependencies: false,
          peerDependencies: true
        }
      ],
    },
  },

  // Vue.js files configuration
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    plugins: {
      vue,
      import: importPlugin,  // Added import plugin for Vue files
      kolibri,
    },
    rules: {
      // Disable regular indent rule for Vue files
      indent: 'off',
      
      // Vue-specific rules
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
        2,
        {
          attribute: 1,
          baseIndent: 1,
          closeBracket: 0,
          alignAttributesVertically: true,
        },
      ],
      'vue/block-tag-newline': 'off',
      'vue/script-indent': [ERROR, 2, { baseIndent: 1, switchCase: 1 }],
      'vue/static-class-names-order': ERROR,
      'vue/no-deprecated-scope-attribute': ERROR,
      'vue/valid-v-bind-sync': ERROR,
      'vue/no-deprecated-slot-attribute': ERROR,
      'vue/no-deprecated-slot-scope-attribute': ERROR,
      'vue/valid-v-slot': ERROR,
      'vue/v-slot-style': ERROR,
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

      // Custom Kolibri Vue rules
      'kolibri/vue-no-unused-vuex-properties': ERROR,
      'kolibri/vue-no-unused-vuex-methods': ERROR,
      'kolibri/vue-watch-no-string': ERROR,
      'kolibri/vue-no-unused-translations': ERROR,
      'kolibri/vue-no-undefined-string-uses': ERROR,
      'kolibri/vue-string-objects-formatting': ERROR,
      'kolibri/vue-component-block-padding': ERROR,
      'kolibri/vue-component-block-tag-newline': ERROR,
      'kolibri/vue-component-require-img-src': ERROR,
      'kolibri/vue-component-class-name-casing': ERROR,
      'kolibri/vue-component-no-duplicate-ids': ERROR,
    },
  },

  // Test files (.spec.js)
  {
    files: ['**/*.spec.js'],
    languageOptions: {
      globals: {
        ...jest.environments.globals.globals,
      },
    },
    plugins: {
      jest,
      'jest-dom': jestDom,
    },
    rules: {
      ...jest.configs.recommended.rules,
      ...jestDom.configs.recommended.rules,
    },
  },

  // Mock files
  {
    files: ['**/__mocks__/**/*'],
    languageOptions: {
      globals: {
        ...jest.environments.globals.globals,
      },
    },
    plugins: {
      jest,
    },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },

  // Integration test files (.int.js)
  {
    files: ['**/*.int.js'],
    languageOptions: {
      globals: {
        ...jest.environments.globals.globals,
        page: 'readonly',
        browser: 'readonly',
        context: 'readonly',
        jestPuppeteer: 'readonly',
      },
    },
    plugins: {
      jest,
    },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },
];