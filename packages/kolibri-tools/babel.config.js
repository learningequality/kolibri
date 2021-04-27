module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'entry',
        corejs: '3.10',
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-object-rest-spread'],
};
