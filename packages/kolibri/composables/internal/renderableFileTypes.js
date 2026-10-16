export const MEDIA_ELEMENT_FAMILIES = ['video', 'audio'];

const RASTER_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
];

// Viewers for other object types (epub.js, Perseus graphie) run scripts from the file on
// the Kolibri origin; the PDF viewer runs pdf.js with isEvalSupported false and no scripting.
const SCRIPTLESS_OBJECT_TYPES = ['application/pdf'];

export function mimetypeFamily(mimetype) {
  return mimetype.split('/')[0];
}

/**
 * Types Kolibri renders in place of sandboxed content. The bytes come from the content,
 * so this is an allowlist of types whose viewers run nothing from the file.
 * @returns {Array<string>} Mimetypes and `family/*` patterns, e.g. `video/*`
 */
export function renderableFileTypes() {
  const kolibri = require('kolibri').default;
  const mediaFamilies = MEDIA_ELEMENT_FAMILIES.filter(mediaFamily =>
    kolibri.canHandleElement(document.createElement(mediaFamily)),
  );
  const objectTypes = kolibri.objectViewerMimetypes();
  return [
    ...RASTER_IMAGE_TYPES,
    ...mediaFamilies.map(mediaFamily => `${mediaFamily}/*`),
    ...SCRIPTLESS_OBJECT_TYPES.filter(type => objectTypes.includes(type)),
  ];
}

// A token-shaped subtype, no parameters. A Blob empties a type with any character outside
// U+0020-U+007E, e.g. `video/é`, leaving the browser to sniff it.
const TOKEN_MIMETYPE = /^[a-z]+\/[a-z0-9][\w.+-]*$/i;

export function isRenderableFileType(mimetype) {
  return renderableFileTypes().some(
    type =>
      type === mimetype ||
      (type === `${mimetypeFamily(mimetype)}/*` && TOKEN_MIMETYPE.test(mimetype)),
  );
}
