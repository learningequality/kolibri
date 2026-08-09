/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
module.exports = {
  presets: ['@babel/preset-env'],
  // `version` must track the `core-js` catalog entry in pnpm-workspace.yaml.
  plugins: [['babel-plugin-polyfill-corejs3', { method: 'usage-global', version: '3.49' }]],
};
