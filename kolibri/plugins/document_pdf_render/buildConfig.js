module.exports = {
  bundle_id: 'document_pdf_render_module',
  webpack_config: {
    entry: {
      document_pdf_render_module: './assets/src/module.js',
      pdfJSWorker: 'pdfjs-dist/build/pdf.worker.entry',
    },
  },
};
