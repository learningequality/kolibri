/* eslint-disable import-x/no-commonjs, import-x/no-amd, import-x/no-import-module-exports */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: '3.46',
      },
    ],
  ],
};
