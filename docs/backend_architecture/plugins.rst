.. _dev-plugins:

Kolibri plugin architecture
============================

The behavior of Kolibri can be extended using plugins. The following is a guide
to developing plugins.

Core vs. Plugins: When to Use Each
-----------------------------------

Kolibri's architecture separates **core functionality** from **plugin-based features**. Understanding when to add code to core versus plugins is important for maintaining a clean architecture.

**Core modules** (``kolibri/core/*``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Core modules provide essential, always-available functionality that other parts of Kolibri depend on. Add code to core when:

- The functionality is fundamental to Kolibri's operation (auth, content, logger, tasks)
- It provides shared infrastructure used across multiple plugins
- It defines base models, APIs, or utilities that plugins extend
- It cannot be disabled without breaking Kolibri

Examples of core modules:

- ``kolibri.core.auth`` - User authentication and permissions
- ``kolibri.core.content`` - Content channel and metadata management
- ``kolibri.core.logger`` - Event logging and analytics
- ``kolibri.core.tasks`` - Background task queue
- ``kolibri.core.device`` - Device-level settings and management

**Plugins** (``kolibri/plugins/*``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Plugins provide specific features or user-facing functionality that can be enabled or disabled. Add code as a plugin when:

- The feature can be optionally enabled/disabled by administrators
- It provides a specific user interface or workflow (Learn, Coach, Facility)
- It's a self-contained feature with minimal dependencies on other plugins
- Different deployments might want different combinations of features

Examples of plugins:

- ``kolibri.plugins.learn`` - Learner interface for browsing and accessing content
- ``kolibri.plugins.coach`` - Coach tools for managing classes and assignments
- ``kolibri.plugins.facility`` - Facility management and user administration
- ``kolibri.plugins.device`` - Device configuration interface

**Decision flowchart:**

1. Is this functionality required for Kolibri to operate? → **Core**
2. Will other plugins depend on this code? → **Core** (or shared utilities)
3. Should administrators be able to disable this feature? → **Plugin**
4. Does this provide a specific user interface or workflow? → **Plugin**
5. Is this extending existing core functionality? → **Plugin**

**Shared utilities:**

For code that needs to be reused across multiple plugins but isn't core functionality:

- Backend: Consider adding to an existing core utility module if it's truly general-purpose
- Frontend: Use the ``kolibri-common`` package to avoid expanding the core API

Enabling and disabling plugins
------------------------------

Non-core plugins can be enabled or disabled using the ``kolibri plugin`` commands.

.. automodule:: kolibri.plugins.registry

.. automodule:: kolibri.plugins.hooks

Defining a plugin
-----------------

A plugin must have a Python module inside it called ``kolibri_plugin``, inside this there must be an object subclassed
from ``KolibriPluginBase`` - here is a minimal example:

.. code-block:: python

    from kolibri.plugins import KolibriPluginBase

    class ExamplePlugin(KolibriPluginBase):
        pass

The Python module that contains this ``kolibri_plugin`` module can now be enabled and disabled as a plugin.
If the module path for the plugin is ``kolibri.plugins.example_plugin`` then it could be enabled by:

.. code-block:: bash

    kolibri plugin enable kolibri.plugins.example_plugin

The above command can be passed multiple plugin names to enable at once.
If Kolibri is running, it needs to be restarted for the change to take effect.

Similarly, to disable the plugin the following command can be used:

.. code-block:: bash

    kolibri plugin disable kolibri.plugins.example_plugin

.. note::
    **Using externally-built plugins with PEX**

    When using externally-built plugins (plugins installed separately from Kolibri's core installation) with a PEX distribution of Kolibri, you must set the environment variable ``PEX_INHERIT_PATH=fallback`` to enable the PEX file to access plugins installed in the system Python path.

    For example:

    .. code-block:: bash

        PEX_INHERIT_PATH=1 python kolibri.pex start

    This allows Kolibri to discover and use plugins that were installed via ``pip install`` outside of the PEX environment.

To exactly set the currently enabled plugins (disabling all other plugins, and enabling the ones specified) you can do this:

.. code-block:: bash

    kolibri plugin apply kolibri.plugins.learn kolibri.plugins.default_theme

This will disable all other plugins and only enable ``kolibri.plugins.learn`` and `kolibri.plugins.default_theme``.

Creating a plugin
-----------------

Plugins can be standalone Django apps in their own right, meaning they can define templates, models, new urls, and
views just like any other app. Any activated plugin is added to the ``INSTALLED_APPS`` setting of Django, so any models,
templates, or templatetags defined in the conventional way for Django inside an app will work inside of a Kolibri plugin.

In addition, Kolibri exposes some additional functionality that allows for the core URLs, Django settings, and Kolibri
options to be extended by a plugin. These are set

.. code-block:: python

    class ExamplePlugin(KolibriPluginBase):
        untranslated_view_urls = "api_urls"
        translated_view_urls = "urls"
        options = "options"
        settings = "settings"

These are all path references to modules within the plugin itself, so options would be accessible on the Python module path
as ``kolibri.plugins.example_plugin.options``.

``untranslated_view_urls``, ``translated_view_urls`` should both be standard Django urls modules in the plugin that expose
a ``urlpatterns`` variable - the first will be mounted as API urls - with no language prefixing, the second will be mounted
with language prefixing and will be assumed to contain language specific content.

``settings`` should be a module containing Django settings that should be added to the Kolibri settings. This should not be
used to override existing settings (and an error will be thrown if it is used in this way), but rather as a way for plugins
to add additional settings to the Django settings. This is particularly useful when a plugin is being used to wrap a Django
library that requires its own settings to define its behaviour - this module can be used to add these extra settings in a
way that is encapsulated to the plugin.

``options`` should be a module that exposes a variable ``options_spec`` which defines Kolibri options specific to this plugin.
For more information on how to configure these, see the base Kolibri options specification in *kolibri/utils/options.py*.
These values can then be set either by environment variables or by editing the ``options.ini`` file in the ``KOLIBRI_HOME``
directory. These options values can also be used inside the settings module above, to provide customization of plugin specific
behaviour. These options cannot clash with existing Kolibri options defined in ``kolibri.utils.options``, except in order to
change the default value of a Kolibri option - attempting to change any other value of a core Kolibri option will result
in a Runtime Error.

A very common use case for plugins is to implement a single page app or other Kolibri module for adding frontend functionality
using Kolibri Javascript code. Each of these Javascript bundles are defined in the `kolibri_plugin.py` file by subclassing the
``WebpackBundleHook`` class to define each frontend Kolibri module. This allows a webpack built Javascript bundle to be
cross-referenced and loaded into Kolibri. For more information on developing frontend code
for Kolibri please see :doc:`/frontend_architecture/index`.


Learn plugin example
--------------------

View the source to learn more!

.. automodule:: kolibri.plugins.learn.kolibri_plugin
    :noindex:
