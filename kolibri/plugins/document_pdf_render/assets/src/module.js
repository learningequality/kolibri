
const ContentRendererModule = require('content_renderer_module');
const PDFComponent = require('./vue/index');

class DocumentPDFModule extends ContentRendererModule {
  get rendererComponent() {
    return PDFComponent;
  }
  get contentTypes() {
    return require('./content_types.json');
  }
}

module.exports = new DocumentPDFModule();
