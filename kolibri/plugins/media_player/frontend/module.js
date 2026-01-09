import ContentViewerModule from 'kolibri-viewer';
import MediaPlayerComponent from './views/MediaPlayerIndex';

class MediaPlayerModule extends ContentViewerModule {
  get viewerComponent() {
    return MediaPlayerComponent;
  }
}

const mediaPlayerModule = new MediaPlayerModule();

export { mediaPlayerModule as default };
