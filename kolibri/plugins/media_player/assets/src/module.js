import store from 'kolibri.coreVue.vuex.store';
import MediaPlayerComponent from './views/MediaPlayerIndex';
import storeModule from './modules';
import ContentRendererModule from 'content_renderer_module';

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
