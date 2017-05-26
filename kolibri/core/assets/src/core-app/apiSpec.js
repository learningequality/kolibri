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
      conditionalPromise: {
        module: require('../conditionalPromise'),
      },
      apiResource: {
        module: require('../api-resource'),
      },
      seededshuffle: {
        module: require('seededshuffle'),
      },
    },
    coreVue: {
      vuex: {
        constants: {
          module: require('../constants'),
        },
        getters: {
          module: require('../state/getters'),
        },
        actions: {
          module: require('../state/actions'),
        },
        store: {
          module: require('../state/store'),
        },
        mappers: {
          module: require('../state/mappers'),
        },
      },
      components: {
        contentRenderer: {
          module: require('../views/content-renderer'),
        },
        exerciseAttempts: {
          module: require('../views/exercise-attempts'),
        },
        downloadButton: {
          module: require('../views/content-renderer/download-button'),
        },
        loadingSpinner: {
          module: require('../views/loading-spinner'),
        },
        progressBar: {
          module: require('../views/progress-bar'),
        },
        contentIcon: {
          module: require('../views/content-icon'),
        },
        progressIcon: {
          module: require('../views/progress-icon'),
        },
        coreBase: {
          module: require('../views/core-base'),
        },
        coreModal: {
          module: require('../views/core-modal'),
        },
        navBar: {
          module: require('../views/nav-bar'),
        },
        iconButton: {
          module: require('../views/icon-button'),
        },
        textbox: {
          module: require('../views/textbox'),
        },
        dropdownMenu: {
          module: require('../views/dropdown-menu'),
        },
        tabs: {
          module: require('../views/tabs'),
        },
        logo: {
          module: require('../views/logo'),
        },
        immersiveFullScreen: {
          module: require('../views/immersive-full-screen'),
        },
        elapsedTime: {
          module: require('../views/elapsed-time'),
        },
        pointsIcon: {
          module: require('../views/points-icon'),
        },
      },
      router: {
        module: require('../router'),
      },
      mixins: {
        responsiveWindow: {
          module: require('../mixins/responsive-window'),
        },
        responsiveElement: {
          module: require('../mixins/responsive-element'),
        },
      },
    },
    styles: {
      theme: {
        module: require('../styles/core-theme.styl'),
      },
      definitions: {
        module: require('../styles/definitions.styl'),
      },
      keenVars: {
        module: require('../keen-config/variables.scss'),
      },
    },
    utils: {
      exams: {
        module: require('../exams/utils'),
      },
      validateLinkObject: {
        module: require('../validateLinkObject'),
      },
      serverClock: {
        module: require('../serverClock'),
      },
    },
  },
};
