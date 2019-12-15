import importlib
import logging
import os
import shutil
from pkgutil import iter_modules

from django.apps import AppConfig
from django.apps import apps
from django.conf import settings as django_settings
from django.core.exceptions import AppRegistryNotReady
from django.core.management import call_command
from django.core.urlresolvers import reverse
from pkg_resources import DistributionNotFound
from pkg_resources import get_distribution
from pkg_resources import iter_entry_points
from pkg_resources import resource_exists
from semver import VersionInfo

import kolibri
from kolibri.core.upgrade import matches_version
from kolibri.core.upgrade import run_upgrades
from kolibri.plugins import conf_file
from kolibri.plugins import config
from kolibri.plugins import ConfigDict
from kolibri.plugins import DEFAULT_PLUGINS
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import KolibriHook
from kolibri.utils.compat import module_exists
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.version import normalize_version_to_semver

logger = logging.getLogger(__name__)


class PluginDoesNotExist(Exception):
    """
    This exception is raised when a plugin is initialized but it has no plugin class
    """


class PluginLoadsApp(Exception):
    """
    An exception raised in case a kolibri_plugin.py results in loading of the
    Django app stack.
    """


class MultiplePlugins(Exception):
    """
    An exception raised if more than one plugin is instantiated in a single
    kolibri_plugin module.
    """


def plugin_url(plugin_class, url_name):
    return reverse(
        "kolibri:{namespace}:{url_name}".format(
            namespace=plugin_class.class_module_path(), url_name=url_name
        )
    )


def _is_plugin(class_definition):
    return isinstance(class_definition, type) and issubclass(
        class_definition, KolibriPluginBase
    )


def is_external_plugin(module_path):
    """
    Returns true when the given module is an external plugin.

    Implementation note: does a simple check on the name to see if it's
    not prefixed with "kolibri.". If so, we know it's not an internal plugin.
    """

    return not module_path.startswith("kolibri.")


def _import_python_module(plugin_name):
    try:
        importlib.import_module(plugin_name)
    except ImportError as e:
        # Python 2: message, Python 3: msg
        exc_message = getattr(e, "message", getattr(e, "msg", None))
        if exc_message.startswith("No module named"):
            msg = (
                "Plugin '{}' does not seem to exist. Is it on the PYTHONPATH?"
            ).format(plugin_name)
            raise PluginDoesNotExist(msg)
        else:
            raise


def initialize_plugins_and_hooks(all_classes, plugin_name):
    was_configured = django_settings.configured
    plugin_objects = []
    for class_definition in all_classes:
        if _is_plugin(class_definition):
            # Initialize the class, nothing more happens for now.
            plugin_objects.append(class_definition())
            if not was_configured and django_settings.configured:
                raise RuntimeError(
                    "Initializing plugin class {} in plugin {} caused Django settings to be configured".format(
                        class_definition.__name__, plugin_name
                    )
                )
        elif issubclass(class_definition, KolibriHook):
            class_definition.add_hook_to_registries()
            if not was_configured and django_settings.configured:
                raise RuntimeError(
                    "Initializing hook class {} in plugin {} caused Django settings to be configured".format(
                        class_definition.__name__, plugin_name
                    )
                )
    if len(plugin_objects) == 0:
        raise PluginDoesNotExist(
            "Plugin '{}' exists but does not define a KolibriPluginBase derived class".format(
                plugin_name
            )
        )
    if len(plugin_objects) == 1:
        plugin_instance = plugin_objects[0]
        logger.debug("Initializing plugin: {}".format(plugin_name))
        return plugin_instance

    if len(plugin_objects) > 1:
        raise MultiplePlugins("More than one plugin defined in kolibri_plugin module")


def initialize_kolibri_plugin(plugin_name):
    """
    Try to load kolibri_plugin from given plugin module identifier
    In so doing, it will instantiate the KolibriPlugin object if it
    exists, and also register any hooks found in the module.

    :returns: the KolibriPlugin object for the module
    """
    was_configured = django_settings.configured

    # First import the bare plugin name to see if it exists
    # This will raise an exception if not
    _import_python_module(plugin_name)

    try:
        # Exceptions are expected to be thrown from here.
        plugin_module = importlib.import_module(plugin_name + ".kolibri_plugin")
        if not was_configured and django_settings.configured:
            raise RuntimeError(
                "Importing plugin module {} caused Django settings to be configured".format(
                    plugin_name
                )
            )
        logger.debug("Loaded kolibri plugin: {}".format(plugin_name))
        # If no exception is thrown, use this to find the plugin class.
        # Load a list of all class types in module
        all_classes = [
            cls for cls in plugin_module.__dict__.values() if isinstance(cls, type)
        ]
        # Filter the list to only match the ones that belong to the module
        # and not the ones that have been imported
        plugin_package = (
            plugin_module.__package__
            if plugin_module.__package__
            else plugin_module.__name__.rpartition(".")[0]
        )
        all_classes = filter(
            lambda x: plugin_package + ".kolibri_plugin" == x.__module__, all_classes
        )
        return initialize_plugins_and_hooks(all_classes, plugin_name)

    except ImportError as e:
        # Python 2: message, Python 3: msg
        exc_message = getattr(e, "message", getattr(e, "msg", None))
        if exc_message.startswith("No module named"):
            msg = (
                "Plugin '{}' exists but does not have an importable kolibri_plugin module"
            ).format(plugin_name)
            raise PluginDoesNotExist(msg)
        else:
            raise
    except AppRegistryNotReady:
        msg = (
            "Plugin '{}' loads the Django app registry, which it isn't "
            "allowed to do while enabling or disabling itself."
        ).format(plugin_name)
        raise PluginLoadsApp(msg)


