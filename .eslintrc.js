module.exports = {
  root: true,
  extends: 'airbnb/base',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  env: {
    'browser': true
  },
  // custom rules
  'rules': {
    // permit vuex state mutations
    'no-param-reassign': ['error', { 'props': false }],
    // permit functions to have unused parameters, e.g. for callbacks
    'no-unused-vars': ['error', { 'args': 'none' }],
    'quote-props': ['error', 'consistent-as-needed'],
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    // These were added during the upgrade to eslint v3 - we may want to remove
    // some of these rules going forwards to clean up the code base.
    'import/no-extraneous-dependencies': 0,
    'import/no-unresolved': 0,
    'global-require': 0,
    'class-methods-use-this': [ 0, { "exceptMethods": [] }],
    // These are required for buble compatibility
    'arrow-parens': [ 0, 'always' ],
    'comma-dangle': ["error", {
        "arrays": "only-multiline",
        "objects": "only-multiline",
        "imports": "only-multiline",
        "exports": "only-multiline",
        "functions": "never"
    }],
    // This is just a codebase convention section
    'no-underscore-dangle': 0
  }
};
