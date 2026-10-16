const MEDIA_ELEMENT_FAMILIES = ['video', 'audio'];

const RASTER_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
];

function family(mimetype) {
  return mimetype.split('/')[0];
}

/**
 * Mirrors the element SafeHTML renders for a file of this type.
 * @param {string} mimetype - The file's type
 * @param {string} url - Where the file loads from
 * @returns {HTMLElement} A detached element pointing at `url`
 */
export function createFileElement(mimetype, url) {
  const fileFamily = family(mimetype);
  if (fileFamily === 'image' || MEDIA_ELEMENT_FAMILIES.includes(fileFamily)) {
    const element = document.createElement(fileFamily === 'image' ? 'img' : fileFamily);
    element.setAttribute('src', url);
    return element;
  }
  const element = document.createElement('object');
  element.setAttribute('data', url);
  element.setAttribute('type', mimetype);
  return element;
}

export function isImage(mimetype) {
  return family(mimetype) === 'image';
}

/**
 * Types Kolibri can render in place of sandboxed content.
 * @returns {Array<string>} Mimetypes and `family/*` patterns, e.g. `video/*`
 */
export function renderableFileTypes() {
  const kolibri = require('kolibri').default;
  const mediaFamilies = MEDIA_ELEMENT_FAMILIES.filter(mediaFamily =>
    kolibri.canHandleElement(document.createElement(mediaFamily)),
  );
  return [
    ...RASTER_IMAGE_TYPES,
    ...mediaFamilies.map(mediaFamily => `${mediaFamily}/*`),
    ...kolibri.objectViewerMimetypes(),
  ];
}

export function isRenderableFileType(mimetype) {
  return renderableFileTypes().some(type => type === mimetype || type === `${family(mimetype)}/*`);
}
