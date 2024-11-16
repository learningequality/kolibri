Shared core functionality
=========================


Kolibri provides a set of shared "core" functionality – including components, styles, and helper logic, and libraries – which can be re-used across apps and plugins. This forms a public API that others may depend on, so we keep it limited to ensure we can continue to support it.

For code that needs to be reused across two plugins, it is recommended to put it in the `kolibri-common` package instead. This will allow easy reuse, but without expanding our API and increasing the number of things we potentially have to support for external users.

JS libraries and Vue components
-------------------------------

The following libraries and components are available for import, in all module code, without need for bundling, e.g.:

- ``vue`` - the Vue.js object
- ``vuex`` - the Vuex object
- ``kolibri-logging`` - our wrapper around the `loglevel logging module <https://github.com/pimterry/loglevel>`__
- ``AppBarPage`` - a shared Vue.js page component (*AppBarPage.vue*)

The complete specification for commonly shared modules can be found in ``packages/kolibri/package.json``. The "exports" field defines the things inside the package that can be imported, and the "exposes" field defines additional modules that are bundled into the core package.

.. code-block:: javascript

  import Vue from 'vue';
  import AppBarPage from 'kolibri/components/AppBarPage';

Adding additional globally-available objects is relatively straightforward due to the :doc:`plugin and webpack build system <frontend_build_pipeline>`.

In general, code should not be added to the kolibri package unless it has been specified as required in planned work. This is to avoid cluttering the core package with unnecessary code.

Styling
-------

To help enforce style guide specs, we provide global variables that can be used throughout the codebase. This requires including  ``@import '~kolibri-design-system/lib/styles/definitions';`` within a SCSS file or a component's ``<style>`` block. This exposes all variables in ``definitions.scss``.

Dynamic core theme
------------------

Reactive state is used to drive overall theming of the application, in order to allow for more flexible theming (either for accessibility or cosmetic purposes). All core colour styles are defined in Javascript variables kept in state, which are then applied inline to elements using Vue.js style bindings.

There are two cases where dynamic styles cannot be directly applied to DOM elements:
- inline styles cannot apply `pseudo-classes <https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes>`__ (e.g. ':hover', ':focus', '::before')
- styles applied during `Vue transitions <https://vuejs.org/v2/guide/transitions.html>`__

For these cases, it's necessary to define a "computed class" using the ``$computedClass`` function. This returns an auto-generated class name which can be used like a standard CSS class name. Under the hood, this uses `Aphrodite <https://github.com/Khan/aphrodite>`__ to create unique classes for each set of inputs given, so be careful not to abuse this feature!

In order to apply a style using a computed class, define a style object as a computed property, similarly to how you might for a Vue.js style binding. Pseudo-selectors can be encoded within this object:

.. code-block:: javascript

  export default {
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
