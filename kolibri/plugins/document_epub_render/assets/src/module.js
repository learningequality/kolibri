import EPUBComponent from './views/EpubRendererIndex';
import ContentRendererModule from 'content_renderer_module';

class DocumentEPUBModule extends ContentRendererModule {
  get rendererComponent() {
    EPUBComponent.contentModule = this;
    return EPUBComponent;
  }
}

const documentEPUBModule = new DocumentEPUBModule();

export { documentEPUBModule as default };
