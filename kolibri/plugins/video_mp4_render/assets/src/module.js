import ContentRendererModule from 'content_renderer_module';
import VideoComponent from './views/index';

class VideoMP4Module extends ContentRendererModule {
  get rendererComponent() {
    return VideoComponent;
  }
}

const videoMP4Module = new VideoMP4Module();

export { videoMP4Module as default };
