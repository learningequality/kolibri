module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: {
      main: './assets/src/module.js',
      pdfJSWorker: 'pdfjs-dist/legacy/build/pdf.worker.entry',
    },
    resolve: {
      fallback: {
        "zlib": false,
        "stream": require.resolve("web-streams-polyfill/es5")
      },
    },
  },
};
