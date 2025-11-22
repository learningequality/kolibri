import Vue from 'vue';
import logging from 'kolibri-logging';
import scriptLoader from 'kolibri/utils/scriptLoader';
import { VIEWER_SUFFIX } from 'kolibri/constants';
import { languageDirections, currentLanguage } from 'kolibri/utils/i18n';
import { rtlManager } from 'kolibri/rtlcss';
import ContentViewerLoading from '../components/internal/ContentViewer/ContentViewerLoading';
import ContentViewerError from '../components/internal/ContentViewer/ContentViewerError';

const logger = logging.getLogger(__filename);

/**
 * Array containing the names of all methods of the Mediator that
 * should be exposed publicly through the Facade.
 * @type {string[]}
 */
const publicMethods = [
  'registerKolibriModuleSync',
  'stopListening',
  'emit',
  'on',
  'once',
  'off',
  'registerLanguageAssets',
  'registerContentViewer',
  'loadDirectionalCSS',
  'ready',
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
   * The Mediator object - registers and loads kolibri_modules and acts as
   * a global event dispatcher.
   */
  const mediator = {
    /**
     * Keep track of all registered kolibri_modules - object is of form:
     * kolibriModuleName: kolibri_module_object
     **/
    _kolibriModuleRegistry: {},

    /**
     * Keep track of all registered callbacks bound to events - this allows for easier
     * stopListening later.
     * kolibriModuleName: {object} - event: {object} - method: callback function
     **/
    _callbackRegistry: {},

    // we use a Vue object solely for its event functionality
    _eventDispatcher: new Vue(),

    // wait to call kolibri_module `ready` until dependencies are loaded
    _ready: false,

    /**
     * Keep track of all registered language assets for modules.
     * kolibriModuleName: {object} - with keys for different languages.
     **/
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
     * Trigger 'ready' function on all registered modules
     **/
    setReady() {
      this._ready = true;
      this.emit('ready');
    },

    /**
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @description Registers a kolibriModule that has already been loaded into the
     * frontend. Registers event listeners for multiple time and one time events.
     * When all event listeners have been registered, any buffered callbacks are passed
     * to the KolibriModule object, in case it was previously registered asynchronously.
     */
    registerKolibriModuleSync(kolibriModule) {
      // Register all events that will be called repeatedly.
      this._registerMultipleEvents(kolibriModule);
      // Register all events that are listened to once and then unbound.
      this._registerOneTimeEvents(kolibriModule);

      // Create an entry in the kolibriModule registry.
      this._kolibriModuleRegistry[kolibriModule.name] = kolibriModule;

      logger.info(`Kolibri Modules: ${kolibriModule.name} registered`);
      this.emit('kolibri_register', kolibriModule);
      if (this._ready) {
        kolibriModule.ready();
      } else {
        this._eventDispatcher.$once('ready', () => {
          kolibriModule.ready();
        });
      }
    },

    /**
     * Generic event registration method - inspects KolibriModule class for event
     * key and then registers all events with
     * specified event registration method
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @param {string} eventsKey - 'events' or 'once'
     * @param {Function} eventListenerMethod - Mediator.prototype._registerMultipleEvents or
     * Mediator.prototype._registerOneTimeEvents
     * @private
     */
    _registerEvents(kolibriModule, eventsKey, eventListenerMethod) {
      let events;
      const boundEventListenerMethod = eventListenerMethod.bind(this);
      // Prevent undefined errors, allow events hash to be either an object or a function.
      if (typeof kolibriModule[eventsKey] === 'undefined') {
        events = {};
      } else if (typeof kolibriModule[eventsKey] === 'function') {
        events = kolibriModule[eventsKey]();
      } else {
        events = kolibriModule[eventsKey];
      }
      for (let i = 0; i < Object.getOwnPropertyNames(events).length; i += 1) {
        const key = Object.getOwnPropertyNames(events)[i];
        boundEventListenerMethod(key, kolibriModule, events[key]);
      }
    },

    /**
     * Method to register events that will fire multiple times until unregistered.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @private
     */
    _registerMultipleEvents(kolibriModule) {
      this._registerEvents(kolibriModule, 'events', this._registerRepeatedEventListener);
    },

    /**
     * Method to register events that will fire only once.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @private
     */
    _registerOneTimeEvents(kolibriModule) {
      this._registerEvents(kolibriModule, 'once', this._registerOneTimeEventListener);
    },

    /**
     * Method to register a single repeating event for a particular kolibriModule
     * with a method of that kolibriModule as a
     * callback.
     * @param {string} event - the event name.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @param {string} method - the name of the method of the KolibriModule object.
     * @private
     */
    _registerRepeatedEventListener(event, kolibriModule, method) {
      this._registerEventListener(event, kolibriModule, method, this._eventDispatcher.$on);
    },

    /**
     * Method to register a single one time event for a particular kolibriModule
     * with a method of that kolibriModule as a callback.
     * @param {string} event - the event name.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @param {string} method - the name of the method of the KolibriModule object.
     * @private
     */
    _registerOneTimeEventListener(event, kolibriModule, method) {
      this._registerEventListener(event, kolibriModule, method, this._eventDispatcher.$once);
    },

    /**
     * Method to register either a one time or a multitime event and add it to the
     * callback registry of the Mediator object for easy clean up and stopListening
     * later.
     * @param {string} event - the event name.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @param {string} method - the name of the method of the KolibriModule object.
     * @param {Function} listenMethod - Backbone.Events.listenTo or Backbone.Events.listenToOnce
     * @private
     */
    _registerEventListener(event, kolibriModule, method, listenMethod) {
      // Create a function that calls the kolibriModule method, while setting
      // 'this' to the kolibriModule itself.
      function callback(...args) {
        kolibriModule[method].apply(kolibriModule, ...args);
      }
      if (typeof this._callbackRegistry[kolibriModule.name] === 'undefined') {
        this._callbackRegistry[kolibriModule.name] = {};
      }
      if (typeof this._callbackRegistry[kolibriModule.name][event] === 'undefined') {
        this._callbackRegistry[kolibriModule.name][event] = {};
      }
      // Keep track of this function to allow easy unbinding later.
      this._callbackRegistry[kolibriModule.name][event][method] = callback;
      listenMethod.apply(this._eventDispatcher, [event, callback]);
    },

    /**
     * Method to unbind event listeners once they have been registered.
     * @param {string} event - the event name.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @param {string} method - the name of the method of the KolibriModule object.
     */
    stopListening(event, kolibriModule, method) {
      // Allow an event to be unlistened to.
      const callback = ((this._callbackRegistry[kolibriModule.name] || {})[event] || {})[method];
      if (typeof callback !== 'undefined') {
        this._eventDispatcher.$off(event, callback);
        delete this._callbackRegistry[kolibriModule.name][event][method];
      }
    },

    /**
     * Proxy to the Vue object that is the global dispatcher.
     * Takes any arguments and passes them on.
     */
    emit(...args) {
      this._eventDispatcher.$emit(...args);
    },
    /**
     * Proxy to the Vue object that is the global dispatcher.
     * Takes any arguments and passes them on.
     */
    on(...args) {
      this._eventDispatcher.$on(...args);
    },
    /**
     * Proxy to the Vue object that is the global dispatcher.
     * Takes any arguments and passes them on.
     */
    once(...args) {
      this._eventDispatcher.$once(...args);
    },
    /**
     * Proxy to the Vue object that is the global dispatcher.
     * Takes any arguments and passes them on.
     */
    off(...args) {
      this._eventDispatcher.$off(...args);
    },
    /**
     * A method for directly registering language assets on the mediator.
     * This is used to set language assets as loaded and register them to the Vue intl
     * translation apparatus.
     * @param  {String} moduleName name of the module.
     * @param  {String} language   language code whose messages we are registering.
     * @param  {Object} messageMap an object with message id to message mappings.
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
    /**
     * A method for registering content viewers for asynchronous loading and track
     * which file types we have registered viewers for.
     * @param  {String} kolibriModuleName name of the module.
     * @param  {String[]} kolibriModuleUrls the URLs of the Javascript
     * files that constitute the kolibriModule
     * @param  {String[]} contentPresets the names of presets this content viewer can render
     */
    registerContentViewer(kolibriModuleName, kolibriModuleUrls, contentPresets) {
      this._contentViewerUrls[kolibriModuleName] = kolibriModuleUrls;
      contentPresets.forEach(preset => {
        if (this._contentViewerRegistry[preset]) {
          logger.warn(`Kolibri Modules: Two content viewers are registering for ${preset}`);
        } else {
          this._contentViewerRegistry[preset] = kolibriModuleName;
          Vue.component(preset + VIEWER_SUFFIX, () => ({
            /* Check the Kolibri core app for a content viewer module that is able to
             * handle the rendering of the current content node.
             */
            component: this.retrieveContentViewer(preset),
            // A component to use while the async component is loading
            loading: ContentViewerLoading,
            // A component to use if the load fails
            error: ContentViewerError,
            // Delay before showing the loading component.
            delay: 0,
            // The error component will be displayed if a timeout is
            // provided and exceeded.
            timeout: 30000,
          }));
        }
      });
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
          const presets = data.presets;
          const urls = data.urls;
          this.registerContentViewer(moduleName, urls, presets);
        } catch (e) {
          logger.error(`Error parsing content viewer for ${moduleName}`);
        }
      }
    },

    /**
     * A method to retrieve a content viewer component.
     * @param  {String} preset    content preset
     * @return {Promise}          Promise that resolves with loaded content viewer Vue component
     */
    retrieveContentViewer(preset) {
      return new Promise((resolve, reject) => {
        const kolibriModuleName = this._contentViewerRegistry[preset];
        function resolveComponent(module) {
          if (module.viewerComponent) {
            resolve(module.viewerComponent);
          } else {
            reject(
              `Content viewer registered for ${preset} but no viewerComponent found in module ${kolibriModuleName}`,
            );
          }
        }
        if (!kolibriModuleName) {
          // Our content viewer registry does not have a viewer for this content preset.
          reject(`No registered content viewer available for preset: ${preset}`);
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
                this.on('kolibri_register', moduleName => {
                  if (moduleName === kolibriModuleName) {
                    resolveComponent(this._kolibriModuleRegistry[kolibriModuleName]);
                  }
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
