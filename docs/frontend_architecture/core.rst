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

And **many** others. The complete specification for commonly shared modules can be found in `kolibri/core/assets/src/core-app/apiSpec.js`. This object defines which modules are imported into the core object. These can then be imported throughout the codebase - e.g.:

.. code-block:: javascript

  import Vue from 'kolibri.lib.vue';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';

Adding additional globally-available objects is relatively straightforward due to the `plugin and webpack build system </pipeline/frontend_build_pipeline>`__.

To expose something in the core app, add the module to the object in `apiSpec.js`, scoping it to the appropriate property for better organization - e.g.:

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

To help enforce style guide specs, we provide global variables that can be used throughout the codebase. This requires including  ``@import '~kolibri.styles.definitions';`` within a SCSS file or a component's ``<style>`` block. This exposes all variables in ``core-theme.scss`` and ``definitions.scss``.

Bootstrapped data
-----------------

The ``kolibriGlobal`` object is also used to bootstrap data into the JS app, rather than making unnecessary API requests.

For example, we currently embellish the ``kolibriGlobal`` object with a ``urls`` object. This is defined by `Django JS Reverse <https://github.com/ierror/django-js-reverse>`__ and exposes Django URLs on the client side. This will primarily be used for accessing API Urls for synchronizing with the REST API. See the Django JS Reverse documentation for details on invoking the Url.

Additional functionality
------------------------

These methods are also publicly exposed methods of the core app:

.. code-block:: javascript

  kolibriGlobal.register_kolibri_module_async   // Register a Kolibri module for asynchronous loading.
  kolibriGlobal.register_kolibri_module_sync    // Register a Kolibri module once it has loaded.
  kolibriGlobal.stopListening                   // Unbind an event/callback pair from triggering.
  kolibriGlobal.emit                            // Emit an event, with optional args.
