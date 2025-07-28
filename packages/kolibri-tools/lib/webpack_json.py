import argparse
import importlib
import json
import logging
import os
import pkgutil
import sys
import tempfile

# Use modern APIs exclusively, with backports for older Python versions
try:
    # Python 3.8+ has importlib.metadata
    from importlib.metadata import distribution, PackageNotFoundError
except ImportError:
    # Python 3.6-3.7 need the backport
    from importlib_metadata import distribution, PackageNotFoundError

try:
    # Python 3.9+ has full importlib.resources
    from importlib.resources import files
except ImportError:
    # Python 3.6-3.8 need the backport
    from importlib_resources import files

logger = logging.getLogger("webpack_json")
logger.setLevel(level=logging.INFO)
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)
logger.addHandler(handler)

BUILD_CONFIG = "buildConfig.js"


def resource_exists(package, resource):
    """Check if a resource exists in a package."""
    try:
        return (files(package) / resource).is_file()
    except (ModuleNotFoundError, AttributeError, TypeError):
        return False


def resource_filename(package, resource):
    """Get the filename of a resource in a package."""
    try:
        return str(files(package) / resource)
    except (ModuleNotFoundError, AttributeError, TypeError):
        raise FileNotFoundError(f"Resource {resource} not found in {package}")


def resource_isdir(package, resource):
    """Check if a resource is a directory in a package."""
    try:
        return (files(package) / resource).is_dir()
    except (ModuleNotFoundError, AttributeError, TypeError):
        return False


def resource_listdir(package, resource):
    """List contents of a directory resource in a package."""
    try:
        path = files(package) / resource if resource != "." else files(package)
        return [item.name for item in path.iterdir()]
    except (ModuleNotFoundError, AttributeError, TypeError):
        return []


def load_plugins_from_file(file_path):
    try:
        import requests
    except ImportError:
        requests = None
    # We have been passed a URL, not a local file path
    if file_path.startswith("http"):
        if requests is None:
            raise ImportError("Requests is required to import plugins from urls")
        logger.info(
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
        parent_module = importlib.import_module(parent_module_path)
        # Use pkgutil for module discovery - it's stable and handles namespace packages well
        for _, modname, ispkg in pkgutil.iter_modules(
            parent_module.__path__, parent_module_path + "."
        ):
            if ispkg:
                try:
                    plugin = plugin_data(modname)
                    if plugin is not None:
                        plugins.append(plugin)
                except ImportError:
                    continue
    except (ImportError, AttributeError):
        pass
    return plugins


def get_version(module_path):
    try:
        return distribution(module_path).version
    except (PackageNotFoundError, AttributeError):
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
    # Handle cases where the module doesn't have the expected structure
    except (FileNotFoundError, ModuleNotFoundError):
        pass
    raise ImportError("No frontend build assets for plugin {}".format(module_path))


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
    sys.path.insert(0, plugin_path)

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
