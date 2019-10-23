import SlideshowRendererComponent from './views/SlideshowRendererComponent';
import ContentRendererModule from 'content_renderer_module';

class SlideshowModule extends ContentRendererModule {
  get rendererComponent() {
    SlideshowRendererComponent.contentModule = this;
    return SlideshowRendererComponent;
  }
}

const slideshowModule = new SlideshowModule();

export { slideshowModule as default };
