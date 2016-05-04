Plugins
=======

The behavior of Kolibri can be extended using plugins.

.. automodule:: kolibri.plugins.registry

.. automodule:: kolibri.plugins.hooks

Enabling and disabling plugins
------------------------------

Non-core plugins can be enabled or disabled using the ``kolibri plugin`` command. See :doc:`usage`.

Other stuff you can do with plugins
-----------------------------------

Plugins can implement Javascript code as a Kolibri module that can be used in the frontend as a plugin to the core
Kolibri Javascript code. Each of these Javascript plugins are defined in the `kolibri_plugin.py` file by subclassing the
``KolibriFrontEndPluginBase`` class to define each frontend Kolibri module. This defines the base Javascript file that
defines the Kolibri module. In addition, this Plugin object within the app will automatically add these Kolibri modules
to an internal frontend asset registry for loading in the front end. For more information on developing frontend code
for Kolibri please see :doc:`frontend`.

Plugins can be standalone Django apps in their own right, meaning they can define templates, models, new urls, and
views just like any other app. However the API for all of this hasn't yet been determined... Coming soon!


Core plugin example
-------------------

View the source to learn more!

.. automodule:: kolibri.core.kolibri_plugin
    :members: KolibriCore


Frontend plugin example
-----------------------

View the source to learn more!

.. automodule:: kolibri.core.kolibri_plugin
    :members: KolibriCoreFrontEnd


Extended example, with inheritance
----------------------------------

View the source to learn more!

.. automodule:: kolibri.plugins.example_plugin.kolibri_plugin
    :members: NavMenuPlugin, ExtendedPlugin, KolibriExampleFrontEnd
    :show-inheritance: