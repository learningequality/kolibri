/*
 * This file defines the API for the core Kolibri app.
 */

// module must be specified, requireName is optional.
// module can be used alone to map a Kolibri module into the API.
// requireName can be used additionally to expose this module to requires in other plugins.
// By default any module specified with both and included with a relative (rather than absolute)
// path will be aliased to allow short hand references. Obviously, this is not needed for
// modules already in node_modules.

const keys = [
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
        requireName: 'core-store',
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
      'icon-button': {
        module: require('../vue/icon-button'),
        requireName: 'icon-button',
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

/* eslint-disable object-shorthand */
module.exports = {
  apiSpec: apiSpec,
  keys: keys,
};
/* eslint-enable */
