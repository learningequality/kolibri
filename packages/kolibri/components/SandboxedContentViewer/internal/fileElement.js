import {
  MEDIA_ELEMENT_FAMILIES,
  mimetypeFamily,
} from '../../../composables/internal/renderableFileTypes';

/**
 * Mirrors the element SafeHTML renders for a file of this type.
 * @param {string} mimetype - The file's type
 * @param {string} url - Where the file loads from
 * @returns {HTMLElement} A detached element pointing at `url`
 */
export function createFileElement(mimetype, url) {
  const fileFamily = mimetypeFamily(mimetype);
  if (MEDIA_ELEMENT_FAMILIES.includes(fileFamily)) {
    const element = document.createElement(fileFamily);
    const source = document.createElement('source');
    source.setAttribute('src', url);
    source.setAttribute('type', mimetype);
    element.appendChild(source);
    return element;
  }
  const element = document.createElement('object');
  element.setAttribute('data', url);
  element.setAttribute('type', mimetype);
  return element;
}

export function isImage(mimetype) {
  return mimetypeFamily(mimetype) === 'image';
}

// The video player and PDF viewer have a fullscreen toggle of their own; the audio player has none.
export function hasOwnFullscreen(mimetype) {
  return mimetypeFamily(mimetype) === 'video' || mimetype === 'application/pdf';
}
