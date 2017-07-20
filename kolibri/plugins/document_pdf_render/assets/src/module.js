
const ContentRendererModule = require('content_renderer_module');
const PDFComponent = require('./views/index');

class DocumentPDFModule extends ContentRendererModule {
  get rendererComponent() {
    return PDFComponent;
  }
}

module.exports = new DocumentPDFModule();
