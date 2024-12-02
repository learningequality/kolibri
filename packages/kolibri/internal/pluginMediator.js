import Vue from 'vue';
import logging from 'kolibri-logging';
import scriptLoader from 'kolibri/utils/scriptLoader';
import { RENDERER_SUFFIX } from 'kolibri/constants';
import { languageDirection, languageDirections, currentLanguage } from 'kolibri/utils/i18n';
import contentRendererMixin from '../components/internal/ContentRenderer/mixin';
import ContentRendererLoading from '../components/internal/ContentRenderer/ContentRendererLoading';
import ContentRendererError from '../components/internal/ContentRenderer/ContentRendererError';

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
  'registerContentRenderer',
  'loadDirectionalCSS',
  'ready',
];

function mergeMixin(component) {
  if (!component.mixins) {
    component.mixins = [];
  }
  component.mixins.push(contentRendererMixin);
  return component;
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
     * Keep track of all registered content renderers.
     */
    _contentRendererRegistry: {},
    /**
     * Keep track of urls for content renderers.
     */
    _contentRendererUrls: {},
    /**
     * Public ready method - called when plugins can start operating
     */
    ready() {
      this.registerMessages();
      this.registerAllContentRenderers();
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
        messageMap = JSON.parse(messageElement.innerHTML.trim());
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
     * A method for registering content renderers for asynchronous loading and track
     * which file types we have registered renderers for.
     * @param  {String} kolibriModuleName name of the module.
     * @param  {String[]} kolibriModuleUrls the URLs of the Javascript
     * files that constitute the kolibriModule
     * @param  {String[]} contentPresets the names of presets this content renderer can render
     */
    registerContentRenderer(kolibriModuleName, kolibriModuleUrls, contentPresets) {
      this._contentRendererUrls[kolibriModuleName] = kolibriModuleUrls;
      contentPresets.forEach(preset => {
        if (this._contentRendererRegistry[preset]) {
          logger.warn(`Kolibri Modules: Two content renderers are registering for ${preset}`);
        } else {
          this._contentRendererRegistry[preset] = kolibriModuleName;
          Vue.component(preset + RENDERER_SUFFIX, () => ({
            /* Check the Kolibri core app for a content renderer module that is able to
             * handle the rendering of the current content node.
             */
            component: this.retrieveContentRenderer(preset),
            // A component to use while the async component is loading
            loading: ContentRendererLoading,
            // A component to use if the load fails
            error: ContentRendererError,
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
     * A method for reading all templates that contain metadata about content renderers
     * and registering them.
     */
    registerAllContentRenderers() {
      const contentRendererElements = Array.from(
        document.querySelectorAll('template[data-viewer]') || [],
      );
      for (const element of contentRendererElements) {
        const moduleName = element.getAttribute('data-viewer');
        try {
          const data = JSON.parse(element.innerHTML.trim());
          const presets = data.presets;
          const urls = data.urls;
          this.registerContentRenderer(moduleName, urls, presets);
        } catch (e) {
          logger.error(`Error parsing content renderer for ${moduleName}`);
        }
      }
    },

    /**
     * A method to retrieve a content renderer component.
     * @param  {String} preset    content preset
     * @return {Promise}          Promise that resolves with loaded content renderer Vue component
     */
    retrieveContentRenderer(preset) {
      return new Promise((resolve, reject) => {
        const kolibriModuleName = this._contentRendererRegistry[preset];
        if (!kolibriModuleName) {
          // Our content renderer registry does not have a renderer for this content preset.
          reject(`No registered content renderer available for preset: ${preset}`);
        } else if (this._kolibriModuleRegistry[kolibriModuleName]) {
          // There is a named renderer for this preset, and it is already loaded.
          resolve(mergeMixin(this._kolibriModuleRegistry[kolibriModuleName].rendererComponent));
        } else {
          // We have a content renderer for this, but it has not been loaded, so load it, and then
          // resolve the promise when it has been loaded.
          const urls = this._contentRendererUrls[kolibriModuleName].filter(
            url =>
              // By default we load CSS for the particular direction that the user interface
              // is set to so we filter CSS files that do not match the current language direction.
              // LTR CSS files are just end with .css, whereas RTL files end with .rtl.css
              (languageDirection === languageDirections.RTL &&
                url.includes(languageDirections.RTL)) ||
              (languageDirection === languageDirections.LTR &&
                !url.includes(languageDirections.RTL)) ||
              !url.endsWith('css'),
          );
          Promise.all(urls.map(scriptLoader))
            // Load all the urls that we just filtered (all the javascript
            // and css files that we think we want by default).
            .then(scriptsArray => {
              // If we want to dynamically switch css, e.g. we loaded RTL css and later decide we
              // need LTR, we need to keep track of the script/link tags that we instantiated when
              // we loaded the css so that we can remove them from the DOM, and prevent a styling
              // collision from the two conflicting style sheets
              const storeTags = module => {
                // Function to keep track of the <link>/<script> tags for each URL.
                module.urlTags = {};
                urls.forEach((url, index) => {
                  // Key by URL and then track the DOM node returned from the scriptLoader
                  module.urlTags[url] = scriptsArray[index];
                });
              };
              // Either store them immediately on the module, if it is loaded
              if (this._kolibriModuleRegistry[kolibriModuleName]) {
                storeTags(this._kolibriModuleRegistry[kolibriModuleName]);
                resolve(
                  mergeMixin(this._kolibriModuleRegistry[kolibriModuleName].rendererComponent),
                );
              } else {
                // Or wait until the module has been registered
                this.on('kolibri_register', moduleName => {
                  if (moduleName === kolibriModuleName) {
                    storeTags(this._kolibriModuleRegistry[kolibriModuleName]);
                    resolve(
                      mergeMixin(this._kolibriModuleRegistry[kolibriModuleName].rendererComponent),
                    );
                  }
                });
              }
            })
            .catch(error => {
              logger.error('Kolibri Modules: ' + error);
              reject('Content renderer failed to load properly');
            });
        }
      });
    },
    /*
     * Method to load the direction specific CSS for a particular content renderer
     * @param {ContentRendererModule} contentRendererModule The content renderer module to load the
     * css for
     * @param {String} direction Must be one of languageDirections.RTL or LTR
     * @return {Promise} Promise that resolves when new CSS has loaded
     */
    loadDirectionalCSS(contentRendererModule, direction) {
      return new Promise((resolve, reject) => {
        if (!contentRendererModule.urlTags) {
          reject(`${contentRendererModule.name} has not already loaded - improper method call`);
        }
        const urls = this._contentRendererUrls[contentRendererModule.name];
        // Find the URL for the specified direction
        // Note that this will only work if we have one CSS file per module - which is
        // currently the case
        const cssUrl = urls.find(
          url =>
            (direction === languageDirections.RTL && url.includes(languageDirections.RTL)) ||
            (direction === languageDirections.LTR &&
              !url.includes(languageDirections.RTL) &&
              url.endsWith('css')),
        );
        // Find the URL for the direction not specified
        const otherCssUrl = urls.find(
          url =>
            (direction !== languageDirections.RTL && url.includes(languageDirections.RTL)) ||
            (direction !== languageDirections.LTR &&
              !url.includes(languageDirections.RTL) &&
              url.endsWith('css')),
        );
        if (!cssUrl || contentRendererModule.urlTags[cssUrl]) {
          // There is no css file to try to load or
          // this css file is already loaded and in the DOM, nothing to do.
          resolve();
        } else {
          // First unload the other direction CSS from the DOM
          if (contentRendererModule.urlTags[otherCssUrl]) {
            contentRendererModule.urlTags[otherCssUrl].remove();
            delete contentRendererModule.urlTags[otherCssUrl];
          }
          // Now load the new CSS and keep track of it for future unloading.
          scriptLoader(cssUrl).then(tag => {
            contentRendererModule.urlTags[cssUrl] = tag;
            resolve();
          });
        }
      });
    },
  };
  publicMethods.forEach(method => {
    facade[method] = mediator[method].bind(mediator);
  });
  return mediator;
}
