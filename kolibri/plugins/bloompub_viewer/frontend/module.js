import ContentViewerModule from 'kolibri-viewer';
import SandboxedContentViewer from 'kolibri/components/SandboxedContentViewer';

class BloomPubModule extends ContentViewerModule {
  get viewerComponent() {
    return SandboxedContentViewer;
  }
}

const bloomPubModule = new BloomPubModule();

export { bloomPubModule as default };
