import copy
import warnings

from kolibri.plugins.registry import registered_plugins


def __validate_config_option(
    section, name, attrs, base_config_spec, plugin_specs, module_path
):
    # Raise an error if someone tries to overwrite a base option
    # except for the default value.
    if section in base_config_spec:
        if name in base_config_spec[section] and (
            len(attrs) != 1 or "default" not in attrs
        ):
            raise ValueError(
                "Cannot overwrite a core Kolibri options spec option, except for the default value"
            )

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
                section, name, attrs, base_config_spec, plugin_specs, module_path
            )
            if section not in final_spec:
                final_spec[section] = {}
            if section in base_config_spec and name in base_config_spec[section]:
                # This will have thrown an error above if this
                # is doing anything other than overriding the default
                # value. Instead of setting all the information here
                # just copy the default value from the plugin options
                # to the final spec.
                final_spec[section][name]["default"] = attrs["default"]
            else:
                # Otherwise just set it completely from the options
                final_spec[section][name] = attrs


def extend_config_spec(base_config_spec):
    plugin_specs = {}
    final_spec = copy.deepcopy(base_config_spec)
    for plugin_instance in registered_plugins:
        plugin_options = plugin_instance.options_module
        if plugin_options and hasattr(plugin_options, "option_spec"):
            module_path = plugin_instance.module_path
            option_spec = plugin_options.option_spec
            __process_config_spec(
                option_spec, base_config_spec, plugin_specs, module_path, final_spec
            )
    return final_spec
