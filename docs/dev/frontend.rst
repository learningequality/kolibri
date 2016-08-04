
Front-end Architecture
======================


Components
----------

We leverage `Vue.js components <https://vuejs.org/guide/components.html>`_ as the primary building blocks for our UI. For general UI development work, this is the most common tool a developer will use. It would be prudent to read through the `Vue.js guide <https://vuejs.org/guide/>`_ thoroughly.

Each component contains HTML with dynamic Vue.js directives, styling which is scoped to that component (written using `Stylus <http://stylus-lang.com/>`_), and logic which is also scoped to that component (written using `ES6 JavaScript <https://babeljs.io/docs/plugins/preset-es2015/>`_). Non-scoped styles can also be added, but these should be carefully namespaced.

Components allow us to define new custom tags that encapsulate a piece of self-contained, re-usable UI functionality. When composed together, they form a tree structure of parents and children. Each component has a well-defined interface used by its parent component, made up of `input properties <https://vuejs.org/guide/components.html#Props>`_, `events <https://vuejs.org/guide/components.html#Custom-Events>`_ and `content slots <https://vuejs.org/guide/components.html#Content-Distribution-with-Slots>`_. Components should never reference their parent.

Read through :doc:`conventions` for some important consistency tips on writing new components.


Layout of Frontend Code
-----------------------

Front-end code and assets are generally contained in one of two places: either in one of the plugin subdirectories (under *kolibri/plugins*) or in *kolibri/core*, which contains code shared across all plugins as described below.

Within these directories, there should be an *assets* directory with *src* and *test* under it. Most assets will go in *src*, and tests for the components will go in *test*.

For example:

.. code-block:: none

  kolibri/
    core/                       # core (shared) items
      assets/
        src/
          core-base.vue         # global base template, used by apps
          core-modal.vue        # example of another shared component
          core-global.styl      # globally defined styles, indluded in head
          core-theme.styl       # style variable values
          font-NotoSans.css     # embedded font
        test/
          ...                   # tests for core assets
    plugins/
      learn                     # learn plugin
        assets/
          src/
            vue/
              index.vue         # root view
              some-page.vue     # top-level client-side page
              another-page/     # top-level client-side page
                index.vue
                child.vue       # child component used only by parent
              shared.vue        # shared across this plugin
            app.js              # instantiate learn app on client-side
            router.js
            store.js
          test/
            app.js
      management/
        assets/
          src/
            user-roster.vue  # nested-view
            vue/index.vue        # root view
            app.js              # instantiate mgmt app on client-side
          test/
            app.js


In the example above, the *vue/another-page/index.vue* file in *learn* can use other assets in the same directory (such as *child.vue*), components in *vue* (such as *shared.vue*), and assets in core (such as variables in *core-theme.styl*). However it cannot use files in other plugin directories (such as *management*).

.. note::

  For many development scenarios, only files in these directories need to be touched.

  There is also a lot of logic and configuration relevant to front-end code loading, parsing, testing, and linting. This includes webpack, NPM, and integration with the plugin system. This is somewhat scattered, and includes logic in *frontend_build/...*, *package.json*, *kolibri/core/webpack/...*, and other locations. Much of this functionality is described in other sections of the docs (such as :doc:`asset_loading`), but it can take some time to understand how it all hangs together.


SVG Icons
---------

SVGs can be inlined into Vue components using a special syntax:


.. code-block:: html

  <svg src="icon.svg"></svg>

Then, if there is a file called ``icon.svg`` in the same directory, that file will be inserted directly into the outputted HTML. This allows aspects of the icon (e.g. fill) to be styled using CSS.

Attributes (such as vue directives like ``v-if`` and SVG attributes like ``viewbox``) can also be added to the svg tag.


Single-page Apps
----------------

The Kolibri front-end is made of a few high-level "app" plugins, which are single-page JS applications (conventionally *app.js*) with their own base URL and a single root Vue.js component. Examples of apps are 'Learn' and 'User Management', as shown in the example above. Apps are independent of each other, and can only reference components and styles from within themselves and from core.

Each app is implemented as a Kolibri plugin and is defined in a subdirectory of *kolibri/plugins*.

On the Server-side, the ``kolibri_plugin.py`` file describes most of the configuration for the single-page app. In particular, this includes the base Django HTML template to return (with an empty ``<body>``), the URL at which the app is exposed, and the javascript entry file which is run on load.

On the client-side, the app creates a single ``KolibriModule`` object in the entry file (conventionally *app.js*) and registers this with the core app, a global variable called ``kolibriGlobal``. The Kolibri Module then mounts single root component to the HTML returned by the server, which recursively contains all additional components, html and logic.


Defining a New Kolibri Module
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. note::

  This section is mostly relevant if you are creating a new app or plugin. If you are just creating new components, you don't need to do this.

