/*
 * This file defines the API for the core Kolibri app.
 */

// module must be specified.
// module maps a module into the API, at the specified path.
// By default any module specified will be aliased to allow for require statements
// namespaced in a way analogous to the API spec below.
//
// These modules will now be referenceable as e.g.: require('kolibri.lib.logging');
//
// N.B. You cannot use keys that require quotation marks in this object.
// e.g. 'content-icon' (although this can be used as a value in module).

module.exports = {
  keys: [
    'module', // Require statement for the module.
  ],

  apiSpec: {
    lib: {
      logging: {
        module: require('../logging'),
      },
      vue: {
        module: require('vue'),
      },
      vuex: {
        module: require('vuex'),
      },
      vueRouter: {
        module: require('vue-router'),
      },
      jscookie: {
        module: require('js-cookie'),
      },
      conditionalPromise: {
        module: require('../conditionalPromise'),
      },
    },
    coreVue: {
      vuex: {
        constants: {
          module: require('../constants'),
        },
        getters: {
          module: require('../core-getters'),
        },
        actions: {
          module: require('../core-actions'),
        },
        store: {
          module: require('../core-store'),
        },
      },
      components: {
        contentRenderer: {
          module: require('../vue/content-renderer'),
        },
        assessmentWrapper: {
          module: require('../vue/assessment-wrapper'),
        },
        exerciseAttempts: {
          module: require('../vue/exercise-attempts'),
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
        progressIcon: {
          module: require('../vue/progress-icon'),
        },
        coreBase: {
          module: require('../vue/core-base'),
        },
        coreModal: {
          module: require('../vue/core-modal'),
        },
        navBarItem: {
          module: require('../vue/nav-bar/nav-bar-item'),
        },
        iconButton: {
          module: require('../vue/icon-button'),
        },
        channelSwitcher: {
          module: require('../vue/channel-switcher'),
        },
      },
    },
    styles: {
      navBarItem: {
        module: require('../vue/nav-bar/nav-bar-item.styl'),
      },
      coreTheme: {
        module: require('../styles/core-theme.styl'),
      },
    },
  },
};
