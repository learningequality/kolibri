module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: {
      main: './frontend/module.js',
      pdfJSWorker: require.resolve('pdfjs-dist/legacy/build/pdf.worker.entry'),
    },
    resolve: {
      fallback: {
        "zlib": false,
        "stream": require.resolve("web-streams-polyfill/es5")
      },
    },
  },
};
