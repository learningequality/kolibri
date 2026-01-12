import ContentViewerModule from 'kolibri-viewer';
import urls from 'kolibri/urls';
import { createSandboxedContentViewer } from 'kolibri/components/SandboxedContentViewer';

/**
 * Build content URL for HTML5 zip content.
 * Handles entry point and remote URL baseurl parameter.
 * @param {object} file - The content file object to resolve a URL for
 * @param {object} props - Viewer state; its `options.entry` sets the zip entry point
 * @returns {string} URL to the HTML5 zip content's entry point
 */
function buildContentUrl(file, props) {
  const entry = (props.options && props.options.entry) || 'index.html';

  // zipContentUrl takes the file object and the embedded file path, and
  // preserves any remote-URL baseurl from the file's storage_url internally.
  return urls.zipContentUrl(file, entry);
}

const Html5ViewerComponent = createSandboxedContentViewer({
  defaultDuration: 300,
  progressPollingInterval: 5000,
  urlBuilder: buildContentUrl,
  eventHandlers: {
    navigateTo: (message, emit) => emit('navigateTo', message),
  },
});

class HTML5AppModule extends ContentViewerModule {
  get viewerComponent() {
    return Html5ViewerComponent;
  }
}

const hTML5AppModule = new HTML5AppModule();

export { hTML5AppModule as default };
