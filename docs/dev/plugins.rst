Plugins
=======

The behavior of Kolibri can be extended using plugins.

How plugins work
----------------

.. automodule:: kolibri.plugins.registry

Enabling and disabling plugins
------------------------------

Non-core plugins can be enabled or disabled using the ``kolibri plugin`` command. See doc`usage`.

Other stuff you can do with plugins
-----------------------------------

Plugins can be standalone Django apps in their own right, meaning they can define templates, models, new urls, and
views just like any other app. However the API for all of this hasn't yet been determined... Coming soon!


Core plugin example
-------------------

View the source to learn more!

.. automodule:: kolibri.core.kolibri_plugin
    :members:

Extended example, with inheritance
----------------------------------

View the source to learn more!

.. automodule:: kolibri.plugins.example_plugin.kolibri_plugin
    :members: NavMenuPlugin, ExtendedPlugin
    :show-inheritance: