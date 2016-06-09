Front-end Asset Loading
=======================

Asset pipelining is done using Webpack - this allows the use of require to import modules - as such all written code should be highly modular, individual files should be responsible for exporting a single function or object.

There are two distinct entities that control this behaviour - a Kolibri Hook on the Python side, which manages the registration of the frontend code within Django (and also facilitates building of that code into compiled assets with Webpack) and a Kolibri Module (a subclass of ``KolibriModule``) on the JavaScript side (see :doc:`frontend`).

Kolibri has a system for synchronously and asynchronously loading these bundled JavaScript modules which is mediated by a small core JavaScript app, ``kolibriGlobal``. Kolibri Modules define to which events they subscribe, and asynchronously registered Kolibri Modules are loaded by ``kolibriGlobal`` only when those events are triggered. For example if the Video Viewer's Kolibri Module subscribes to the *content_loaded:video* event, then when that event is triggered on ``kolibriGlobal`` it will asynchronously load the Video Viewer module and re-trigger the *content_loaded:video* event on the object the module returns.

Synchronous and asynchronous loading is defined by the template tag used to import the JavaScript for the Kolibri Module into the Django template. Synchronous loading merely inserts the JavaScript and CSS for the Kolibri Module directly into the Django template, meaning it is executed at page load.

This can be achieved in two ways using tags defined in *kolibri/core/webpack/templatetags/webpack_tags.py*.

The first way is simply by using the ``webpack_asset`` template tag.

The second way is if a Kolibri Module needs to load in the template defined by another plugin or a core part of Kolibri, a template tag and hook can be defined to register that Kolibri Module's assets to be loaded on that page. An example of this is found in the ``base.html`` template using the ``webpack_base_assets`` tag.

This relies on the following function to collect all registered Kolibri Modules and load them synchronously: ``kolibri.core.webpack.utils.webpack_asset_render``

Asynchronous loading can also, analogously, be done in two ways. Asynchronous loading registers a Kolibri Module against ``kolibriGlobal`` on the frontend at page load, but does not load, or execute any of the code until the events that the Kolibri Module specifies are triggered. When these are triggered, the ``kolibriGlobal`` will load the Kolibri Module and pass on any callbacks once it has initialized. Asynchronous loading can be done either explicitly with a template tag that directly imports a single Kolibri Module using ``webpack_base_async_assets``.




