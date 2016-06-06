
Front-end Architecture
======================


Kolibri Modules
---------------

A Kolibri Module is initially defined in Python code as a Kolibri Hook. The plugin is defined by sub-classing the ``WebpackBundleHook`` class (in ``kolibri.core.webpack.hooks``) to define each frontend Kolibri module.

The hook defines the entry point file (the file that acts as the entry point for this particular Kolibri Module), as well as the events and callbacks to which that module listens. These are defined in the ``events`` and ``once`` properties of the plugin. Each defines key-value pairs of the name of an event, and the name of the method on the Kolibri Module object. When these events are triggered on the Kolibri core JavaScript app, these callbacks will be called - or if the Kolibri Module is registered for asynchronous loading, the Kolibri Module will be loaded, and then the callbacks called when it is ready.

All Kolibri Modules should extend the ``KolibriModule`` class found in `kolibri/core/assets/src/kolibri_module.js`. For convenience this can be referenced in a module with the following syntax::

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

The methods defined above are the ones that can be referenced in the ``events`` and ``once`` properties of the plugin that defines the Kolibri Module. Defining it in this way allows for asynchronous loading and registration without having to load or execute the JavaScript code.

The ready method will be automatically executed once the Module is loaded and registered with the Kolibri Core App - whether the DOM is ready to be injected depends on how the JavaScript has been inserted into the page. By convention, JavaScript is currently being injected into the served HTML *after* the ``<app-root>`` tag, meaning that this tag should be available when the ``ready`` method is called.


Core JavaScript App
-------------------

The Kolibri Core JavaScript App exposes commonly used libraries and acts as the mediator and point of communication between different Kolibri Modules.

These methods are publicly exposed methods of the Mediator class::

  kolibriGlobal.register_kolibri_module_async - Register a Kolibri module for asynchronous loading.
  kolibriGlobal.register_kolibri_module_sync - Register a Kolibri module once it has loaded.
  kolibriGlobal.stopListening - Unbind an event/callback pair from triggering.
  kolibriGlobal.emit - Emit an event, with optional args.

In addition, the lib property exposes the following libraries::

  kolibriGlobal.lib.vue - the global Vue module for Kolibri
  kolibriGlobal.lib.loglevel - the global logging module for Kolibri
  kolibriGlobal.lib.coreBase - the glboal component library for common UI components for Kolibri

Finally, once loaded into the frontend, we embellish the kolibriGlobal object with the following object::

  kolibriGlobal.urls

This object is defined by `Django JS Reverse <https://github.com/ierror/django-js-reverse>`_ and exposes Django URLs on the client side. This will primarily be used for accessing API Urls for synchronizing with the REST API. See the Django JS Reverse documentation for details on invoking the Url.


View Components
---------------

*TODO*


Global Styles
-------------

*TODO*


Unit Testing
------------

Unit testing is carried out using `Mocha <https://mochajs.org/>`_. All JavaScript code should have unit tests for all
object methods and functions.

Tests are written in JavaScript, and placed in the 'assets/test' folder. An example test is shown below::

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


