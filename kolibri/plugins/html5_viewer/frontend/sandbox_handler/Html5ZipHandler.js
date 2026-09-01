/**
 * HTML5 Zip Handler for sandboxed content.
 *
 * Handles HTML5_ZIP and IMSCP_ZIP content types.
 * Provides SCORM shim for SCORM-based learning content.
 * Kolibri data API is provided by the base SandboxHandler.
 */
import SandboxHandler from 'kolibri-sandbox/SandboxHandler';
import SCORMShim from './SCORMShim';

export default class Html5ZipHandler extends SandboxHandler {
  /**
   * Shims required by HTML5 zip content.
   * - SCORM: For SCORM-based learning content
   * (Kolibri data API is provided by SandboxHandler.baseShims)
   */
  static shims = [SCORMShim];

  constructor(sandbox) {
    super(sandbox);
    // The SCORM spec has content walk up the frame chain with ScanForAPI, but content
    // commonly shortcuts to window.parent.API, because a conventional LMS frames the SCO
    // directly. The sandbox window is that parent, so the API goes on it as well as on
    // the content window.
    this.shims[SCORMShim.shimName].iframeInitialize(window);
  }

  /**
   * Initialize the iframe with HTML5 zip content.
   * @param {HTMLIFrameElement} iframe - The content iframe
   * @param {string} startUrl - URL to the content entry point (zip file URL)
   * @returns {Promise<void>}
   */
  async init(iframe, startUrl) {
    return new Promise((resolve, reject) => {
      // Set up the onload handler
      iframe.onload = () => {
        const error = iframe.contentDocument?.head?.querySelector('meta[name="sandbox-error"]');
        if (error) {
          reject(new Error(error.getAttribute('content')));
        } else {
          resolve();
        }
      };

      iframe.onerror = () => {
        reject(new Error('Failed to load content'));
      };

      // Navigate to the content URL
      iframe.src = startUrl;
    });
  }
}
