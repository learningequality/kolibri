/*
 * This is a referenceable object that can be required by other modules,
 * which has urls written into it at runtime by the Kolibri server.
 */

import plugin_data from 'plugin_data';
import setWebpackPublicPath from '../utils/setWebpackPublicPath';

function generateUrl(baseUrl, { url, origin, port } = {}) {
  let urlObject = new URL(baseUrl, origin || window.location.origin);
  if (port) {
    urlObject.port = port;
  }
  if (url) {
    urlObject = new URL(url, urlObject);
  }
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
  hashi() {
    if (!this.__hashiUrl) {
      throw new ReferenceError('Hashi Url is not defined');
    }
    return generateUrl(this.__hashiUrl, {
      origin: this.__zipContentOrigin,
      port: this.__zipContentPort,
    });
  },
  static(url) {
    if (!this.__staticUrl) {
      throw new ReferenceError('Static Url is not defined');
    }
    return generateUrl(this.__staticUrl, { url });
  },
  media(url) {
    if (!this.__mediaUrl) {
      throw new ReferenceError('Media Url is not defined');
    }
    return generateUrl(this.__mediaUrl, { url });
  },
  zipContentUrl(fileId, extension, embeddedFilePath = '', baseurl) {
    const filename = `${fileId}.${extension}`;
    if (!this.__zipContentUrl) {
      throw new ReferenceError('Zipcontent Url is not defined');
    }
    return generateUrl(this.__zipContentUrl, {
      url: `${baseurl ? baseurl + '/' : ''}${filename}/${embeddedFilePath}`,
      origin: this.__zipContentOrigin,
      port: this.__zipContentPort,
    });
  },
  storageUrl(fileId, extension) {
    const filename = `${fileId}.${extension}`;
    if (!this.__contentUrl) {
      throw new ReferenceError('Zipcontent Url is not defined');
    }
    return generateUrl(this.__contentUrl, { url: `${filename[0]}/${filename[1]}/${filename}` });
  },
};

export default urls;
