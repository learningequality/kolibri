import MediaPlayerComponent from './views/MediaPlayerRoot';
import ContentRendererModule from 'content_renderer_module';

class MediaPlayerModule extends ContentRendererModule {
  get rendererComponent() {
    return MediaPlayerComponent;
  }
}

const mediaPlayerModule = new MediaPlayerModule();

export { mediaPlayerModule as default };
