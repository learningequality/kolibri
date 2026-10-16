import {
  createFileElement,
  isRenderableFileType,
  renderableFileTypes,
} from '../SandboxedContentViewer/internal/fileElement';

jest.mock('kolibri', () => ({
  __esModule: true,
  default: {
    canHandleElement: element => element.matches('video'),
    objectViewerMimetypes: () => ['application/pdf', 'application/perseus+zip'],
  },
}));

describe('createFileElement', () => {
  it('makes the element SafeHTML would show each kind of file as', () => {
    expect(createFileElement('image/png', 'blob:1').outerHTML).toBe('<img src="blob:1">');
    expect(createFileElement('video/mp4', 'blob:2').outerHTML).toBe('<video src="blob:2"></video>');
    expect(createFileElement('audio/mpeg', 'blob:3').outerHTML).toBe(
      '<audio src="blob:3"></audio>',
    );
    expect(createFileElement('application/pdf', 'blob:4').outerHTML).toBe(
      '<object data="blob:4" type="application/pdf"></object>',
    );
  });
});

describe('renderableFileTypes', () => {
  it('lists raster images, the media families a viewer claims, and viewer object types', () => {
    expect(renderableFileTypes()).toEqual([
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'image/avif',
      'image/bmp',
      'video/*',
      'application/pdf',
      'application/perseus+zip',
    ]);
  });
});

describe('isRenderableFileType', () => {
  it('accepts the types Kolibri renders', () => {
    for (const mimetype of ['image/png', 'video/mp4', 'application/pdf']) {
      expect(isRenderableFileType(mimetype)).toBe(true);
    }
  });

  it('refuses scriptable and unclaimed types', () => {
    for (const mimetype of ['image/svg+xml', 'text/html', 'audio/mpeg', 'image/png; x=y']) {
      expect(isRenderableFileType(mimetype)).toBe(false);
    }
  });
});
