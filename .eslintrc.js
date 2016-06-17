module.exports = {
  root: true,
  extends: 'airbnb/base',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // add your custom rules here
  'rules': {
    'quote-props': ['error', 'consistent-as-needed'],
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  }
}
