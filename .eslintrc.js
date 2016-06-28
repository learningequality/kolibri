module.exports = {
  root: true,
  extends: 'airbnb/base',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // custom rules
  'rules': {
    'no-param-reassign': ['error', { 'props': false }], // permit vuex state mutations
    'quote-props': ['error', 'consistent-as-needed'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  }
};
