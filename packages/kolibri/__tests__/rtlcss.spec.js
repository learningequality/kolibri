import { languageDirections } from 'kolibri/utils/i18n';

// Use a variable to control the mocked languageDirection value
let mockLanguageDirection = languageDirections.LTR;

jest.mock('kolibri/utils/i18n', () => {
  const actual = jest.requireActual('kolibri/utils/i18n');
  return {
    ...actual,
    get languageDirection() {
      return mockLanguageDirection;
    },
  };
});

// Re-import after mock setup so each test gets a fresh RTLManager
let rtlManager;

describe('RTLManager', () => {
  beforeEach(() => {
    // Reset mock direction to LTR
    mockLanguageDirection = languageDirections.LTR;
    // Clear any link elements from previous tests
    document.querySelectorAll('link[data-webpack-bundle]').forEach(el => el.remove());
    // Fresh RTLManager for each test
    jest.resetModules();
    return import('../rtlcss.js').then(mod => {
      rtlManager = mod.rtlManager;
    });
  });
  describe('registerBundleCSS and loadRegisteredBundleCSS', () => {
    it('creates tagged link elements for LTR CSS when direction is LTR', () => {
      mockLanguageDirection = languageDirections.LTR;

      rtlManager.registerBundleCSS('test-viewer', ['/static/viewer.css', '/static/viewer.rtl.css']);
      rtlManager.loadRegisteredBundleCSS('test-viewer');

      const links = document.querySelectorAll('link[data-webpack-bundle="test-viewer"]');
      expect(links).toHaveLength(1);
      expect(links[0].href).toContain('/static/viewer.css');
      expect(links[0].href).not.toContain('.rtl.css');
    });

    it('creates tagged link elements for RTL CSS when direction is RTL', () => {
      mockLanguageDirection = languageDirections.RTL;

      rtlManager.registerBundleCSS('test-viewer', ['/static/viewer.css', '/static/viewer.rtl.css']);
      rtlManager.loadRegisteredBundleCSS('test-viewer');

      const links = document.querySelectorAll('link[data-webpack-bundle="test-viewer"]');
      expect(links).toHaveLength(1);
      expect(links[0].href).toContain('.rtl.css');
    });

    it('stores only LTR URLs from the registered set', () => {
      rtlManager.registerBundleCSS('test-viewer', [
        '/static/chunk1.css',
        '/static/chunk1.rtl.css',
        '/static/chunk2.css',
        '/static/chunk2.rtl.css',
      ]);

      expect(rtlManager.bundleCSSUrls.get('test-viewer')).toEqual([
        '/static/chunk1.css',
        '/static/chunk2.css',
      ]);
    });

    it('creates links for multiple CSS files', () => {
      rtlManager.registerBundleCSS('multi-css', [
        '/static/chunk1.css',
        '/static/chunk1.rtl.css',
        '/static/chunk2.css',
        '/static/chunk2.rtl.css',
      ]);
      rtlManager.loadRegisteredBundleCSS('multi-css');

      const links = document.querySelectorAll('link[data-webpack-bundle="multi-css"]');
      expect(links).toHaveLength(2);
    });
  });

  describe('enableRTL switches direction for registered bundle CSS', () => {
    beforeEach(() => {
      mockLanguageDirection = languageDirections.LTR;
      rtlManager.registerBundleCSS('test-viewer', ['/static/viewer.css', '/static/viewer.rtl.css']);
      rtlManager.loadRegisteredBundleCSS('test-viewer');

      // Stub requestAnimationFrame for reloadBundleCSS swap path
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());
    });

    afterEach(() => {
      window.requestAnimationFrame.mockRestore();
    });

    it('swaps LTR link to RTL link', async () => {
      await rtlManager.enableRTL('test-viewer');

      const links = document.querySelectorAll('link[data-webpack-bundle="test-viewer"]');
      expect(links).toHaveLength(1);
      expect(links[0].href).toContain('.rtl.css');
    });

    it('is a no-op when already RTL', async () => {
      await rtlManager.enableRTL('test-viewer');
      const linksAfterFirst = document.querySelectorAll('link[data-webpack-bundle="test-viewer"]');
      const href = linksAfterFirst[0].href;

      await rtlManager.enableRTL('test-viewer');
      const linksAfterSecond = document.querySelectorAll('link[data-webpack-bundle="test-viewer"]');
      expect(linksAfterSecond).toHaveLength(1);
      expect(linksAfterSecond[0].href).toBe(href);
    });
  });

  describe('disableRTL switches direction for registered bundle CSS', () => {
    beforeEach(() => {
      mockLanguageDirection = languageDirections.RTL;
      rtlManager.registerBundleCSS('test-viewer', ['/static/viewer.css', '/static/viewer.rtl.css']);
      rtlManager.loadRegisteredBundleCSS('test-viewer');

      jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb());
    });

    afterEach(() => {
      window.requestAnimationFrame.mockRestore();
    });

    it('swaps RTL link to LTR link', async () => {
      await rtlManager.disableRTL('test-viewer');

      const links = document.querySelectorAll('link[data-webpack-bundle="test-viewer"]');
      expect(links).toHaveLength(1);
      expect(links[0].href).not.toContain('.rtl.css');
    });
  });

  describe('reloadBundleCSS race condition', () => {
    it('preserves old CSS link when new CSS fails to load', async () => {
      mockLanguageDirection = languageDirections.LTR;
      rtlManager.registerBundleCSS('fail-viewer', ['/static/viewer.css']);
      rtlManager.loadRegisteredBundleCSS('fail-viewer');

      // Collect rAF callbacks without executing them, so onerror can fire first
      const rAFCallbacks = [];
      jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => rAFCallbacks.push(cb));

      rtlManager.bundleStates.set('fail-viewer', true);
      const reloadPromise = rtlManager.reloadBundleCSS('fail-viewer');

      // Simulate onerror on the new link before rAF callbacks run
      const newLink = document.querySelectorAll('link[data-webpack-bundle="fail-viewer"]')[1];
      newLink.onerror();

      // Now run the deferred rAF callbacks — the errored flag should prevent old link removal
      rAFCallbacks.forEach(cb => cb());

      await expect(reloadPromise).rejects.toThrow('Failed to load');

      // Old link should still be in the DOM
      const remainingLinks = document.querySelectorAll('link[data-webpack-bundle="fail-viewer"]');
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0].href).toContain('/static/viewer.css');
      expect(remainingLinks[0].href).not.toContain('.rtl.css');

      window.requestAnimationFrame.mockRestore();
    });
  });
});
