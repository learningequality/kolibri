/*
 * This is a referenceable object that can be required by other modules,
 * which has urls written into it at runtime by the Kolibri server.
 */

import setWebpackPublicPath from '../utils/setWebpackPublicPath';
import plugin_data from 'plugin_data';

function generateUrl(baseUrl, url) {
  const base = new URL(baseUrl, window.location.origin);
  const urlObject = new URL(url, base);
  return urlObject.href;
}

const urls = {
  setUp() {
    Object.assign(this, plugin_data.urls);
    setWebpackPublicPath(this);
  },
  static(url) {
    if (!this.__staticURL) {
      throw new ReferenceError('Static URL is not defined');
    }
    const base = new URL(this.__staticURL, window.location.origin);
    const urlObject = new URL(url, base);
    return urlObject.href;
  },
  media(url) {
    if (!this.__mediaURL) {
      throw new ReferenceError('Media URL is not defined');
    }
    const base = new URL(this.__mediaURL, window.location.origin);
    const urlObject = new URL(url, base);
    return urlObject.href;
  },
  storageUrl(fileId, extension, embeddedFilePath = '') {
    const filename = `${fileId}.${extension}`;
    if (['perseus', 'zip', 'h5p'].includes(extension)) {
      return this['kolibri:core:zipcontent'](filename, embeddedFilePath);
    }
    return generateUrl(this.__contentURL, `${filename[0]}/${filename[1]}/${filename}`);
  },
};

export default urls;
