/**
 * H5P Handler for sandboxed content.
 *
 * Handles H5P_ZIP content type using H5PRunner for content loading.
 * Provides xAPI shim for learning record storage.
 */
import SandboxHandler from 'kolibri-sandbox/SandboxHandler';
import xAPIShim from './xAPIShim';
import H5PShim from './H5PShim';
import H5PRunner from './H5PRunner';

export default class H5PHandler extends SandboxHandler {
  /**
   * Shims required by H5P content.
   * - xAPI: For learning record storage
   * - H5P: Defines the H5PIntegration global, and persists H5P's own user data
   */
  static shims = [xAPIShim, H5PShim];

  /**
   * Initialize the iframe with H5P content.
   * @param {HTMLIFrameElement} iframe - The content iframe
   * @param {string} startUrl - URL to the H5P file
   * @returns {Promise<void>}
   */
  init(iframe, startUrl) {
    return new Promise((resolve, reject) => {
      this.runner = new H5PRunner(this.shims.H5P);
      // Hand the runner over before it sets iframe.src, so the shim can build
      // H5PIntegration when the content page calls back from its <head>.
      this.shims.H5P.setRunner(this.runner);
      this.runner.init(iframe, startUrl, resolve, reject);
    });
  }

  /**
   * Clean up resources when content is unloaded.
   */
  destroy() {
    this.runner = null;
  }
}
