/*
 * This is a referenceable object that can be required by other modules,
 * which has urls written into it at runtime by the Kolibri server.
 */

const urls = {
  static(url) {
    if (!this.__staticURL) {
      throw new ReferenceError('Static URL is not defined');
    }
    const base = new URL(this.__staticURL, window.location.origin);
    const urlObject = new URL(url, base);
    return urlObject.href;
  },
};

export default urls;
