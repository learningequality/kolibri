module.exports = [
  {
    bundle_id: 'main',
    webpack_config: {
      entry: './frontend/module.js',
    },
  },
  {
    bundle_id: 'sandbox_handler',
    sandbox_handler: true,
    webpack_config: {
      entry: './frontend/sandbox_handler/index.js',
      resolve: {
        fallback: {
          stream: require.resolve('web-streams-polyfill/es5'),
        },
      },
    },
  },
];
