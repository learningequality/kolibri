
const ContentRendererModule = require('kolibri.coreModules.contentRenderer');
const PDFComponent = require('./vue/index');

class DocumentPDFModule extends ContentRendererModule {
  get rendererComponent() {
    return PDFComponent;
  }
  get contentType() {
    return 'document/pdf';
  }
}

module.exports = new DocumentPDFModule();
