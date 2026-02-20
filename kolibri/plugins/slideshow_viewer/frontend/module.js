import ContentViewerModule from 'kolibri-viewer';
import SlideshowRendererComponent from './views/SlideshowRendererComponent';

class SlideshowModule extends ContentViewerModule {
  get viewerComponent() {
    SlideshowRendererComponent.contentModule = this;
    return SlideshowRendererComponent;
  }
}

const slideshowModule = new SlideshowModule();

export { slideshowModule as default };
