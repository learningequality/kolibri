// An absolute path is needed here. stylelint resolves a relative one against the
// directory of the config file it loaded, which can be a host project's re-export.
const noUnknownThemeCustomProperties =
  require.resolve('./stylelint/rules/no-unknown-theme-custom-properties');
const { default: scssPlugins } = require('stylelint-scss');

module.exports = {
  plugins: ['stylelint-csstree-validator', noUnknownThemeCustomProperties],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-scss',
    'stylelint-config-sass-guidelines',
    'stylelint-config-recess-order',
    'stylelint-config-html/vue',
  ],
  rules: {
    'color-hex-length': 'long',
    // `stylelint-config-recommended-scss` 17 switches this off
    'no-duplicate-selectors': true,
    'csstree/validator': {
      syntaxExtensions: ['sass', 'less'],
      ignoreValue: /v-bind\(/, // `v-bind()` in a `<style>` block is Vue syntax, not CSS
    },

    /*
     * Ignored rules
     * Inline comments explain why rule is ignored
     */
    'no-empty-source': null, // Empty style blocks in vue files
    'font-family-no-missing-generic-family-keyword': null, // Noto Sans is always available
    'font-family-name-quotes': null, // Don't worry about this
    'color-named': null, // No opinion
    'color-function-notation': 'legacy', // Require commas in color functions, as otherwise our build breaks.
    // Its autofix turns `rgba()` into 4-argument `rgb()`, which node-sass 9 rejects and
    // which needs Chrome 65, above the browserslist floor of Chrome 49
    'color-function-alias-notation': null,
    'alpha-value-notation': 'number', // Require alpha values to be numbers, as percentages seem to be SCSS specific.

    'declaration-block-no-redundant-longhand-properties': null, // Easier to read margin-top etc than margin shorthand
    'no-descending-specificity': null, // Would require refactor
    'selector-no-qualifying-type': null, // Would require refactor
    'max-nesting-depth': null, // Would require refactor
    'selector-max-compound-selectors': null, // Would require refactor
    'selector-class-pattern': null, // Deep selector classes do not follow this

    'order/properties-alphabetical-order': null,
    'scss/percent-placeholder-pattern': null,
    'scss/no-global-function-names': null, // Does not distinguish between SCSS functions and CSS functions
    // `v-bind()` takes a JS expression, and lowercasing it breaks the binding
    'value-keyword-case': ['lower', { ignoreFunctions: ['v-bind'] }],

    // Custom rules
    // Token names are camelCase, and the rule checks `var()` usage as well as
    // declarations, so `var(--tokens-focusOutline)` is an error without this. Only the
    // theme's own prefixes are relaxed.
    'custom-property-pattern': [
      '^(?:(?:tokens|brand|palette)-[a-z][a-zA-Z0-9]*(?:-[a-zA-Z0-9]+)*|[a-z][a-z0-9]*(?:-[a-z0-9]+)*)$',
    ],
    // Catches a misspelled theme CSS variable, which otherwise resolves to nothing at
    // runtime with no warning anywhere. The rule file covers its `ignoreProperties` option.
    'kolibri/no-unknown-theme-custom-properties': true,
    'import-notation': 'string', // Enforce string imports rather than 'url' as 'url' doesn't work with sass-loader
    'media-feature-range-notation': 'prefix', // Enforce use of min-width and max-width as sass-loader breaks otherwise
    // Enforce indentation of 2 spaces and to be indented within style blocks in Vue SFC
    '@stylistic/indentation': [2, { baseIndentLevel: 1 }],
  },
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss',
    },
    {
      files: ['**/*.less'],
      customSyntax: 'postcss-less',
      // `stylelint-scss` rules throw on Less variables, e.g. `scss/operator-no-unspaced`
      rules: Object.fromEntries(scssPlugins.map(({ ruleName }) => [ruleName, null])),
    },
    {
      files: ['**/*.sass'],
      customSyntax: 'postcss-sass',
    },
    {
      files: ['*.html', '**/*.html', '*.vue', '**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
};
