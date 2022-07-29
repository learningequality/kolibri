import QTIViewer from './views/QTIViewer';
import ContentRendererModule from 'content_renderer_module';

class QTIViewerModule extends ContentRendererModule {
  get rendererComponent() {
    QTIViewer.contentModule = this;
    return QTIViewer;
  }
}

const qtiViewer = new QTIViewerModule();

export { qtiViewer as default };
