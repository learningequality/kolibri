import ContentRendererModule from 'kolibri-viewer';
import BloomPubComponent from './views/BloomPubRendererIndex.vue';

class BloomPubModule extends ContentRendererModule {
  get rendererComponent() {
    return BloomPubComponent;
  }
}

const bloomPubModule = new BloomPubModule();

export { bloomPubModule as default };
