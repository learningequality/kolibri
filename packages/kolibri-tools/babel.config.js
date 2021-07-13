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
  plugins: ['@babel/plugin-proposal-object-rest-spread', '@babel/plugin-syntax-import-assertions'],
};
