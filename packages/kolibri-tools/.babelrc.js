module.exports = {
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            useBuiltIns: false,
          },
        ],
      ],
      plugins: ['@babel/plugin-transform-runtime'],
    },
  },
};
