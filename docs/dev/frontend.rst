Frontend Code
=============

The behavior of much of Kolibri's user interface is defined by Javascript code.

There are two distinct entities that control this behaviour - a Kolibri Hook on the Python side, which manages the
registration of the frontend code within Django (and also facilitates building of that code into compiled assets with
Webpack) and a Kolibri Module - which is the Javascript object that wraps and manages the behaviour for a relatively
independent piece of frontend code.

Architecture of the Frontend Code
---------------------------------

Kolibri has a system for synchronously and asynchronously loading bundled javascript modules (that we're calling
KolibriModules) which is mediated by a small core js app. KolibriModules define to which events they subscribe, and
asynchronously registered KolibriModules are loaded by the core js app only when those events are triggered. For example
if the VideoViewer KolibriModule subscribes to the "content_loaded:video" event, then when that event is triggered on
the core js app it will asynchronously load the VideoViewer module and re-trigger the "content_loaded:video" event on
the object the module returns.

Synchronous and asynchronous loading is defined by the template tag used to import the Javascript for the KolibriModule
into the Django template. Synchronous loading merely inserts the Javascript and CSS for the KolibriModule directly into
the Django template, meaning it is executed at page load. This can be achieved in two ways, firstly simply by using the
`webpack_asset` template tag:

.. automodule:: kolibri.core.webpack.template_tags.webpack_tags
    :members: webpack_asset

In addition, if a KolibriModule needs to load in the template defined by another plugin or a core part of Kolibri, a
template tag and hook can be defined to register that KolibriModule's WebpackAssetHook to be loaded on that page. An
example of this is found for the `base.html` template of the Kolibri core app:

.. automodule:: kolibri.core.webpack.template_tags.webpack_tags
    :members: webpack_base_assets

This relies on the following function to collect all registered KolibriModules and load them synchronously:

.. automodule:: kolibri.core.webpack.utils
    :members: webpack_asset_render

Asynchronous loading can also, analogously, be done in two ways. Asynchronous loading registers a KolibriModule against
the core Kolibri Javascript app on the frontend at page load, but does not load, or execute any of the code until the
events that the KolibriModule specifies are triggered. When these are triggered, the Kolibri core Javascript app will
load the KolibriModule and pass on any callbacks once it has initialized. Asynchronous loading can be done either
explicitly with a template tag that directly imports a single KolibriModule:

.. automodule:: kolibri.core.webpack.template_tags.webpack_tags
    :members: webpack_base_async_assets

Layout of Frontend Code
-----------------------

All frontend files (Javascript, Stylus, images, templates) should be committed in the relevant 'assets/src' folder of
the app/Kolibri module they are associated with.

Kolibri uses a Component based file structure for organizing frontend assets in the 'assets/src' folder.

As such for a particular component of a frontend Kolibri module, would appear in the assets/src folder like this::

    /src/
        search/
             search_model.js
             search_box_view.js
             search_list_view.js
             search_list_item_view.js
             search_box.handlebars
             search_list.handlebars
             search_list_item.handlebars
             search_bg.png
             search.styl
        content_search_module.js

As can be seen above, Kolibri modules are defined in the root directory of the 'assets/src' folder.

Defining a Kolibri Module
-------------------------

A Kolibri Module is initially defined in Python code as a Kolibri Hook. The plugin is defined by
subclassing the ``WebpackBundleHook`` class to define each frontend Kolibri module.

.. automodule:: kolibri.core.webpack.hooks
    :members: WebpackBundleHook

An example of this is found here:

.. automodule:: kolibri.plugins.learn.kolibri_plugin
    :members: LearnAsset

The hook defines the entry point file (the file that acts as the entry point for this particular Kolibri Module), as
well as the events and callbacks to which that module listens. These are defined in the `events` and `once` properties
of the plugin. Each defines key-value pairs of the name of an event, and the name of the method on the Kolibri Module
object. When these events are triggered on the Kolibri core Javascript app, these callbacks will be called - or if the
Kolibri Module is registered for asynchronous loading, the Kolibri Module will be loaded, and then the callbacks called
when it is ready.


The Kolibri Core Javascript App
-------------------------------

The Kolibri Core Javascript App exposes commonly used libraries and acts as the mediator and point of communication
between different Kolibri Modules.

These methods are publicly exposed methods of the Mediator class::

  kolibriGlobal.register_kolibri_module_async - Register a Kolibri module for asynchronous loading.
  kolibriGlobal.register_kolibri_module_sync - Register a Kolibri module once it has loaded.
  kolibriGlobal.stop_listening - Unbind an event/callback pair from triggering.
  kolibriGlobal.emit - Emit an event, with optional args.

In addition, the lib property exposes the following libraries::

  kolibriGlobal.lib.vue - the global Vue module for Kolibri
  kolibriGlobal.lib.loglevel - the global logging module for Kolibri
  kolibriGlobal.lib.coreBase - the glboal component library for common UI components for Kolibri

Finally, once loaded into the frontend, we embellish the kolibriGlobal object with the following object::

  kolibriGlobal.urls

This object is defined by `Django JS Reverse <https://github.com/ierror/django-js-reverse>`_ and exposes Django URLs
on the client side. This will primarily be used for accessing API Urls for synchronizing with the REST API. See the
Django JS Reverse documentation for details on invoking the Url.


Writing Kolibri Modules
-----------------------

All Kolibri Modules should extend the KolibriModule class found in
`kolibri/core/assets/src/kolibri_module.js`. For convenience this can be referenced in a module with
the following syntax::

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

The methods defined above are the ones that can be referenced in the `events` and `once` properties of the plugin that
defines the Kolibri Module. Defining it in this way allows for asynchronous loading and registration without having to
load or execute the Javascript code.

The ready method will be automatically executed once the Module is loaded and registered with the Kolibri Core App -
whether the DOM is ready to be injected depends on how the Javascript has been inserted into the page. By convention,
Javascript is currently being injected into the served HTML *after* the `<main>` tag, meaning that this tag should be
available when the `ready` method is called.

Frontend Tech Stack
-------------------

Asset pipelining is done using Webpack - this allows the use of require to import modules - as such all written
code should be highly modular, individual files should be responsible for exporting a single function or object.

Frontend Unit Testing
---------------------

Unit testing is carried out using `Mocha <https://mochajs.org/>`_. All Javascript code should have unit tests for all
object methods and functions.

Tests are written in Javascript, and placed in the 'assets/test' folder. An example test is shown below::

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
