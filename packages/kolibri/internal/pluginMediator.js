import Vue from 'vue';
import logging from 'kolibri-logging';
import scriptLoader from 'kolibri/utils/scriptLoader';
import { languageDirections, currentLanguage } from 'kolibri/utils/i18n';
import { rtlManager } from 'kolibri/rtlcss';
import ContentViewerLoading from '../components/internal/ContentViewer/ContentViewerLoading';
import ContentViewerError from '../components/internal/ContentViewer/ContentViewerError';

/**
 * @typedef {import('kolibri-module').default} KolibriModule
 */

const VIEWER_SUFFIX = '_viewer';
const DOM_VIEWER_SUFFIX = '_dom_viewer';

const logger = logging.getLogger(__filename);

/**
 * Array containing the names of all methods of the Mediator that
 * should be exposed publicly through the Facade.
 * @type {string[]}
 */
const publicMethods = [
  'registerKolibriModuleSync',
  'registerLanguageAssets',
  'registerContentViewer',
  'loadDirectionalCSS',
  'ready',
  'presetViewerComponent',
  'elementViewerComponent',
  'canHandleElement',
  'objectViewerMimetypes',
];

const domParser = new DOMParser();

/*
 * JSON data that we read from Django have been passed through
 * Django's marksafe function that escapes any HTML characters.
 * Use the DOMParser to decode these before we read parse the JSON.
 */
function decodeMarkedSafeText(text) {
  const dom = domParser.parseFromString(text, 'text/html');
  return dom.documentElement.textContent;
}

