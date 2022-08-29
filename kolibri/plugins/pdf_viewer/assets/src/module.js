import ContentRendererModule from 'content_renderer_module';
import PDFComponent from './views/PdfRendererIndex';

class DocumentPDFModule extends ContentRendererModule {
  get rendererComponent() {
    return PDFComponent;
  }
}

const documentPDFModule = new DocumentPDFModule();

export { documentPDFModule as default };
