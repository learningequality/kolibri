/**
 * Core RTL (Right-to-Left) CSS management module.
 * Provides per-bundle RTL CSS loading and switching capabilities.
 *
 * This module is exposed globally and accessed by webpack bundles to enable
 * dynamic RTL/LTR CSS switching without page reloads.
 */

import { languageDirection, languageDirections } from 'kolibri/utils/i18n';

class RTLManager {
  constructor() {
    // Map of bundleId -> RTL state (boolean)
    this.bundleStates = new Map();
    // Map of bundleId -> array of LTR CSS URLs (registered for bundles loaded via pluginMediator)
    this.bundleCSSUrls = new Map();
  }

  /**
   * Register a webpack bundle for RTL management.
   * Called by webpack runtime code injected into each bundle.
   * @param {string} bundleId - The webpack bundle identifier (compilation.name).
   * @returns {object} Bundle-scoped API with miniCssF method for URL transformation.
   */
  registerBundle(bundleId) {
    if (!this.bundleStates.has(bundleId)) {
      const isRtl = languageDirection === languageDirections.RTL;
      this.bundleStates.set(bundleId, isRtl);
    }

    return {
      /**
       * Transform CSS URL based on current RTL state.
       * Called by webpack's miniCssF hook to transform chunk URLs.
       * @param {string} originalPath - Original CSS file path.
       * @returns {string} Transformed path (.rtl.css if RTL enabled).
       */
      miniCssF: originalPath => {
        if (!originalPath) return originalPath;
        return this.bundleStates.get(bundleId)
          ? originalPath.replace(/\.css($|\?)/, '.rtl.css$1')
          : originalPath;
      },
    };
  }

  /**
   * Register CSS URLs for a bundle so that enableRTL/disableRTL can
   * create initial link elements or switch direction for them.
   * @param {string} bundleId - Bundle identifier
   * @param {string[]} cssUrls - All CSS URLs for the bundle (both LTR and RTL variants)
   */
  registerBundleCSS(bundleId, cssUrls) {
    // Store LTR URLs as the canonical set — RTL URLs are derived by URL transformation.
    const ltrUrls = cssUrls.filter(url => !url.includes('.rtl.css'));
    this.bundleCSSUrls.set(bundleId, ltrUrls);
  }

  /**
   * Load CSS for a bundle using its registered URLs and the current direction.
   * Creates tagged link elements via reloadBundleCSS — the same code path
   * used by enableRTL/disableRTL for subsequent direction switches.
   * @param {string} bundleId - Bundle identifier (must have been registered via registerBundleCSS)
   */
  loadRegisteredBundleCSS(bundleId) {
    const isRtl = languageDirection === languageDirections.RTL;
    this.bundleStates.set(bundleId, isRtl);
    this.reloadBundleCSS(bundleId);
  }

  /**
   * Enable RTL mode for a bundle.
   * If CSS links already exist in the DOM, swaps them to RTL.
   * If no links exist but URLs are registered, creates them.
   * @param {string} bundleId - Bundle identifier
   * @returns {Promise<void>}
   */
  async enableRTL(bundleId) {
    if (this.bundleStates.get(bundleId)) return;
    this.bundleStates.set(bundleId, true);
    await this.reloadBundleCSS(bundleId);
  }

  /**
   * Disable RTL mode for a bundle.
   * If CSS links already exist in the DOM, swaps them to LTR.
   * If no links exist but URLs are registered, creates them.
   * @param {string} bundleId - Bundle identifier
   * @returns {Promise<void>}
   */
  async disableRTL(bundleId) {
    if (!this.bundleStates.get(bundleId)) return;
    this.bundleStates.set(bundleId, false);
    await this.reloadBundleCSS(bundleId);
  }

  /**
   * Reload all CSS for a bundle with the current direction.
   * If tagged link elements exist in the DOM, swaps their URLs.
   * If no tagged links exist but URLs were registered via registerBundleCSS,
   * creates new tagged link elements for the current direction.
   * @param {string} bundleId - Bundle identifier
   * @returns {Promise<void>}
   * @throws {Error} If CSS file fails to load
   */
  async reloadBundleCSS(bundleId) {
    const bundleLinks = document.querySelectorAll(
      `link[rel="stylesheet"][data-webpack-bundle="${bundleId}"]`,
    );

    if (bundleLinks.length === 0) {
      // No existing links — create them from registered URLs
      const ltrUrls = this.bundleCSSUrls.get(bundleId);
      if (ltrUrls) {
        const shouldBeRTL = this.bundleStates.get(bundleId);
        for (const ltrUrl of ltrUrls) {
          const href = shouldBeRTL ? ltrUrl.replace(/\.css($|\?)/, '.rtl.css$1') : ltrUrl;
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = 'text/css';
          link.href = href;
          link.setAttribute('data-webpack-bundle', bundleId);
          document.head.appendChild(link);
        }
      }
      return;
    }

    for (const link of bundleLinks) {
      const href = link.href;
      const isRTL = href.includes('.rtl.css');
      const shouldBeRTL = this.bundleStates.get(bundleId);

      // Only reload if direction needs to change
      if (isRTL !== shouldBeRTL) {
        const newHref = shouldBeRTL
          ? href.replace(/\.css($|\?)/, '.rtl.css$1')
          : href.replace(/\.rtl\.css($|\?)/, '.css$1');

        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = newHref;
        newLink.setAttribute('data-webpack-bundle', bundleId);

        // Insert new link before removing old one to prevent FOUC
        link.parentNode.insertBefore(newLink, link.nextSibling);

        await new Promise((resolve, reject) => {
          let errored = false;

          // Handle load errors - keep old CSS if new one fails
          newLink.onerror = () => {
            errored = true;
            newLink.remove();
            reject(new Error(`Failed to load ${newHref}`));
          };

          // Use double requestAnimationFrame to ensure CSS is applied
          // This is more reliable than onload for CSS link elements
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!errored) {
                link.remove();
                resolve();
              }
            });
          });
        });
      }
    }
  }
}

// Export singleton instance
export const rtlManager = new RTLManager();
