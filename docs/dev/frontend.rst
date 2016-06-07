
Front-end Architecture
======================


Components
----------

We leverage `Vue.js components <https://vuejs.org/guide/components.html>`_ as the primary building blocks for our UI. For general UI development work, this is the most common tool a developer will use. It would be prudent to read through the `Vue.js guide <https://vuejs.org/guide/>`_ thoroughly.

Each component contains HTML with dynamic Vue.js directives, styling which is scoped to that component and its children (written using `Stylus <http://stylus-lang.com/>`_), and logic which is also scoped to that component (written using `ES6 JavaScript <https://babeljs.io/docs/plugins/preset-es2015/>`_).

Components allow us to define new custom tags that encapsulate a piece of self-contained, re-usable UI functionality. When composed together, they form a tree structure of parents and children. Each component has a well-defined interface used by its parent component, made up of `input properties <https://vuejs.org/guide/components.html#Props>`_, `events <https://vuejs.org/guide/components.html#Custom-Events>`_ and `content slots <https://vuejs.org/guide/components.html#Content-Distribution-with-Slots>`_. Components should never reference their parent.

In addition to the Vue.js documentation, see :doc:`conventions` for some important consistency tips on writing new components.


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
            main.vue            # root view
            learn.js            # instantiate learn app on client-side
          test/
            learn.js
      management/
        assets/
          src/
            learner-roster.vue  # nested-view
            main.vue            # root view
            management.js       # instantiate mgmt app on client-side
          test/
            management.js


In the example above, the *main.vue* in *management* can use other assets in the same directory (such as *learner-roster.vue*) and it can use assets in core (such as variables in *core-theme.styl*). However it cannot use files in other plugin directories (such as *learn*).

.. note::

  For many development scenarios, only files in these directories need to be touched.

  There is also a lot of logic and configuration relevant to front-end code loading, parsing, testing, and linting. This includes webpack, NPM, and integration with the plugin system. This is somewhat scattered, and includes logic in *assets/...*, *webpack_config/...*, *package.json*, *kolibri/core/webpack/...*, and other locations. Much of this functionality is described in other sections of the docs, but it can take some time to understand how it all hangs together.


Single-page Apps
----------------

The Kolibri front-end is made of a few high-level "app" plugins, which are single-page JS applications with their own base URL and a single root component. Examples of apps are 'Learn' and 'User Management', as shown in the example above. Apps are independent of each other, and can only reference components and styles from within themselves and from core.

Each app is implemented as a Kolibri plugin and is defined in a subdirectory of *kolibri/plugins*.

On the client-side, each app corresponds to a single ``KolibriModule`` object and a single root component. The ``KolibriModule`` is responsible for mounting the root component into the DOM once all dependencies are loaded.

A Kolibri Module is initially defined in Python by sub-classing the ``WebpackBundleHook`` class (in ``kolibri.core.webpack.hooks``). The hook defines the JS entry point file where the ``KolibriModule`` subclass is instantiated, and where events and callbacks on the module are registered. These are defined in the ``events`` and ``once`` properties. Each defines key-value pairs of the name of an event, and the name of the method on the ``KolibriModule`` object. When these events are triggered on the Kolibri core JavaScript app, these callbacks will be called. (If the ``KolibriModule`` is registered for asynchronous loading, the Kolibri Module will first be loaded, and then the callbacks called when it is ready. See :doc:`asset_loading` for more information.)

All apps should extend the ``KolibriModule`` class found in `kolibri/core/assets/src/kolibri_module.js`. For convenience this can be referenced in a module with the following syntax:

.. code-block:: javascript

  const KolibriModule = require('kolibri_module');
  const logging = require('loglevel');

  class ExampleModule extends KolibriModule {

    initialize: () => {
      logging.info('Doing something before the Module is registered with the Core App!');
    }

    ready: () => {
      logging.info('Module is registered and ready to do things!');
    }

    hello_world: (message) => {
      logging.info('Hello world!', message);
    }

    goodbye_world: (message) => {
      logging.info('Goodbye, cruel world!', message);
    }
  }

The methods defined above are the ones that can be referenced in the ``events`` and ``once`` properties of the plugin that defines the ``KolibriModule`` subclass. Defining it in this way allows for asynchronous loading and registration without having to load or execute the JavaScript code.

The ``ready`` method will be automatically executed once the Module is loaded and registered with the Kolibri Core App. By convention, JavaScript is injected into the served HTML *after* the ``<app-root>`` tag, meaning that this tag should be available when the ``ready`` method is called, and the root component can be mounted here.


Shared Core Functionality
-------------------------

We also provide a set of shared "core" functionality – including components, styles, and helper logic – which can be re-used across apps.

The ``kolibriGlobal`` object exposes shared functionality through a common namespace ``window.kolibriGlobal`` and acts as the mediator and point of communication between different Kolibri Modules and third-party libraries.

These methods are publicly exposed methods of the core app:

.. code-block:: javascript

  kolibriGlobal.register_kolibri_module_async   // Register a Kolibri module for asynchronous loading.
  kolibriGlobal.register_kolibri_module_sync    // Register a Kolibri module once it has loaded.
  kolibriGlobal.stopListening                   // Unbind an event/callback pair from triggering.
  kolibriGlobal.emit                            // Emit an event, with optional args.

In addition, the ``lib`` property exposes the following globally-used libraries:

.. code-block:: javascript

  kolibriGlobal.lib['vue']                      // Vue.js module
  kolibriGlobal.lib['loglevel']                 // logging module
  kolibriGlobal.lib['core-base']                // shared base Vue.js component

If additional global libraries and components are required across multiple apps, they need to be added to this object.

We also embellish the ``kolibriGlobal`` object with the following object::

  kolibriGlobal.urls

This object is defined by `Django JS Reverse <https://github.com/ierror/django-js-reverse>`_ and exposes Django URLs on the client side. This will primarily be used for accessing API Urls for synchronizing with the REST API. See the Django JS Reverse documentation for details on invoking the Url.

For shared styles, two mechanisms are provided:

* The *core-theme.styl* file provides values for some globally-relevant Stylus variables. These variables can be used in any component's ``<style>`` block by adding the line ``@require '~core-theme.styl'``.
* The *core-global.styl* file is always inserted into the ``<head>`` after normalize.css and provides some basic styling to global elements


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


Vue.js components can also be tested. See the management plugin for an example.

