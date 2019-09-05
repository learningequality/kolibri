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
    // Set urls onto this object for export
    // This will add functions for every reversible URL
    // and strings for __staticURL, __mediaURL, and __contentURL
    // this behaviour is defined in kolibri/core/kolibri_plugin.py
    // in the url_tag method of the FrontEndCoreAppAssetHook.
    Object.assign(this, plugin_data.urls);
    setWebpackPublicPath(this);
  },
  static(url) {
    if (!this.__staticUrl) {
      throw new ReferenceError('Static Url is not defined');
    }
    const base = new URL(this.__staticUrl, window.location.origin);
    const urlObject = new URL(url, base);
    return urlObject.href;
  },
  media(url) {
    if (!this.__mediaUrl) {
      throw new ReferenceError('Media Url is not defined');
    }
    const base = new URL(this.__mediaUrl, window.location.origin);
    const urlObject = new URL(url, base);
    return urlObject.href;
  },
  storageUrl(fileId, extension, embeddedFilePath = '') {
    const filename = `${fileId}.${extension}`;
    if (['perseus', 'zip', 'h5p'].includes(extension)) {
      return this['kolibri:core:zipcontent'](filename, embeddedFilePath);
    }
    return generateUrl(this.__contentUrl, `${filename[0]}/${filename[1]}/${filename}`);
  },
};

export default urls;
