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
    'csstree/validator': true,

    /*
     * Ignored rules
     * Inline comments explain why rule is ignored
     */
    'no-empty-source': null, // Empty style blocks in vue files
    'font-family-no-missing-generic-family-keyword': null, // Noto Sans is always available
    'color-named': null, // No opinion

    'no-descending-specificity': null, // Would require refactor
    'selector-no-qualifying-type': null, // Would require refactor
    'max-nesting-depth': null, // Would require refactor
    'selector-max-compound-selectors': null, // Would require refactor
    'selector-class-pattern': null, // Deep selector classes do not follow this

    'order/properties-alphabetical-order': null,
    'scss/percent-placeholder-pattern': null,
  },
};
