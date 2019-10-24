module.exports = {
  bundle_id: 'main',
  webpack_config: {
    entry: {
      main: './assets/src/module.js',
      pdfJSWorker: 'pdfjs-dist/build/pdf.worker.entry',
    },
  },
};
