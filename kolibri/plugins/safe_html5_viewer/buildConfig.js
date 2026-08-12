module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: './frontend/module.js',
    resolve: {
      fallback: {
        stream: require.resolve('web-streams-polyfill/es5'),
      },
    },
  },
};
