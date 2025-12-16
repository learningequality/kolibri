import ContentViewerModule from 'kolibri-viewer';
import BloomPubComponent from './views/BloomPubRendererIndex.vue';

class BloomPubModule extends ContentViewerModule {
  get viewerComponent() {
    return BloomPubComponent;
  }
}

const bloomPubModule = new BloomPubModule();

export { bloomPubModule as default };
