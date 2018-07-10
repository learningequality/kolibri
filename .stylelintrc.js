module.exports = {
  plugins: ['stylelint-high-performance-animation'],
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended-scss',
    'stylelint-config-sass-guidelines',
    'stylelint-config-prettier',
  ],
  rules: {
    'no-empty-source': null,
    'font-family-no-missing-generic-family-keyword': null,
    'no-duplicate-at-import-rules': null,
    'no-descending-specificity': null,
    'color-named': null,

    'scss/at-import-partial-extension-blacklist': null,

    'order/properties-alphabetical-order': null,

    'plugin/no-low-performance-animation-properties': true,
  },
};
