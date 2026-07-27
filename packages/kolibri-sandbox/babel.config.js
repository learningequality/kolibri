/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
module.exports = {
  presets: ['@babel/preset-env'],
  plugins: [
    [
      'babel-plugin-polyfill-corejs3',
      {
        method: 'usage-global',
        // Our own core-js dependency is the single source of truth for the version.
        version: require('core-js/package.json').version,
      },
    ],
  ],
};
