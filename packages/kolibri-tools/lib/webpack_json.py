import argparse
import importlib
import inspect
import glob
import json
import logging
import os

from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.registry import initialize

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


def expand_module_globs(build_list):
    modules = []
    for build_item in build_list:
        # Do a very simple check here, only deal with a single * at the end of something!

        if '*' in build_item:
            if (len([item for item in build_item.split('.') if item == '*']) > 1 or
                    build_item.endswith('**') or
                    build_item == '*' or
                    not build_item.endswith('*')):
                logging.error('Too many * paths, only use one per module spec')
                continue
            parent_module_path = '.'.join([item for item in build_item.split('.') if item and item != '*'])
            try:
                parent_module = importlib.import_module(parent_module_path)
            except ImportError:
                # Someone has passed us an invalid module path, carry on
                continue
            for file in glob.glob(os.path.join(os.path.dirname(parent_module.__file__), '*')):
                try:
                    file = file.replace(os.path.dirname(parent_module.__file__), '')
                    child_module_path = parent_module_path + file.replace('/', '.')
                    importlib.import_module(child_module_path)
                    # This worked, so it is a valid python module name at least
                    modules.append(child_module_path)
                except ImportError:
                    continue
        else:
            # No '*' in the module path, so just add it naively
            modules.append(build_item)
    return modules


def validate_modules(build_list):
    valid_module_names = [hook.__module__.replace('.kolibri_plugin', '') for hook in WebpackBundleHook().registered_hooks]
    for module in build_list:
        if module not in valid_module_names:
                logger.info('{} did not initialize.'.format(module))
        else:
                logger.info('Successfully initialized {}'.format(module))


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument('--plugin_file', help='the filepath to which you\'d like to run plugins from', type=str, default=None)
    parser.add_argument('--plugins', help='provide a space separated list of plugins you\'d like to run', type=str, nargs='*', default=None)
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
        build_list = args.plugins

    build_list = expand_module_globs(build_list)

    logger.info("Gathering relevant modules from {}".format(build_list))
    initialize(build_list)
    validate_modules(build_list)

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
