import importlib
import os

EXTERNAL_PLUGINS_PREFIX = "kolibri_"


def is_external_plugin(appname):
    '''
    Returns true when the given app is an external plugin.

    Implementation note: does a simple check on the name to see if it's
    prefixed with "kolibri_". If so, we think it's a plugin.
    '''

    return appname.startswith(EXTERNAL_PLUGINS_PREFIX)


def get_installed_app_locale_path(appname):
    """
    Load the app given by appname and return its locale folder path, if it exists.

    Note that the module is imported to determine its location.
    """

    m = importlib.import_module(appname)
    module_path = os.path.dirname(m.__file__)
    module_locale_path = os.path.join(module_path, "locale")

    if os.path.isdir(module_locale_path):
        return module_locale_path
