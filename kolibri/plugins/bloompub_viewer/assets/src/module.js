import BloomPubComponent from './views/BloomPubRendererIndex.vue';
import ContentRendererModule from 'content_renderer_module';

class BloomPubModule extends ContentRendererModule {
  get rendererComponent() {
    return BloomPubComponent;
  }
}

const bloomPubModule = new BloomPubModule();

export { bloomPubModule as default };
