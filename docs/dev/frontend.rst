Frontend Code
=============

The behavior of much of Kolibri's user interface is defined by Javascript code.

There are two distinct entities that control this behaviour - a Kolibri Plugin on the Python side, which manages the
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
`frontend_assets` template tag:

.. automodule:: kolibri.core.template_tags.kolibri_tags
    :members: frontend_assets

In addition, if a KolibriModule needs to load in the template defined by another plugin or a core part of Kolibri, a
template tag and hook can be defined to register that KolibriModule as to be loaded on that page. An example of this is
found for the `base.html` template of the Kolibri core app:

.. automodule:: kolibri.core.template_tags.kolibri_tags
    :members: base_frontend_sync

This relies on the following function to collect all registered KolibriModules and load them synchronously:

.. automodule:: kolibri.core.template_tags.kolibri_tags
    :members: frontend_sync

Asynchronous loading can also, analogously, be done in two ways. Asynchronous loading registers a KolibriModule against
the core Kolibri Javascript app on the frontend at page load, but does not load, or execute any of the code until the
events that the KolibriModule specifies are triggered. When these are triggered, the Kolibri core Javascript app will
load the KolibriModule and pass on any callbacks once it has initialized. Asynchronous loading can be done either
explicitly with a template tag that directly imports a single KolibriModule:

.. automodule:: kolibri.core.template_tags.kolibri_tags
    :members: async_frontend_assets

Or the KolibriModule's defining plugin can be registered against a hook that is used in a template tag to asynchronously
register KolibriModules from other plugins within a particular Django template. An example of this is found for the
`base.html` template of the Kolibri core app:

.. automodule:: kolibri.core.template_tags.kolibri_tags
    :members: base_frontend_async

This relies on the following function to collect all registered KolibriModules and register them to load asynchronously:

.. automodule:: kolibri.core.template_tags.kolibri_tags
    :members: frontend_async

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

A Kolibri Module is initially defined in Python code as a Kolibri Python plugin. The plugin is defined by
subclassing the ``KolibriFrontEndPluginBase`` class to define each frontend Kolibri module.

.. automodule:: kolibri.plugins.example_plugin.kolibri_plugin
    :members: KolibriExampleFrontEnd
    :show-inheritance:

The plugin defines the entry point file (the file that acts as the entry point for this particular Kolibri Module), as
well as the events and callbacks to which that module listens. These are defined in the `events` and `once` properties
of the plugin. Each defines a name of an event, and the name of the method on the Kolibri Module object. When these
events are triggered on the Kolibri core Javascript app, these callbacks will be called - or if the Kolibri Module is
registered for asynchronous loading, the Kolibri Module will be loaded, and then the callbacks called when it is ready.

Writing Frontend Plugins
------------------------

All Frontend Plugins should extend the KolibriModule class found in
`kolibri/plugins/assets/src/kolibri_module/kolibri_module.js`.
For convenience this can be referenced in a module with the following syntax::

    var KolibriModule = require('kolibri_module');

    var ExampleModule = KolibriModule.extend({

        events: {
            'something_happened': 'hello_world'
        },

        once: {
            'nothing_happened': 'goodbye_world'
        },

        hello_world: function(message) {
            logging.info('Hello world!', message);
        },

        goodbye_world: function(message) {
            logging.info('Goodbye, cruel world!', message);
        }
    });

As can be seen above the Kolibri module can be defined with with an events hash which will define events that the
Kolibri module will be registered to listen to by the Kolibri core app (this will be events fired either by the core app
itself, or by other Kolibri modules). The once property can define a hash that will be listened to once, but then
unbound once it has fired.

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
