import ContentRendererModule from 'kolibri-viewer';
import SafeHTML5Component from './views/SafeHtml5RendererIndex';

class SafeHTML5Module extends ContentRendererModule {
  get rendererComponent() {
    return SafeHTML5Component;
  }
}

const safeHTML5Module = new SafeHTML5Module();

export { safeHTML5Module as default };
