/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
module.exports = {
  presets: ['@babel/preset-env'],
  plugins: [
    [
      'babel-plugin-polyfill-corejs3',
      {
        method: 'usage-global',
        version: require('core-js/package.json').version,
      },
    ],
  ],
};
