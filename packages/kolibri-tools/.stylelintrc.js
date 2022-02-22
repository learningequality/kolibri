module.exports = {
  plugins: ['stylelint-csstree-validator'],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-scss',
    'stylelint-config-sass-guidelines',
    'stylelint-config-recess-order',
    'stylelint-config-prettier',
  ],
  rules: {
    'color-hex-length': 'long',
    "csstree/validator": {
      "syntaxExtensions": ["sass", "less"]
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
  },
  "overrides": [
    {
      "files": ["**/*.scss"],
      "customSyntax": "postcss-scss",
    },
    {
      "files": ["**/*.less"],
      "customSyntax": "postcss-less",
    },
    {
      "files": ["**/*.sass"],
      "customSyntax": "postcss-sass",
    },
  ]
};