def enable_plugin(plugin_name):
    try:
        obj = initialize_kolibri_plugin(plugin_name)
        if obj:
            obj.enable()
            return True
    except PluginDoesNotExist as e:
        logger.error(str(e))


def disable_plugin(plugin_name):
    try:
        obj = initialize_kolibri_plugin(plugin_name)
        if obj:
            obj.disable()
            return True
    except PluginDoesNotExist as e:
        logger.error(str(e))
        logger.warning(
            "Removing '{}' from configuration in a naive way.".format(plugin_name)
        )
        config.clear_plugin(plugin_name)
        logger.info("Removed '{}'".format(plugin_name))


def _get_plugin_version(plugin_name):
    if is_external_plugin(plugin_name):
        top_level_module = plugin_name.split(".")[0]
        try:
            return get_distribution(top_level_module).version
        except (DistributionNotFound, AttributeError):
            try:
                module = importlib.import_module(plugin_name)
                return module.__version__
            except (ImportError, AttributeError):
                try:
                    # Try importing the top level module that this plugin is in
                    module = importlib.import_module(top_level_module)
                    return module.__version__
                except (ImportError, AttributeError):
                    # This should work for most things, but seems like we are stuck
                    # just use the Kolibri version and just run upgrades in line with
                    # Kolibri instead.
                    return kolibri.__version__
    else:
        return kolibri.__version__


def is_plugin_updated(plugin_name):
    try:
        old_version = VersionInfo.parse(
            normalize_version_to_semver(config["PLUGIN_VERSIONS"][plugin_name])
        )
        new_version = VersionInfo.parse(
            normalize_version_to_semver(_get_plugin_version(plugin_name))
        )
        return new_version != old_version
    except KeyError:
        # We have no previous record of this plugin, so it is updated
        return True


class PluginUpdateException(Exception):
    pass


class PluginUpdateManager(object):
    def __init__(self, updated_plugins):
        # Import here as triggers django app loading
        from django.db.migrations.loader import MigrationLoader

        self.migration_loader = MigrationLoader(None)
        # Make a copy as this could get modified during the iteration
        self.updated_plugins = list(updated_plugins)
        self.errors = []

    def _migrate_plugin(self, plugin_name, app_configs):
        for app_config in app_configs:
            if app_config.label in self.migration_loader.migrated_apps:
                logger.info(
                    "Running database migrations for {}".format(app_config.label)
                )
                for database in django_settings.DATABASES:
                    # Run any unapplied migrations on all active databases
                    # Migrate takes a single app label at a time as an argument
                    try:
                        call_command(
                            "migrate",
                            app_config.label,
                            interactive=False,
                            database=database,
                        )
                    except Exception as e:
                        logger.error(
                            "An exception occured running migrations for plugin {} in app {} on database {}: {}".format(
                                plugin_name, app_config.label, database, e
                            )
                        )
                        raise e

    def _update_plugin(self, plugin_name):
        # Import here to prevent circular import
        from kolibri.plugins.registry import registered_plugins

        app_configs = []
        plugin_instance = registered_plugins.get(plugin_name)
        if plugin_instance is None:
            logger.error(
                "Tried to run upgrades for plugin {} but it doesn't exist".format(
                    plugin_name
                )
            )
            return
        for app in plugin_instance.INSTALLED_APPS:
            if not isinstance(app, AppConfig) and isinstance(app, str):
                app = apps.get_containing_app_config(app)
            app_configs.append(app)
        old_version = config["PLUGIN_VERSIONS"].get(plugin_name, "")
        new_version = _get_plugin_version(plugin_name)
        try:
            self._migrate_plugin(plugin_name, app_configs)
        except Exception as e:
            return
        if old_version:
            if VersionInfo.parse(
                normalize_version_to_semver(old_version)
            ) < VersionInfo.parse(normalize_version_to_semver(new_version)):
                logger.info(
                    "Running upgrade routines for {}, upgrading from {} to {}".format(
                        plugin_name, old_version, new_version
                    )
                )
            else:
                logger.info(
                    "Running downgrade routines for {}, downgrading from {} to {}".format(
                        plugin_name, old_version, new_version
                    )
                )
        else:
            logger.info(
                "Running installation routines for {}, installing {}".format(
                    plugin_name, new_version
                )
            )
        try:
            run_upgrades(old_version, new_version, app_configs=app_configs)
        except Exception as e:
            logger.error(
                "An exception occured running upgrades for plugin {}: {}".format(
                    plugin_name, e
                )
            )
            return
        return new_version

    def update_plugins(self):
        for plugin_name in self.updated_plugins:
            new_version = self._update_plugin(plugin_name)
            if new_version:
                logger.info("{} successfully updated".format(plugin_name))
                config.update_plugin_version(plugin_name, new_version)
            else:
                logger.error("{} plugin could not update".format(plugin_name))
                config.remove_plugin(plugin_name)
                self.errors.append(plugin_name)


