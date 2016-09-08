/*
 * This file defines the API for the core Kolibri app.
 */

// module must be specified, requireName is optional.
// module can be used alone to map a Kolibri module into the API.
// requireName can be used additionally to expose this module to requires in other plugins.
// By default any module specified with both and included with a relative (rather than absolute)
// path will be aliased to allow short hand references. Obviously, this is not needed for
// modules already in node_modules.
//
// N.B. You cannot use keys that require quotation marks in this object.
// e.g. 'content-icon' (although this can be used as a value in requireName or module).

const keys = [
  'module', // Require statement for the module.
  'requireName', // Use to indicate the name this module can be 'required' as from other plugins.
];

const apiSpec = {
  lib: {
    logging: {
      requireName: 'logging',
      module: require('../logging'),
    },
    vue: {
      requireName: 'vue',
      module: require('vue'),
    },
    vuex: {
      requireName: 'vuex',
      module: require('vuex'),
    },
    jscookie: {
      requireName: 'js-cookie',
      module: require('js-cookie'),
    },
    conditionalPromise: {
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
      contentRender: {
        module: require('../vue/content-renderer'),
      },
      downloadButton: {
        module: require('../vue/content-renderer/download-button'),
      },
      loadingSpinner: {
        module: require('../vue/loading-spinner'),
      },
      progressBar: {
        module: require('../vue/progress-bar'),
      },
      contentIcon: {
        module: require('../vue/content-icon'),
      },
      coreBase: {
        module: require('../vue/core-base'),
      },
      navBarItem: {
        module: require('../vue/nav-bar/nav-bar-item'),
        requireName: 'nav-bar-item',
      },
      iconButton: {
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
    navBarItem: {
      requireName: 'nav-bar-item.styl',
      module: require('../vue/nav-bar/nav-bar-item.styl'),
    },
    coreTheme: {
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
