import ContentViewerModule from 'kolibri-viewer';
import SandboxedContentViewer from 'kolibri/components/SandboxedContentViewer';

class H5PViewerModule extends ContentViewerModule {
  get viewerComponent() {
    return SandboxedContentViewer;
  }
}

const h5pViewerModule = new H5PViewerModule();

export { h5pViewerModule as default };
