module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'entry',
        corejs: '3.31',
      },
    ],
  ],
  plugins: ['@babel/plugin-syntax-import-assertions'],
  sourceType: 'unambiguous',
};