A Kolibri Module is initially defined in Python by sub-classing the ``WebpackBundleHook`` class (in ``kolibri.core.webpack.hooks``). The hook defines the JS entry point (conventionally called *app.js*) where the ``KolibriModule`` subclass is instantiated, and where events and callbacks on the module are registered. These are defined in the ``events`` and ``once`` properties. Each defines key-value pairs of the name of an event, and the name of the method on the ``KolibriModule`` object. When these events are triggered on the Kolibri core JavaScript app, these callbacks will be called. (If the ``KolibriModule`` is registered for asynchronous loading, the Kolibri Module will first be loaded, and then the callbacks called when it is ready. See :doc:`asset_loading` for more information.)

All apps should extend the ``KolibriModule`` class found in `kolibri/core/assets/src/kolibri_module.js`.

The ``ready`` method will be automatically executed once the Module is loaded and registered with the Kolibri Core App. By convention, JavaScript is injected into the served HTML *after* the ``<rootvue>`` tag, meaning that this tag should be available when the ``ready`` method is called, and the root component (conventionally in *vue/index.vue*) can be mounted here.


Shared Core Functionality
-------------------------


Kolibri provides a set of shared "core" functionality – including components, styles, and helper logic, and libraries – which can be re-used across apps and plugins.

JS Libraries
~~~~~~~~~~~~

The following libraries are available globally, in all plugin code:

- ``vue`` - the Vue.js object
- ``loglevel`` - the `loglevel logging module <https://github.com/pimterry/loglevel>`_
- ``core-base`` - a shared base Vue.js component (*core-base.vue*)

These can be used in code with a standard CommonJS-style require statement - e.g.:

.. code-block:: javascript

  const vue = require('vue');
  const coreBase = require('core-base');

.. note::

  Due to the mechanics of the `plugin and webpack build system <asset_loading>`_, adding additional globally-available objects is somewhat complicated.

  References to the objects are attached to the ``kolibriGlobal`` object in *core-app/constructor.js*, and mapped to globally accessible names in *webpack.config.js*.



Bootstrapped Data
~~~~~~~~~~~~~~~~~

The ``kolibriGlobal`` object is also used to bootstrap data into the JS app, rather than making unnecessary API requests.

For example, we currently embellish the ``kolibriGlobal`` object with a ``urls`` object. This is defined by `Django JS Reverse <https://github.com/ierror/django-js-reverse>`_ and exposes Django URLs on the client side. This will primarily be used for accessing API Urls for synchronizing with the REST API. See the Django JS Reverse documentation for details on invoking the Url.


Styling
~~~~~~~

For shared styles, two mechanisms are provided:

* The *core-theme.styl* file provides values for some globally-relevant Stylus variables. These variables can be used in any component's ``<style>`` block by adding the line ``@require '~core-theme.styl'``.
* The *core-global.styl* file is always inserted into the ``<head>`` after normalize.css and provides some basic styling to global elements


Additional Functionality
~~~~~~~~~~~~~~~~~~~~~~~~

These methods are also publicly exposed methods of the core app:

.. code-block:: javascript

  kolibriGlobal.register_kolibri_module_async   // Register a Kolibri module for asynchronous loading.
  kolibriGlobal.register_kolibri_module_sync    // Register a Kolibri module once it has loaded.
  kolibriGlobal.stopListening                   // Unbind an event/callback pair from triggering.
  kolibriGlobal.emit                            // Emit an event, with optional args.


Unit Testing
------------

Unit testing is carried out using `Mocha <https://mochajs.org/>`_. All JavaScript code should have unit tests for all object methods and functions.

Tests are written in JavaScript, and placed in the 'assets/test' folder. An example test is shown below:

.. code-block:: javascript

  var assert = require('assert');

  var SearchModel = require('../src/search/search_model.js');

  describe('SearchModel', function() {
    describe('default result', function() {
      it('should be empty an empty array', function () {
        var test_model = new SearchModel();
        assert.deepEqual(test_model.get("result"), []);
      });
    });
  });


Vue.js components can also be tested. The management plugin contains an example (*kolibri/plugins/management/assets/test/management.js*) where the component is bound to a temporary DOM node, changes are made to the state, and assertions are made about the new component structure.


Adding Dependencies
-------------------

Dependencies are tracked using ``npm shrinkwrap`` - `see the docs here <https://docs.npmjs.com/cli/shrinkwrap>`_.

We distinguish development dependencies from runtime dependencies, and these should be installed as such using ``npm install --save-dev [dep]`` or ``npm install --save [dep]``, respectively. Then you'll need to run ``npm shrinkwrap``. Your new dependency should now be recorded in *package.json*, and all of its dependencies should be recorded in *npm-shrinkwrap.json*.

Note that we currently don't have a way of mapping dependencies to plugins - dependencies are installed globally.

To assist in tracking the source of bloat in our codebase, the command ``npm run bundle-stats`` is available to give a full readout of the size that uglified packages take up in the final Javascript code.
