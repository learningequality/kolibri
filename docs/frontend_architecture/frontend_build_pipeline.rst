Frontend build pipeline
=======================

Asset pipelining is done using Webpack - this allows the use of require to import modules - as such all written code should be highly modular, individual files should be responsible for exporting a single function or object.

There are two distinct entities that control this behaviour - a Kolibri Hook on the Python side, which manages the registration of the frontend code within Django and a ``buildConfig.js`` file for the webpack configuration. The format of the ``buildConfig.js`` is relatively straight forward, and the Kolibri Hook and the ``buildConfig.js`` are connected by a single shared ``bundle_id`` specified in both:

.. code-block:: python

  @register_hook
  class LearnNavItem(NavigationHook):
      bundle_id = "side_nav"


  @register_hook
  class LearnAsset(webpack_hooks.WebpackBundleHook):
      bundle_id = "app"

.. code-block:: javascript

  module.exports = [
    {
      bundle_id: 'app',
      webpack_config: {
        entry: './assets/src/app.js',
      },
    },
    {
      bundle_id: 'side_nav',
      webpack_config: {
        entry: './assets/src/views/LearnSideNavEntry.vue',
      },
    },
  ];

The two specifications are connected by the shared specification of the ``bundle_id``. Minimally an ``entry`` value for the ``webpack_config`` object is required, but any other valid webpack configuration options may be passed as part of the object - they will be merged with the default Kolibri webpack build.

Kolibri has a system for synchronously and asynchronously loading these bundled JavaScript modules which is mediated by a small core JavaScript app, ``kolibriCoreAppGlobal``. Kolibri Modules define to which events they subscribe, and asynchronously registered Kolibri Modules are loaded by ``kolibriCoreAppGlobal`` only when those events are triggered. For example if the Video Viewer's Kolibri Module subscribes to the *content_loaded:video* event, then when that event is triggered on ``kolibriCoreAppGlobal`` it will asynchronously load the Video Viewer module and re-trigger the *content_loaded:video* event on the object the module returns.

Synchronous and asynchronous loading is defined by the template tag used to import the JavaScript for the Kolibri Module into the Django template. Synchronous loading merely inserts the JavaScript and CSS for the Kolibri Module directly into the Django template, meaning it is executed at page load.

This can be achieved in two ways using template tags.

The first way is simply by using the ``webpack_asset`` template tag defined in *kolibri/core/webpack/templatetags/webpack_tags.py*.

The second way is if a Kolibri Module needs to load in the template defined by another plugin or a core part of Kolibri, a template tag and hook can be defined to register that Kolibri Module's assets to be loaded on that page. An example of this is found in the ``base.html`` template using the ``frontend_base_assets`` tag, the hook that the template tag uses is defined in *kolibri/core/hooks.py*.

Asynchronous loading can also, analogously, be done in two ways. Asynchronous loading registers a Kolibri Module against ``kolibriCoreAppGlobal`` on the frontend at page load, but does not load, or execute any of the code until the events that the Kolibri Module specifies are triggered. When these are triggered, the ``kolibriCoreAppGlobal`` will load the Kolibri Module and pass on any callbacks once it has initialized. Asynchronous loading can be done either explicitly with a template tag that directly imports a single Kolibri Module using ``webpack_base_async_assets``.
