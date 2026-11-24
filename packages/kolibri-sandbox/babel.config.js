/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
const { browsers } = require('browserslist-config-kolibri/cutoff');
const compat = require('core-js-compat');
const version = require('core-js/package.json').version;

module.exports = {
  presets: ['@babel/preset-env'],
  plugins: [
    [
      'babel-plugin-polyfill-corejs3',
      {
        method: 'usage-global',
        version,
        exclude: [...compat({ targets: browsers, version }).list, /^esnext\./],
      },
    ],
  ],
};
