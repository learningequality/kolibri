import { RENDERER_SUFFIX } from '../content/constants';
import contentRendererMixin from '../content/mixin';
import scriptLoader from './scriptLoader';
import { languageDirections } from './i18n';

/**
 * Array containing the names of all methods of the Mediator that
 * should be exposed publicly through the Facade.
 * @type {string[]}
 */
const publicMethods = [
  'registerKolibriModuleAsync',
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

export default function pluginMediatorFactory({
  Vue,
  languageDirection = languageDirections.LTR,
  facade,
} = {}) {
  function mergeMixin(component) {
    return Vue.util.mergeOptions(contentRendererMixin, component);
  }
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
     * Keep track of all callbacks that have been fired for as yet unloaded modules.
     * kolibriModuleName: {Function[]} of callbacks
     **/
    _callbackBuffer: {},

    /**
     * Keep track of all registered callbacks bound to events - this allows for easier
     * stopListening later.
     * kolibriModuleName: {object} - event: {object} - method: callback function
     **/
    _callbackRegistry: {},

    /**
     * Keep track of all registered async callbacks bound to events - this allows for
     * easier stopListening later.
     * kolibriModuleName: {object[]} - with keys 'event' and 'callback'.
     **/
    _asyncCallbackRegistry: {},

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

      // Clear any previously bound asynchronous callbacks for this kolibriModule.
      this._clearAsyncCallbacks(kolibriModule);

      // Execute any callbacks that were called before the kolibriModule had loaded,
      // in the order that they happened.
      this._executeCallbackBuffer(kolibriModule);
      console.info(`Kolibri Modules: ${kolibriModule.name} registered`); // eslint-disable-line no-console
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
     * Finds all callbacks that were called before the kolibriModule was loaded
     * and registered synchronously and
     * executes them in order of creation.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @private
     */
    _executeCallbackBuffer(kolibriModule) {
      if (typeof this._callbackBuffer[kolibriModule.name] !== 'undefined') {
        this._callbackBuffer[kolibriModule.name].forEach(buffer => {
          // Do this to ensure proper 'this'ness.
          kolibriModule[buffer.method](...buffer.args);
        });
        delete this._callbackBuffer[kolibriModule.name];
      }
    },

    /**
     * Registers a kolibriModule before it has been loaded into the page. Buffers
     * any events that are fired, causing the
     * arguments to be saved in the callback buffer array for this kolibriModule.
     * @param {string} kolibriModuleName - the name of the kolibriModule
     * @param {string[]} kolibriModuleUrls - the URLs of the Javascript and CSS
     * files that constitute the kolibriModule
     * @param {object} events - key, value pairs of event names and methods for
     * repeating callbacks.
     * @param {object} once - key value pairs of event names and methods for one
     * time callbacks.
     */
    registerKolibriModuleAsync(kolibriModuleName, kolibriModuleUrls, events, once) {
      const self = this;
      // Create a buffer for events that are fired before a kolibriModule has
      // loaded. Keep track of the method and the arguments passed to the callback.
      this._callbackBuffer[kolibriModuleName] = [];
      const callbackBuffer = this._callbackBuffer[kolibriModuleName];
      // Look at all events, whether listened to once or multiple times.
      const eventArray = [];
      for (let i = 0; i < Object.getOwnPropertyNames(events).length; i += 1) {
        const key = Object.getOwnPropertyNames(events)[i];
        eventArray.push([key, events[key]]);
      }
      for (let i = 0; i < Object.getOwnPropertyNames(once).length; i += 1) {
        const key = Object.getOwnPropertyNames(once)[i];
        eventArray.push([key, once[key]]);
      }
      if (typeof this._asyncCallbackRegistry[kolibriModuleName] === 'undefined') {
        this._asyncCallbackRegistry[kolibriModuleName] = [];
      }
      eventArray.forEach(tuple => {
        const key = tuple[0];
        const value = tuple[1];
        // Create a callback function that will push objects to the callback buffer,
        // and also cause loading of the the frontend assets that the kolibriModule
        // needs, should an event it is listening for be emitted.
        const callback = (...args) => {
          const promise = new Promise((resolve, reject) => {
            // First check that the kolibriModule hasn't already been loaded.
            if (typeof self._kolibriModuleRegistry[kolibriModuleName] === 'undefined') {
              // Add the details about the event callback to the buffer.
              callbackBuffer.push({
                args,
                method: value,
              });
              // Load all the kolibriModule files.
              Promise.all(kolibriModuleUrls.map(scriptLoader))
                .then(() => {
                  resolve();
                })
                .catch(() => {
                  const errorText = `Kolibri Modules: ${kolibriModuleName} failed to load`;
                  console.error(errorText); // eslint-disable-line no-console
                  reject(errorText);
                });
              // Start fetching any language assets that this module might need also.
              this._fetchLanguageAssets(kolibriModuleName, Vue.locale);
            }
          });
          return promise;
        };
        // Listen to the event and call the above function
        self._eventDispatcher.$on(key, callback);
        // Keep track of all these functions for easy cleanup after
        // the kolibriModule has been loaded.
        self._asyncCallbackRegistry[kolibriModuleName].push({
          event: key,
          callback,
        });
      });
    },

    /**
     * Function to unbind and remove all callbacks created by the registerKolibriModuleAsync method.
     * @param {KolibriModule} kolibriModule - object of KolibriModule class
     * @private
     */
    _clearAsyncCallbacks(kolibriModule) {
      (this._asyncCallbackRegistry[kolibriModule.name] || []).forEach(async => {
        this._eventDispatcher.$off(async.event, async.callback);
      });
      delete this._asyncCallbackRegistry[kolibriModule.name];
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
    registerLanguageAssets(moduleName, language, messageMap) {
      if (!Vue.registerMessages) {
        // Set this messageMap so that we can register it later when VueIntl
        // has finished loading.
        // Create empty entry in the language asset registry for this module if needed
        this._languageAssetRegistry[moduleName] = this._languageAssetRegistry[moduleName] || {};
        this._languageAssetRegistry[moduleName][language] = messageMap;
      } else {
        Vue.registerMessages(language, messageMap);
      }
    },
    /**
     * A method for taking all registered language assets and registering them against Vue Intl.
     */
    registerMessages() {
      Object.keys(this._languageAssetRegistry).forEach(moduleName => {
        Object.keys(this._languageAssetRegistry[moduleName]).forEach(language => {
          Vue.registerMessages(language, this._languageAssetRegistry[moduleName][language]);
        });
      });
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
          console.warn(`Kolibri Modules: Two content renderers are registering for ${preset}`); // eslint-disable-line no-console
        } else {
          this._contentRendererRegistry[preset] = kolibriModuleName;
          Vue.component(preset + RENDERER_SUFFIX, () => ({
            /* Check the Kolibri core app for a content renderer module that is able to
             * handle the rendering of the current content node.
             */
            component: this.retrieveContentRenderer(preset),
            // A component to use while the async component is loading
            loading: Vue.options.components['ContentRendererLoading'],
            // A component to use if the load fails
            error: Vue.options.components['ContentRendererError'],
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
              !url.endsWith('css')
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
                  mergeMixin(this._kolibriModuleRegistry[kolibriModuleName].rendererComponent)
                );
              } else {
                // Or wait until the module has been registered
                this.on('kolibri_register', moduleName => {
                  if (moduleName === kolibriModuleName) {
                    storeTags(this._kolibriModuleRegistry[kolibriModuleName]);
                    resolve(
                      mergeMixin(this._kolibriModuleRegistry[kolibriModuleName].rendererComponent)
                    );
                  }
                });
              }
            })
            .catch(error => {
              console.error('Kolibri Modules: ' + error); // eslint-disable-line no-console
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
              url.endsWith('css'))
        );
        // Find the URL for the direction not specified
        const otherCssUrl = urls.find(
          url =>
            (direction !== languageDirections.RTL && url.includes(languageDirections.RTL)) ||
            (direction !== languageDirections.LTR &&
              !url.includes(languageDirections.RTL) &&
              url.endsWith('css'))
        );
        if (contentRendererModule.urlTags[cssUrl]) {
          // This css file is already loaded and in the DOM, nothing to do.
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
