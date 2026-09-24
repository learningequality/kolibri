/**
 * HTML5 Zip Handler for sandboxed content.
 *
 * Handles HTML5_ZIP and IMSCP_ZIP content types.
 * Provides SCORM shim for SCORM-based learning content.
 */
import SandboxHandler from 'kolibri-sandbox/SandboxHandler';
import SCORMShim from './SCORMShim';
import KolibriShim from './KolibriShim';

export default class Html5ZipHandler extends SandboxHandler {
  /**
   * Shims required by HTML5 zip content.
   * - SCORM: For SCORM-based learning content
   * - Kolibri: the window.kolibri data API, which a custom channel's host answers
   */
  static shims = [SCORMShim, KolibriShim];

  /**
   * Initialize the iframe with HTML5 zip content.
   * @param {HTMLIFrameElement} iframe - The content iframe
   * @param {string} startUrl - URL to the content entry point (zip file URL)
   * @returns {Promise<void>}
   */
  init(iframe, startUrl) {
    // An iframe fires load even for a failed navigation, rendering the error body, so
    // there is no load-failure path to reject from.
    return new Promise(resolve => {
      iframe.onload = () => resolve();
      // Navigate to the content URL
      iframe.src = startUrl;
    });
  }
}
