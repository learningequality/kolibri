import store from 'kolibri/store';
import ContentRendererModule from 'kolibri-viewer';
import MediaPlayerComponent from './views/MediaPlayerIndex';
import storeModule from './modules';

class MediaPlayerModule extends ContentRendererModule {
  get rendererComponent() {
    return MediaPlayerComponent;
  }

  get store() {
    return store;
  }

  ready() {
    this.store.registerModule('mediaPlayer', storeModule);
  }
}

const mediaPlayerModule = new MediaPlayerModule();

export { mediaPlayerModule as default };