def run_plugin_updates():
    if config["UPDATED_PLUGINS"]:
        logger.info(
            "Detected updates to plugins: {}".format(
                ", ".join(config["UPDATED_PLUGINS"])
            )
        )
        logger.info("Copying updated static files")
        # Collect any static files
        call_command("collectstatic", interactive=False, verbosity=0)

        update_manager = PluginUpdateManager(config["UPDATED_PLUGINS"])

        update_manager.update_plugins()

        if update_manager.errors:
            raise PluginUpdateException(
                "{} failed to update, please restart Kolibri".format(
                    ", ".join(update_manager.errors)
                )
            )


def autoremove_unavailable_plugins():
    """
    Sanitize INSTALLED_PLUGINS - something that should be done separately for all
    built in plugins, but we should not auto-remove plugins that are actually
    configured by the user or some other kind of hard dependency that should
    make execution stop if not loadable.
    """
    changed = False
    # Iterate over a copy of the set so that it is not modified during the loop
    for module_path in config["INSTALLED_PLUGINS"].copy():
        if not module_exists(module_path):
            config.clear_plugin(module_path)
            logger.error(
                (
                    "Plugin {mod} not found and disabled. To re-enable it, run:\n"
                    "   $ kolibri plugin {mod} enable"
                ).format(mod=module_path)
            )
            changed = True
    if changed:
        config.save()


def enable_new_default_plugins():
    """
    Enable new plugins that have been added between versions
    This will have the undesired side effect of reactivating
    default plugins that have been explicitly disabled by a user,
    in versions prior to the implementation of a plugin blacklist.
    """
    changed = False
    for module_path in DEFAULT_PLUGINS:
        if module_path not in config["INSTALLED_PLUGINS"]:
            config["INSTALLED_PLUGINS"].add(module_path)
            # Can be migrated to upgrade only logic
            if module_path not in config["DISABLED_PLUGINS"]:
                logger.warning(
                    (
                        "Default plugin {mod} not found in configuration. To re-disable it, run:\n"
                        "   $ kolibri plugin {mod} disable"
                    ).format(mod=module_path)
                )
            changed = True

    if changed:
        config.save()


def check_plugin_config_file_location(version):
    if matches_version(version, "<0.13.0"):
        old_conf_file = os.path.join(KOLIBRI_HOME, "kolibri_settings.json")
        if os.path.exists(old_conf_file):
            if not os.path.exists(conf_file):
                shutil.move(old_conf_file, conf_file)
                migrate_config = ConfigDict()
                # Migrate from using 'APPS' to 'PLUGINS' as the keys
                migrate_config.update(
                    {
                        "INSTALLED_PLUGINS": migrate_config.pop("INSTALLED_APPS"),
                        "DISABLED_PLUGINS": migrate_config.pop("DISABLED_APPS"),
                    }
                )
            else:
                os.remove(old_conf_file)


def _can_import_plugin(plugin):
    try:
        initialize_kolibri_plugin(plugin)
        return True
    except Exception:
        pass


def iterate_plugins():
    # Use to dedupe plugins
    plugins = set()
    for entry_point in iter_entry_points("kolibri.plugins"):
        name = entry_point.module_name
        if _can_import_plugin(name) and name not in plugins:
            plugins.add(name)
            yield name
    for module_loader, name, is_pkg in iter_modules():
        try:
            if (
                is_pkg
                and name not in plugins
                and resource_exists(name, "kolibri_plugin.py")
                and _can_import_plugin(name)
            ):
                yield name
        except Exception:
            pass
