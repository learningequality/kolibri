import { createSandboxedContentViewer } from 'kolibri/components/SandboxedContentViewer';
import '../module';

jest.mock('kolibri-viewer', () => class {});
jest.mock('kolibri/components/SandboxedContentViewer', () => ({
  createSandboxedContentViewer: jest.fn(() => ({})),
  renderableFileTypes: () => ['image/png'],
}));
jest.mock('kolibri/urls', () => ({
  'kolibri:core:contentpermalink': () => '/permalink/',
  zipContentStorageUrl: (fileId, extension) =>
    `http://zip.origin/zip/content/storage/${fileId}.${extension}`,
}));

function buildContentUrl(file, context) {
  const [{ urlBuilder }] = createSandboxedContentViewer.mock.calls[0];
  return urlBuilder(file, context);
}

describe('ZIM viewer content URL', () => {
  it('reads the ZIM from content storage on the zip content origin', () => {
    const file = {
      checksum: 'abc123',
      extension: 'zim',
      storage_url: '/main/content/storage/a/b/abc123.zim',
    };

    const url = buildContentUrl(file, { options: {}, contentNode: null });

    const params = new URLSearchParams(new URL(url).hash.slice(1));
    expect(params.get('storage')).toBe('http://zip.origin/zip/content/storage/abc123.zim');
  });
});
