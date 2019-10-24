Shared core functionality
=========================


Kolibri provides a set of shared "core" functionality – including components, styles, and helper logic, and libraries – which can be re-used across apps and plugins.

JS libraries and Vue components
-------------------------------

The following libraries and components are available globally, in all module code:

- ``vue`` - the Vue.js object
- ``vuex`` - the Vuex object
- ``logging`` - our wrapper around the `loglevel logging module <https://github.com/pimterry/loglevel>`__
- ``CoreBase`` - a shared base Vue.js component (*CoreBase.vue*)

And **many** others. The complete specification for commonly shared modules can be found in ``kolibri/core/assets/src/core-app/apiSpec.js``. This object defines which modules are imported into the core object. These can then be imported throughout the codebase - e.g.:

.. code-block:: javascript

  import Vue from 'kolibri.lib.vue';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';

Adding additional globally-available objects is relatively straightforward due to the `plugin and webpack build system </pipeline/frontend_build_pipeline>`__.

To expose something in the core app, add the module to the object in ``apiSpec.js``, scoping it to the appropriate property for better organization - e.g.:

.. code-block:: javascript

  components: {
    CoreTable,
  },
  utils: {
    navComponents,
  },

These modules would now be available for import anywhere with the following statements:

.. code-block:: javascript

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import navComponents from 'kolibri.utils.navComponents';

.. note::

  In order to avoid bloating the core api, only add modules that need to be used in multiple plugins.

Styling
-------

To help enforce style guide specs, we provide global variables that can be used throughout the codebase. This requires including  ``@import '~kolibri.styles.definitions';`` within a SCSS file or a component's ``<style>`` block. This exposes all variables in ``definitions.scss``.

Dynamic core theme
------------------

Vuex state is used to drive overall theming of the application, in order to allow for more flexible theming (either for accessibility or cosmetic purposes). All core colour styles are defined in Javascript variables kept in Vuex state, which are then applied inline to elements using Vue.js style bindings from Vuex getters.

There are two cases where dynamic styles cannot be directly applied to DOM elements:
- inline styles cannot apply `pseudo-classes <https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes>`__ (e.g. ':hover', ':focus', '::before')
- styles applied during `Vue transitions <https://vuejs.org/v2/guide/transitions.html>`__

For these cases, it's necessary to define a "computed class" using the ``$computedClass`` function. This returns an auto-generated class name which can be used like a standard CSS class name. Under the hood, this uses `Aphrodite <https://github.com/Khan/aphrodite>`__ to create unique classes for each set of inputs given, so be careful not to abuse this feature!

In order to apply a style using a computed class, define a style object as a computed property, similarly to how you might for a Vue.js style binding. Pseudo-selectors can be encoded within this object:

.. code-block:: javascript

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    mixins: [themeMixin],
    computed: {
      pseudoStyle() {
        return {
          ':hover': {
            backgroundColor: this.$themeTokens.primaryDark,
          },
        };
      },
    },
  };

Then, within the template code, this can be applied to an element or component using a Vue.js class binding, and using the ``$computedClass`` method, referencing this style object:

.. code-block:: html

  <div :class="$computedClass(pseudoStyle)">I'm going to get a white background when you hover on me!</div>

To use computed classes for Vue.js transitions, you can use the ``{event}-class`` `properties <https://vuejs.org/v2/api/#transition>`__ as options on the ``<transition>`` or ``<transition-group>`` special component, and the ``$computedClass`` method can be used again:

.. code-block:: html

  <transition-group :move-class="$computedClass(pseudoSelector)">
    <div>While moving I'll have the hover style applied!</div>
  </transition-group>


Bootstrapped data
-----------------

The ``kolibriCoreAppGlobal`` object is also used to bootstrap data into the JS app, rather than making unnecessary API requests.

For example, we currently embellish the ``kolibriCoreAppGlobal`` object with a ``urls`` object. This is defined by `Django JS Reverse <https://github.com/ierror/django-js-reverse>`__ and exposes Django URLs on the client side. This will primarily be used for accessing API Urls for synchronizing with the REST API. See the Django JS Reverse documentation for details on invoking the Url.

Additional functionality
------------------------

These methods are also publicly exposed methods of the core app:

.. code-block:: javascript

  kolibriCoreAppGlobal.register_kolibri_module_async   // Register a Kolibri module for asynchronous loading.
  kolibriCoreAppGlobal.register_kolibri_module_sync    // Register a Kolibri module once it has loaded.
  kolibriCoreAppGlobal.stopListening                   // Unbind an event/callback pair from triggering.
  kolibriCoreAppGlobal.emit                            // Emit an event, with optional args.
