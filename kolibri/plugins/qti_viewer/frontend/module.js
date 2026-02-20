import ContentViewerModule from 'kolibri-viewer';
import QTIViewer from './components/QTIViewer';

class QTIViewerModule extends ContentViewerModule {
  get viewerComponent() {
    QTIViewer.contentModule = this;
    return QTIViewer;
  }
}

const qtiViewer = new QTIViewerModule();

export { qtiViewer as default };
