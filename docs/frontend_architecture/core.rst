Shared core functionality
=========================


Kolibri provides a set of shared "core" functionality – including components, styles, and helper logic, and libraries – which can be re-used across apps and plugins. This forms a public API that others may depend on, so we keep it limited to ensure we can continue to support it.

For code that needs to be reused across two plugins, it is recommended to put it in the `kolibri-common` package instead. This will allow easy reuse, but without expanding our API and increasing the number of things we potentially have to support for external users.

JS libraries and Vue components
-------------------------------

The following libraries and components are available for import, in all module code, without need for bundling, e.g.:

- ``vue`` - the Vue.js object
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

Reactive state is used to drive overall theming of the application, in order to allow for more flexible theming (either for accessibility or cosmetic purposes). The theme emits each color as a CSS variable on ``html:root``:

- ``--tokens-<name>`` for tokens, such as ``var(--tokens-primary)``
- ``--palette-<color>-v<N>`` for palette colors, such as ``var(--palette-grey-v100)``
- ``--brand-<color>-v<N>`` for brand colors, such as ``var(--brand-primary-v100)``

Theme colors
~~~~~~~~~~~~

Write a theme color as a ``var()`` in the component's ``<style>`` block. This also works in `pseudo-classes <https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes>`__ such as ``:hover``, ``:focus`` and ``::before``, and in the classes of a `Vue transition <https://v2.vuejs.org/v2/guide/transitions.html>`__:

.. code-block:: scss

  .option:hover {
    background-color: var(--tokens-primaryDark);
  }

When the color depends on component state, an inline style binding can hold the ``var()`` as a string:

.. code-block:: html

  <div :style="{ color: isActive ? 'var(--tokens-primary)' : 'var(--tokens-text)' }"></div>

Other dynamic values
~~~~~~~~~~~~~~~~~~~~

Bind a value that is not a theme color, such as a prop or a computed value, into the ``<style>`` block with ``v-bind()``:

.. code-block:: html

  <script>

    import { computed } from 'vue';

    export default {
      name: 'ResourceList',
      setup(props) {
        const listMaxHeight = computed(() => `${props.rows * 48}px`);
        return { listMaxHeight };
      },
      props: {
        rows: {
          type: Number,
          required: true,
        },
      },
    };

  </script>

  <style lang="scss" scoped>

    .list {
      max-height: v-bind(listMaxHeight);
    }

  </style>

Do not read a theme color inside ``v-bind()``. Use its ``var()`` instead. ``kolibri/vue-no-theme-tokens-in-v-bind`` reports a theme read there.

Vue 2.7 stops updating a ``v-bind()`` value when the template root is removed and added again, for example by a ``v-if`` on the root. In a component whose ``<style>`` block uses ``v-bind()``, wrap the conditional element in a plain root element.

JavaScript accessors
~~~~~~~~~~~~~~~~~~~~

``$themeTokens``, ``$themePalette`` and ``$themeBrand`` return the hex values. Use them only where JavaScript needs the value itself, such as a color passed to ``$darken1``.

KDS deprecates ``$computedClass`` and Aphrodite. Do not use ``$computedClass`` in new code.


Bootstrapped data
-----------------

The ``kolibriCoreAppGlobal`` object is also used to bootstrap data into the JS app, rather than making unnecessary API requests.

For example, we currently embellish the ``kolibriCoreAppGlobal`` object with a ``urls`` object. This is defined by `Django JS Reverse <https://github.com/ierror/django-js-reverse>`__ and exposes Django URLs on the client side. This will primarily be used for accessing API Urls for synchronizing with the REST API.

URLs and API Endpoints
~~~~~~~~~~~~~~~~~~~~~~

Kolibri uses a consistent URL namespacing pattern (e.g., ``kolibri:core:session_list``) that bridges Django's backend URL system with JavaScript frontend code. URLs can be accessed in JavaScript via the ``urls`` object:

.. code-block:: javascript

  import urls from 'kolibri/urls';
  import client from 'kolibri/client';

  // Call a list endpoint
  const response = await client({
    url: urls['kolibri:core:session_list'](),
  });

  // Call a detail endpoint with a parameter
  const response = await client({
    url: urls['kolibri:core:session_detail'](sessionId),
  });

For comprehensive information about URL namespacing, including how to define URLs in Django and use them in JavaScript, see the :doc:`/howtos/working_with_urls_and_api_endpoints` guide.

Additional functionality
------------------------

These methods are also publicly exposed methods of the core app:

.. code-block:: javascript

  kolibriCoreAppGlobal.register_kolibri_module_async   // Register a Kolibri module for asynchronous loading.
  kolibriCoreAppGlobal.register_kolibri_module_sync    // Register a Kolibri module once it has loaded.
  kolibriCoreAppGlobal.stopListening                   // Unbind an event/callback pair from triggering.
  kolibriCoreAppGlobal.emit                            // Emit an event, with optional args.
