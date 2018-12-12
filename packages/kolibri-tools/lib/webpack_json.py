import argparse
import glob
import importlib
import json
import logging
import os
import tempfile

try:
    # Python 3.5+
    import importlib.util

    def import_package(package_name, package_path):
        spec = importlib.util.spec_from_file_location(package_name, package_path)
        foo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(foo)
        return foo
except ImportError:
    try:
        # Python 3.4
        from importlib.machinery import SourceFileLoader

        def import_package(package_name, package_path):
            return SourceFileLoader(package_name, package_path).load_module()
    except ImportError:
        # Python 2.7
        import imp

        def import_package(package_name, package_path):
            return imp.load_source(package_name, package_path)

try:

    from kolibri.core.webpack.hooks import WebpackBundleHook

except ImportError:
    # This can happen if we are running from the Kolibri source repo
    # and we have not installed Kolibri in the local environment.
    # Try adding the path to the kolibri package in the source file
    # and then reimport.
    import sys

    sys.path.append(os.path.realpath(os.path.join(os.path.dirname(__file__), '../../..')))

    from kolibri.core.webpack.hooks import WebpackBundleHook

logger = logging.getLogger('webpack_json')
logger.setLevel(level=logging.WARN)


def load_plugins_from_file(file_path):
    try:
        import requests
    except ImportError:
        requests = None
    # We have been passed a URL, not a local file path
    if file_path.startswith('http'):
        if requests is None:
            raise ImportError('Requests is required to import plugins from urls')
        print("Downloading plugins manifest from {file_path}".format(file_path=file_path))
        _, path = tempfile.mkstemp(suffix=".txt", text=True)
        with open(path, 'w') as f:
            r = requests.get(file_path)
            f.write(r.content)
        file_path = path
    with open(file_path, 'r') as f:
        return [plugin.strip() for plugin in f.readlines() if plugin.strip()]


def expand_glob(build_item):
    plugins = []
    # Do a very simple check here, only deal with a single * at the end of something!
    if (len([item for item in build_item.split('.') if item == '*']) > 1
            or build_item.endswith('**')
            or build_item == '*'
            or not build_item.endswith('*')):
        logging.error('Too many * paths, only use one per module spec')
        return plugins
    parent_module_path = '.'.join([item for item in build_item.split('.') if item and item != '*'])
    try:
        parent_module = importlib.import_module(parent_module_path)
    except ImportError:
        # Someone has passed us an invalid module path, carry on
        return plugins
    for file in glob.glob(os.path.join(os.path.dirname(parent_module.__file__), '*')):
        try:
            file = file.replace(os.path.dirname(parent_module.__file__), '')
            child_module_path = parent_module_path + file.replace('/', '.')
            plugins.append(initialize_plugin(child_module_path))
        except ImportError:
            continue
    return plugins


def initialize_plugin(app, path=None):
    try:
        import_string = app + ".kolibri_plugin"
        if path:
            # Need to define the base module by its path first
            import_package(app, os.path.join(path, "__init__.py"))
            # Then import the plugin module after
            plugin_module = import_package(import_string, os.path.join(path, 'kolibri_plugin.py'))
        else:
            plugin_module = importlib.import_module(import_string)
        return plugin_module
    except ImportError:
        pass


def initialize_plugins(build_list, paths=None):
    plugins = []
    for i, build_item in enumerate(build_list):
        path = None
        if paths is not None:
            path = paths[i]

        if '*' in build_item:
            if paths:
                raise RuntimeError("Do not mix globbed module python import paths with explicit file paths")
            plugins += expand_glob(build_item)
        else:
            # No '*' in the module path, so just add it naively
            plugin = initialize_plugin(build_item, path)
            if plugin is not None:
                plugins.append(plugin)
    return plugins


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--plugin_file', help='the filepath to which you\'d like to run plugins from', type=str, default=None)
    parser.add_argument('--plugins', help='provide a space separated list of plugins you\'d like to run', type=str, nargs='*', default=None)
    parser.add_argument('--plugin_paths', help='provide a space separated list of plugin explicit plugin paths', type=str, nargs='*', default=None)
    parser.add_argument('-o', '--output_file', type=str, default=None, dest="output_file")
    parser.add_argument('-v', '--verbose', default=False, action='store_true')
    args = parser.parse_args()
    build_list = []

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # Put environment variable setting first to allow customized builds within buildkite through env vars
    if "BUILD_TIME_PLUGINS" in os.environ and os.environ["BUILD_TIME_PLUGINS"]:
        build_list = load_plugins_from_file(os.environ["BUILD_TIME_PLUGINS"])
    elif args.plugin_file:
        build_list = load_plugins_from_file(args.plugin_file)
    elif args.plugins:
        if args.plugin_paths and len(args.plugin_paths) != len(args.plugins):
            raise RuntimeError('If you specify plugin paths it must match the plugins exactly')
        build_list = args.plugins

    logger.info("Gathering relevant modules from {}".format(build_list))

    initialize_plugins(build_list, paths=args.plugin_paths)

    result = [hook.webpack_bundle_data for hook in WebpackBundleHook().registered_hooks if hook.webpack_bundle_data]

    if args.output_file:
        logger.info("Writing webpack_json output to {}".format(args.output_file))
        with open(args.output_file, 'w') as f:
            json.dump(result, f)
    else:
        logger.info("No output file argument; writing webpack_json output to stdout.")
        logger.info(json.dumps(result))


if __name__ == '__main__':
    main()
