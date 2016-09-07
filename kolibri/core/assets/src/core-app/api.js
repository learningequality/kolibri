/*
 * This file defines the API for the core Kolibri app.
 * Modules here will be resolved as external requires in any modules that reference them.
 */

const keys = [
// module must be specified, requireName is optional.
// module can be used alone to map a Kolibri module into the API.
// requireName can be used additionally to expose this module to requires in other plugins.

  'module', // Require statement for the module.
  'requireName', // Use to indicate the name this module can be 'required' as from other plugins.
];

const apiSpec = {
  lib: {
    'logging': {
      requireName: 'logging',
      module: require('../logging'),
    },
    'vue': {
      requireName: 'vue',
      module: require('vue'),
    },
    'vuex': {
      requireName: 'vuex',
      module: require('vuex'),
    },
    'js-cookie': {
      requireName: 'js-cookie',
      module: require('js-cookie'),
    },
    'conditionalPromise': {
      requireName: 'conditionalPromise',
      module: require('../conditionalPromise'),
    },
  },
  coreVue: {
    coreVuex: {
      constants: {
        requireName: 'core-constants',
        module: require('../constants'),
      },
      actions: {
        requireName: 'core-actions',
        module: require('../core-actions'),
      },
      store: {
        requireName: 'coreStore',
        module: require('../core-store'),
      },
    },
    components: {
      'content-render': {
        module: require('../vue/content-renderer'),
      },
      'download-button': {
        module: require('../vue/content-renderer/download-button'),
      },
      'loading-spinner': {
        module: require('../vue/loading-spinner'),
      },
      'progress-bar': {
        module: require('../vue/progress-bar'),
      },
      'content-icon': {
        module: require('../vue/content-icon'),
      },
      'core-base': {
        module: require('../vue/core-base'),
      },
      'nav-bar-item': {
        module: require('../vue/nav-bar/nav-bar-item'),
        requireName: 'nav-bar-item',
      },
    },
    router: {
      requireName: 'router',
      module: require('../router'),
    },
  },
  styles: {
    'nav-bar-item': {
      requireName: 'nav-bar-item.styl',
      module: require('../vue/nav-bar/nav-bar-item.styl'),
    },
    'core-theme': {
      module: require('../styles/core-theme.styl'),
      requireName: 'core-theme.styl',
    },
  },
};


const constructorExport = () => {
  /*
   * Function for building the object that populates the kolibri global object API.
   */
  const exportObj = {};
  const recurseObjectKeysAndImport = (obj, path = []) => {
    Object.keys(obj).forEach((key) => {
      if (keys.indexOf(key) === -1) {
        recurseObjectKeysAndImport(obj[key], path.concat(key));
      }
    });
    // Don't allow privileged keys in the top namespace, as, logically, that would overwrite
    // the global object.
    // Only module matters for actually building the kolibri global object.
    if (path.length && obj.module) {
      // Ensure the path exists in our export object
      // Iterate through each key in 'path', except the last one (the key for our import)
      // to return the nested object that we want to set our key into.
      const subExportObj = path.slice(0, -1).reduce((subobj, key) => {
        // On each step ensure that there is an object at that key.
        subobj[key] = subobj[key] || {};
        // Return that object for the next iteration to allow nesting.
        return subobj[key];
      }, exportObj); // Use exportObj as the initial value
      subExportObj[path.slice(-1)] = obj.module;
    }
  };
  recurseObjectKeysAndImport(apiSpec);
  return exportObj;
};

module.exports = {
  apiSpec,
  constructorExport,
};
