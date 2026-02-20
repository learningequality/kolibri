import ContentViewerModule from 'kolibri-viewer';
import PDFComponent from './views/PdfRendererIndex';

class DocumentPDFModule extends ContentViewerModule {
  get viewerComponent() {
    return PDFComponent;
  }
}

const documentPDFModule = new DocumentPDFModule();

export { documentPDFModule as default };
