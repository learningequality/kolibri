module.exports = {
  presets: ['@babel/preset-env'],
  // `version` must track the `core-js` catalog entry in pnpm-workspace.yaml.
  plugins: [
    ['babel-plugin-polyfill-corejs3', { method: 'entry-global', version: '3.49' }],
    // polyfill-corejs3 advertises `@babel/runtime-corejs3` as the helper module
    // whatever its `method`, and transform-runtime follows that over its default.
    ['@babel/plugin-transform-runtime', { moduleName: '@babel/runtime' }],
  ],
  sourceType: 'unambiguous',
};
