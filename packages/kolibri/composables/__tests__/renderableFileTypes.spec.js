import { isRenderableFileType, renderableFileTypes } from '../internal/renderableFileTypes';

let mockObjectTypes;

jest.mock('kolibri', () => ({
  __esModule: true,
  default: {
    canHandleElement: element => element.matches('video'),
    objectViewerMimetypes: () => mockObjectTypes,
  },
}));

describe('renderableFileTypes', () => {
  beforeEach(() => {
    mockObjectTypes = [
      'application/pdf',
      'application/epub+zip',
      'application/perseus+zip',
      'application/x-plugin-claimed',
    ];
  });

  it('includes raster images, the media families a viewer claims, and claimed PDF', () => {
    expect(renderableFileTypes()).toEqual(
      expect.arrayContaining(['image/png', 'video/*', 'application/pdf']),
    );
  });

  it('leaves out media families no viewer claims, and SVG', () => {
    expect(renderableFileTypes()).not.toContain('audio/*');
    expect(renderableFileTypes()).not.toContain('image/svg+xml');
  });

  it('leaves out PDF when no viewer claims it', () => {
    mockObjectTypes = [];

    expect(renderableFileTypes()).not.toContain('application/pdf');
  });

  it.each(['application/epub+zip', 'application/perseus+zip', 'application/x-plugin-claimed'])(
    'leaves out %s, though a viewer claims it',
    mimetype => {
      expect(renderableFileTypes()).not.toContain(mimetype);
      expect(isRenderableFileType(mimetype)).toBe(false);
    },
  );
});

describe('isRenderableFileType', () => {
  beforeEach(() => {
    mockObjectTypes = ['application/pdf'];
  });

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

  it('refuses a media type a Blob would drop, leaving it for the browser to sniff', () => {
    expect(isRenderableFileType('video/é')).toBe(false);
  });

  it('refuses a malformed or parameterised media type', () => {
    for (const mimetype of ['video/', 'video/mp4 x', 'video/mp4;codecs=x']) {
      expect(isRenderableFileType(mimetype)).toBe(false);
    }
  });
});
