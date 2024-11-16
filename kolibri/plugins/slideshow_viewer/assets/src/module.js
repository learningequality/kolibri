import ContentRendererModule from 'kolibri-viewer';
import SlideshowRendererComponent from './views/SlideshowRendererComponent';

class SlideshowModule extends ContentRendererModule {
  get rendererComponent() {
    SlideshowRendererComponent.contentModule = this;
    return SlideshowRendererComponent;
  }
}

const slideshowModule = new SlideshowModule();

export { slideshowModule as default };
