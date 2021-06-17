module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: false,
      },
    ],
  ],
  plugins: ['@babel/plugin-proposal-object-rest-spread'],
};
