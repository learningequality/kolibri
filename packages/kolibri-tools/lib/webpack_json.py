import argparse
import importlib
import json
import logging
import os
import sys
import tempfile

from pkg_resources import DistributionNotFound
from pkg_resources import get_distribution
from pkg_resources import resource_exists
from pkg_resources import resource_filename
from pkg_resources import resource_isdir
from pkg_resources import resource_listdir

logger = logging.getLogger("webpack_json")
logger.setLevel(level=logging.INFO)
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
logger.addHandler(handler)

BUILD_CONFIG = "buildConfig.js"


def load_plugins_from_file(file_path):
    try:
        import requests
    except ImportError:
        requests = None
    # We have been passed a URL, not a local file path
    if file_path.startswith("http"):
        if requests is None:
            raise ImportError("Requests is required to import plugins from urls")
        print(
            "Downloading plugins manifest from {file_path}".format(file_path=file_path)
        )
        _, path = tempfile.mkstemp(suffix=".txt", text=True)
        with open(path, "w") as f:
            r = requests.get(file_path)
            f.write(r.content)
        file_path = path
    with open(file_path, "r") as f:
        return [plugin.strip() for plugin in f.readlines() if plugin.strip()]


def expand_glob(build_item):
    plugins = []
    # Do a very simple check here, only deal with a single * at the end of something!
    if (
        len([item for item in build_item.split(".") if item == "*"]) > 1
        or build_item.endswith("**")
        or build_item == "*"
        or not build_item.endswith("*")
    ):
        logging.error("Too many * paths, only use one per module spec")
        return plugins
    parent_module_path = ".".join(
        [item for item in build_item.split(".") if item and item != "*"]
    )
    try:
        for file in resource_listdir(parent_module_path, "."):
            if resource_isdir(parent_module_path, file):
                try:
                    child_module_path = parent_module_path + "." + file
                    plugin = plugin_data(child_module_path)
                    if plugin is not None:
                        plugins.append(plugin)
                except ImportError:
                    continue
    except OSError:
        pass
    return plugins


def get_version(module_path):
    try:
        return get_distribution(module_path).version
    except (DistributionNotFound, AttributeError):
        try:
            module = importlib.import_module(module_path)
            return module.__version__
        except (ImportError, AttributeError):
            try:
                # Try importing the top level module that this plugin is in
                module = importlib.import_module(module_path.split(".")[0])
                return module.__version__
            except (ImportError, AttributeError):
                # This should work for most things, but seems like we are stuck
                # Make one last try by importing Kolibri instead!
                import kolibri

                return kolibri.__version__


def plugin_data(module_path):
    try:
        if resource_exists(module_path, BUILD_CONFIG):
            plugin_path = os.path.dirname(resource_filename(module_path, BUILD_CONFIG))
            version = get_version(module_path)
            if module_path.startswith("kolibri."):
                import kolibri

                locale_data_folder = os.path.join(
                    os.path.dirname(kolibri.__file__), "locale", "en", "LC_MESSAGES"
                )
            # Is an external plugin, do otherwise!
            else:
                locale_data_folder = os.path.join(
                    plugin_path, "locale", "en", "LC_MESSAGES"
                )
            return {
                "locale_data_folder": locale_data_folder,
                "plugin_path": plugin_path,
                "module_path": module_path,
                "version": version,
            }
    # Python 3.{4,5,6} raises a NotImplementedError for an empty directory
    # Python 3.7 raises a TypeError for an empty directory
    except (NotImplementedError, TypeError):
        pass
    raise ImportError("No frontend build assets")


def initialize_plugins(build_list):
    plugins = []
    for build_item in build_list:
        if "*" in build_item:
            plugins += expand_glob(build_item)
        elif build_item:
            # No '*' in the module path, so just add it naively
            plugin = plugin_data(build_item)
            if plugin is not None:
                plugins.append(plugin)
    return plugins


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--plugin_file",
        help="the filepath to which you'd like to run plugins from",
        type=str,
        default=None,
    )
    parser.add_argument(
        "--plugins",
        help="provide a space separated list of plugins you'd like to run",
        type=str,
        nargs="*",
        default=None,
    )
    parser.add_argument(
        "--plugin_path",
        help="provide a path to add to the Python path to enable import of the plugins",
        type=str,
        default=os.getcwd(),
    )
    parser.add_argument(
        "-o", "--output_file", type=str, default=None, dest="output_file"
    )
    parser.add_argument("-v", "--verbose", default=False, action="store_true")
    args = parser.parse_args()
    build_list = []

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    plugin_path = os.path.realpath(args.plugin_path)

    # Add our plugin_path to the path
    sys.path.append(plugin_path)

    # Put environment variable setting first to allow customized builds within buildkite through env vars
    if "BUILD_TIME_PLUGINS" in os.environ and os.environ["BUILD_TIME_PLUGINS"]:
        build_list = load_plugins_from_file(os.environ["BUILD_TIME_PLUGINS"])
    elif args.plugin_file:
        build_list = load_plugins_from_file(args.plugin_file)
    elif args.plugins:
        build_list = args.plugins

    logger.info("Gathering relevant modules from {}".format(build_list))

    result = initialize_plugins(build_list)

    if args.output_file:
        logger.info("Writing webpack_json output to {}".format(args.output_file))
        with open(args.output_file, "w") as f:
            json.dump(result, f)
    else:
        logger.info("No output file argument; writing webpack_json output to stdout.")
        logger.info(json.dumps(result))

    # Remove the plugin_path from the path to clean up
    sys.path.remove(plugin_path)


if __name__ == "__main__":
    main()
