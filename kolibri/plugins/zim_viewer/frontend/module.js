import ContentViewerModule from 'kolibri-viewer';
import urls from 'kolibri/urls';
import {
  createSandboxedContentViewer,
  renderableFileTypes,
} from 'kolibri/components/SandboxedContentViewer';
import resolveBatch from './resolveBatch';

function buildContentUrl(file, { options, contentNode }) {
  const entry = options.entry || 'W/mainPage';
  const permalinkUrl = new URL(urls['kolibri:core:contentpermalink'](), window.location.href).href;
  const fragmentParams = {
    storage: urls.zipContentStorageUrl(file.checksum, file.extension),
    entry,
    native: renderableFileTypes().join(','),
  };
  const rootId = contentNode && (contentNode.root_id || contentNode.id);
  if (rootId) {
    fragmentParams.rootId = rootId;
  }
  const fragment = new URLSearchParams(fragmentParams).toString();
  return `${permalinkUrl}#${fragment}`;
}

const ZimViewerComponent = createSandboxedContentViewer({
  urlBuilder: buildContentUrl,
  renderFiles: true,
  onHandlerRequest: ({ paths }, { file }) =>
    resolveBatch(`${file.checksum}.${file.extension}`, paths),
});

class ZimViewerModule extends ContentViewerModule {
  get viewerComponent() {
    return ZimViewerComponent;
  }
}

export default new ZimViewerModule();
