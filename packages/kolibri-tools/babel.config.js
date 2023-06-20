module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'entry',
        corejs: '3.13',
      },
    ],
  ],
  plugins: ['@babel/plugin-syntax-import-assertions'],
};
