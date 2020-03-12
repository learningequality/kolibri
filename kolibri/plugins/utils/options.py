import copy
import logging
import warnings

from kolibri.plugins.registry import registered_plugins

logger = logging.getLogger(__name__)


def __validate_config_option(
    section, name, base_config_spec, plugin_specs, module_path
):
    # Raise an error if someone tries to overwrite a base option
    # except for the default value.
    if section in base_config_spec:
        if name in base_config_spec[section]:
            raise ValueError("Cannot overwrite a core Kolibri options spec option")

    # Warn if a plugin tries to add an option that another plugin has already added
    if section in plugin_specs:
        if name in plugin_specs[section]:
            warnings.warn(
                "{plugin} set an option {option} in section {section} but {plugins} had already set it".format(
                    plugin=module_path,
                    plugins=", ".join(plugin_specs[section][name]),
                    option=name,
                    section=section,
                )
            )
            plugin_specs[section][name].append(module_path)
        else:
            # If not create the list for this option name
            # to track this and future modifications
            plugin_specs[section][name] = [module_path]
    else:
        # If not create the dict for the section
        # and the list for this option name
        plugin_specs[section] = {name: [module_path]}


def __process_config_spec(
    option_spec, base_config_spec, plugin_specs, module_path, final_spec
):
    for section, opts in option_spec.items():
        for name, attrs in opts.items():
            __validate_config_option(
                section, name, base_config_spec, plugin_specs, module_path
            )
            if section not in final_spec:
                final_spec[section] = {}
            final_spec[section][name] = attrs


def __validate_option_default(section, name, plugin_default_overrides, module_path):
    # Warn if a plugin tries to add an option that another plugin has already added
    if section in plugin_default_overrides:
        if name in plugin_default_overrides[section]:
            warnings.warn(
                "{plugin} set an option default {option} in section {section} but {plugins} had already set it".format(
                    plugin=module_path,
                    plugins=", ".join(plugin_default_overrides[section][name]),
                    option=name,
                    section=section,
                )
            )
            plugin_default_overrides[section][name].append(module_path)
        else:
            # If not create the list for this option name
            # to track this and future modifications
            plugin_default_overrides[section][name] = [module_path]
    else:
        # If not create the dict for the section
        # and the list for this option name
        plugin_default_overrides[section] = {name: [module_path]}


def __process_option_defaults(
    option_defaults, base_config_spec, plugin_default_overrides, module_path, final_spec
):
    for section, opts in option_defaults.items():
        for name, default in opts.items():
            __validate_option_default(
                section, name, plugin_default_overrides, module_path
            )
            if section not in final_spec:
                logger.error(
                    "Tried to set a new default in section {}, but this is not a valid section".format(
                        section
                    )
                )
                continue
            if name in final_spec[section]:
                # This is valid, so set a default
                # Note that we do not validation here for now,
                # so it is up to the user to ensure the default value
                # is kosher.
                final_spec[section][name]["default"] = default
            else:
                logger.error(
                    "Tried to set a new default in section {}, for option {} but this is not a valid option".format(
                        section, name
                    )
                )


def extend_config_spec(base_config_spec):
    plugin_specs = {}
    final_spec = copy.deepcopy(base_config_spec)
    # First process options config spec additions
    for plugin_instance in registered_plugins:
        plugin_options = plugin_instance.options_module
        if plugin_options and hasattr(plugin_options, "option_spec"):
            module_path = plugin_instance.module_path
            option_spec = plugin_options.option_spec
            __process_config_spec(
                option_spec, base_config_spec, plugin_specs, module_path, final_spec
            )
    # Now process default value overrides, do this second in order to allow plugins
    # to override default values for other plugins!
    plugin_default_overrides = {}
    for plugin_instance in registered_plugins:
        plugin_options = plugin_instance.option_defaults_module
        if plugin_options and hasattr(plugin_options, "option_defaults"):
            module_path = plugin_instance.module_path
            option_defaults = plugin_options.option_defaults
            __process_option_defaults(
                option_defaults,
                base_config_spec,
                plugin_default_overrides,
                module_path,
                final_spec,
            )
    return final_spec