export default function pluginMediatorFactory(facade) {
  /**
   * The Mediator object - registers and loads kolibri_modules.
   */
  const mediator = {
    /**
     * Keep track of all registered kolibri_modules - object is of form:
     * kolibriModuleName: kolibri_module_object
     */
    _kolibriModuleRegistry: {},

    // wait to call kolibri_module `ready` until dependencies are loaded
    _ready: false,

    /**
     * Callbacks to invoke when the mediator becomes ready. Accumulated via
     * registerKolibriModuleSync() when _ready is false; flushed by setReady().
     * @type {Function[]}
     */
    _readyCallbacks: [],

    /**
     * Map from kolibriModule name to an array of pending callbacks. Callbacks
     * are queued in retrieveContentViewer() when the module has not yet
     * registered; flushed and removed in registerKolibriModuleSync().
     * @type {{[key: string]: Function[]}}
     */
    _contentViewerCallbacks: {},

    /**
     * Keep track of all registered language assets for modules.
     * kolibriModuleName: {object} - with keys for different languages.
     */
    _languageAssetRegistry: {},

    /**
     * Keep track of all registered content viewers.
     */
    _contentViewerRegistry: {},
    /**
     * Keep track of urls for content viewers.
     */
    _contentViewerUrls: {},
    /**
     * Public ready method - called when plugins can start operating
     */
    ready() {
      this.registerMessages();
      this.registerAllContentViewers();
      this.setReady();
    },

    /**
     * Mark the mediator as ready and flush all pending ready callbacks.
     */
    setReady() {
      this._ready = true;
      this._readyCallbacks.splice(0).forEach(cb => cb());
    },

    /**
     * Registers a kolibriModule that has already been loaded into the
     * frontend. Flushes any pending content viewer callbacks for the module, then
     * calls kolibriModule.ready() immediately if the mediator is ready, or defers it
     * until setReady() is called.
     * @param {KolibriModule} kolibriModule - The freshly loaded module instance to register
     */
    registerKolibriModuleSync(kolibriModule) {
      this._kolibriModuleRegistry[kolibriModule.name] = kolibriModule;

      logger.info(`Kolibri Modules: ${kolibriModule.name} registered`);

      const callbacks = this._contentViewerCallbacks[kolibriModule.name];
      if (callbacks) {
        callbacks.forEach(cb => cb(kolibriModule));
        delete this._contentViewerCallbacks[kolibriModule.name];
      }

      if (this._ready) {
        kolibriModule.ready();
      } else {
        this._readyCallbacks.push(() => kolibriModule.ready());
      }
    },

    /**
     * A method for directly registering language assets on the mediator.
     * This is used to set language assets as loaded and register them to the Vue intl
     * translation apparatus.
     * @param {string} moduleName - Module whose embedded translation template should be parsed
     * and registered
     */
    registerLanguageAssets(moduleName) {
      const messageElement = document.querySelector(`template[data-i18n="${moduleName}"]`);
      if (!messageElement) {
        return;
      }
      let messageMap;
      try {
        messageMap = JSON.parse(decodeMarkedSafeText(messageElement.innerHTML.trim()));
      } catch (e) {
        logger.error(`Error parsing language assets for ${moduleName}`);
      }
      if (!messageMap || typeof messageMap !== 'object') {
        logger.error(`Error parsing language assets for ${moduleName}`);
        return;
      }
      if (!Vue.registerMessages) {
        // Set this messageMap so that we can register it later when VueIntl
        // has finished loading.
        // Create empty entry in the language asset registry for this module if needed
        this._languageAssetRegistry[moduleName] = messageMap;
      } else {
        Vue.registerMessages(currentLanguage, messageMap);
      }
    },
    /**
     * A method for taking all registered language assets and registering them against Vue Intl.
     */
    registerMessages() {
      for (const moduleName in this._languageAssetRegistry) {
        Vue.registerMessages(currentLanguage, this._languageAssetRegistry[moduleName]);
      }
      delete this._languageAssetRegistry;
    },
    _registerViewerType(kolibriModuleName, items, suffix) {
      for (const item of items) {
        const registryKey = item + suffix;
        if (!this._contentViewerRegistry[suffix]) {
          this._contentViewerRegistry[suffix] = {};
        }
        const registry = this._contentViewerRegistry[suffix];
        if (registry[item]) {
          logger.warn(`Kolibri Modules: Two content viewers are registering for ${registryKey}`);
          continue;
        }
        registry[item] = () => ({
          component: this.retrieveContentViewer(kolibriModuleName),
          loading: ContentViewerLoading,
          error: ContentViewerError,
          delay: 0,
          timeout: 30000,
        });
      }
    },

    /**
     * A method for registering content viewers for asynchronous loading and track
     * which file types we have registered viewers for.
     * @param {string} kolibriModuleName - Identifier of the module that provides the viewer
     * @param {string[]} kolibriModuleUrls - the URLs of the Javascript
     * files that constitute the kolibriModule
     * @param {string[]} contentPresets - the names of presets this content viewer can render
     * @param {string[]} domTags - DOM tags handled
     */
    registerContentViewer(kolibriModuleName, kolibriModuleUrls, contentPresets = [], domTags = []) {
      this._contentViewerUrls[kolibriModuleName] = kolibriModuleUrls;

      this._registerViewerType(kolibriModuleName, contentPresets, VIEWER_SUFFIX);
      this._registerViewerType(kolibriModuleName, domTags, DOM_VIEWER_SUFFIX);
    },

    /**
     * A method for reading all templates that contain metadata about content viewers
     * and registering them.
     */
    registerAllContentViewers() {
      const contentViewerElements = Array.from(
        document.querySelectorAll('template[data-viewer]') || [],
      );
      for (const element of contentViewerElements) {
        const moduleName = element.getAttribute('data-viewer');
        try {
          const data = JSON.parse(decodeMarkedSafeText(element.innerHTML.trim()));
          this.registerContentViewer(moduleName, data.urls, data.presets, data.css_selectors);
        } catch (e) {
          logger.error(`Error parsing content viewer for ${moduleName}`);
        }
      }
    },

    /**
     * A method to retrieve a content viewer component.
     * @param {string} kolibriModuleName - module providing the viewer
     * @returns {Promise} Promise that resolves with loaded content viewer Vue component
     */
    retrieveContentViewer(kolibriModuleName) {
      return new Promise((resolve, reject) => {
        function resolveComponent(module) {
          if (module.viewerComponent) {
            resolve(module.viewerComponent);
          } else {
            reject(
              `Content viewer registered but no viewerComponent found in module ${kolibriModuleName}`,
            );
          }
        }
        if (!kolibriModuleName) {
          reject(`No registered content viewer available for: kolibriModuleName`);
        } else if (this._kolibriModuleRegistry[kolibriModuleName]) {
          // There is a named viewer for this preset, and it is already loaded.
          resolveComponent(this._kolibriModuleRegistry[kolibriModuleName]);
        } else {
          // We have a content viewer for this, but it has not been loaded, so load it, and then
          // resolve the promise when it has been loaded.
          const allUrls = this._contentViewerUrls[kolibriModuleName];
          const cssUrls = allUrls.filter(url => url.endsWith('css'));
          const jsUrls = allUrls.filter(url => !url.endsWith('css'));
          // Register CSS URLs with rtlManager so it can create tagged link elements
          // and switch direction later via the same loadDirectionalCSS code path.
          rtlManager.registerBundleCSS(kolibriModuleName, cssUrls);
          rtlManager.loadRegisteredBundleCSS(kolibriModuleName);
          Promise.all(jsUrls.map(scriptLoader))
            .then(() => {
              if (this._kolibriModuleRegistry[kolibriModuleName]) {
                resolveComponent(this._kolibriModuleRegistry[kolibriModuleName]);
              } else {
                // Wait until the module has been registered
                if (!this._contentViewerCallbacks[kolibriModuleName]) {
                  this._contentViewerCallbacks[kolibriModuleName] = [];
                }
                this._contentViewerCallbacks[kolibriModuleName].push(module => {
                  resolveComponent(module);
                });
              }
            })
            .catch(error => {
              logger.error('Kolibri Modules: ' + error);
              reject('Content viewer failed to load properly');
            });
        }
      });
    },
    /**
     * Get a viewer component for a preset
     * @param {string} preset - Content preset name
     * @returns {Function|null} Component resolver function or null
     */
    presetViewerComponent(preset) {
      const viewerRegistry = this._contentViewerRegistry[VIEWER_SUFFIX];
      return viewerRegistry?.[preset] || null;
    },

    /**
     * Get a viewer component for a DOM element
     * @param {?HTMLElement} element - DOM element, or null on the contentNode path
     * @returns {Function|null} Component resolver function or null
     */
    elementViewerComponent(element) {
      if (!element) {
        return null;
      }
      const domViewerRegistry = this._contentViewerRegistry[DOM_VIEWER_SUFFIX];
      if (!domViewerRegistry) {
        return null;
      }

      // Check each registered selector to find a match
      for (const [selector, component] of Object.entries(domViewerRegistry)) {
        if (element.matches(selector)) {
          return component;
        }
      }

      return null;
    },

    /**
     * Check if an element can be handled by any registered content viewer
     * @param {?HTMLElement} element - DOM element to check, or null
     * @returns {boolean} True if element can be handled
     */
    canHandleElement(element) {
      if (!element) {
        return false;
      }
      const domViewerRegistry = this._contentViewerRegistry[DOM_VIEWER_SUFFIX];
      if (!domViewerRegistry) {
        return false;
      }

      const allSelectors = Object.keys(domViewerRegistry).join(',');
      return allSelectors && element.matches(allSelectors);
    },

    /**
     * Get the MIME types handled by registered content viewers via their
     * object[type="..."] selectors.
     * @returns {string[]} Handled object MIME types
     */
    objectViewerMimetypes() {
      const domViewerRegistry = this._contentViewerRegistry[DOM_VIEWER_SUFFIX];
      if (!domViewerRegistry) {
        return [];
      }
      const mimetypes = [];
      for (const selector of Object.keys(domViewerRegistry)) {
        const match = selector.match(/^object\[type=["']?([^"'\]]+)["']?\]$/);
        if (match) {
          mimetypes.push(match[1]);
        }
      }
      return mimetypes;
    },

    /*
     * Method to load the direction specific CSS for a particular content viewer
     * @param {ContentViewerModule} contentViewerModule The content viewer module to load the
     * css for
     * @param {String} direction Must be one of languageDirections.RTL or LTR
     * @return {Promise} Promise that resolves when new CSS has loaded
     */
    loadDirectionalCSS(contentViewerModule, direction) {
      // Use the RTL manager to dynamically switch CSS direction for webpack bundles.
      // The RTL manager handles all CSS files for the bundle, not just a single file.
      const bundleName = contentViewerModule.name;

      if (direction === languageDirections.RTL) {
        return rtlManager.enableRTL(bundleName);
      } else if (direction === languageDirections.LTR) {
        return rtlManager.disableRTL(bundleName);
      } else {
        return Promise.reject(`Invalid direction: ${direction}`);
      }
    },
  };
  publicMethods.forEach(method => {
    facade[method] = mediator[method].bind(mediator);
  });
  return mediator;
}
