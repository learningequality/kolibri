import ContentViewerModule from 'kolibri-viewer';
import EPUBComponent from './views/EpubRendererIndex';

class DocumentEPUBModule extends ContentViewerModule {
  get viewerComponent() {
    EPUBComponent.contentModule = this;
    return EPUBComponent;
  }
}

const documentEPUBModule = new DocumentEPUBModule();

export { documentEPUBModule as default };
