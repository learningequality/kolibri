module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: './assets/src/module.js',
    resolve: {
      fallback: {
        "zlib": require.resolve("browserify-zlib"),
        "stream": require.resolve("web-streams-polyfill/es5")
      }
    },
  },
};
