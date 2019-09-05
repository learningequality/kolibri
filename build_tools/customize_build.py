"""
This module defines functions for customizing the plugins used at Kolibri build time
the default plugins used at Kolibri run time, and the default value for
the DJANGO_SETTINGS_MODULE environment variable.

For more detail see the documentation in __init__.py
"""
import os
import sys
import tempfile

import requests

sys.path.append(os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

os.environ.setdefault(
    "RUN_TIME_PLUGINS",
    os.path.realpath(os.path.join(os.path.dirname(__file__), "default_plugins.txt")),
)

plugins_cache = {}


def load_plugins_from_file(file_path):
    global plugins_cache
    if file_path not in plugins_cache:
        # We have been passed a URL, not a local file path
        if file_path.startswith("http"):
            print(
                "Downloading plugins manifest from {file_path}".format(
                    file_path=file_path
                )
            )
            _, path = tempfile.mkstemp(suffix=".txt", text=True)
            with open(path, "w") as f:
                r = requests.get(file_path)
                f.write(r.content)
            file_path = path
        with open(file_path, "r") as f:
            plugins_cache[file_path] = [
                plugin.strip() for plugin in f.readlines() if plugin.strip()
            ]
    return plugins_cache[file_path]


build_config_path = os.path.join(
    os.path.dirname(__file__), "../kolibri/utils/build_config"
)

default_settings_template = "settings_path = '{path}'"


def set_default_settings_module():
    if (
        "DEFAULT_SETTINGS_MODULE" in os.environ
        and os.environ["DEFAULT_SETTINGS_MODULE"]
    ):
        default_settings_path = os.environ["DEFAULT_SETTINGS_MODULE"]
        with open(os.path.join(build_config_path, "default_settings.py"), "w") as f:
            # Just write out settings_path = '<settings_path>'
            print(
                "Setting default settings module to {path}".format(
                    path=default_settings_path
                )
            )
            f.write(default_settings_template.format(path=default_settings_path))


run_time_plugin_template = "plugins = {plugins}\n"


def set_run_time_plugins():
    if "RUN_TIME_PLUGINS" in os.environ and os.environ["RUN_TIME_PLUGINS"]:
        runtime_plugins = load_plugins_from_file(os.environ["RUN_TIME_PLUGINS"])
        with open(os.path.join(build_config_path, "default_plugins.py"), "w") as f:
            # Just write out 'plugins = [...]' <-- list of plugins
            print("Setting run time plugins to:")
            for runtime_plugin in runtime_plugins:
                print(runtime_plugin)
            print("### End run time plugins ###")
            f.write(run_time_plugin_template.format(plugins=runtime_plugins.__str__()))


if __name__ == "__main__":
    set_default_settings_module()
    set_run_time_plugins()
