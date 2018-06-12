import argparse
import json
import logging
import os
import sys

from customize_build import load_plugins_from_file

from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.registry import initialize

logger = logging.getLogger(__name__)
logging.StreamHandler(sys.stdout)
logger.setLevel(logging.INFO)

os.environ.setdefault(
    "BUILD_TIME_PLUGINS", os.path.realpath(os.path.join(os.path.dirname(__file__), "build_plugins.txt"))
)

def validate_modules(build_list):
    valid_module_names = [hook.__module__.replace('.kolibri_plugin', '') for hook in WebpackBundleHook().registered_hooks]
    for module in build_list:
        if module not in valid_module_names:
                logger.info('{} did not initialize.'.format(module))
        else:
                logger.info('Successfully initialized {}'.format(module))

def main():
    logger = logging.getLogger(__name__)
    logging.StreamHandler(sys.stdout)
    logger.setLevel(logging.INFO)
    parser = argparse.ArgumentParser()

    parser.add_argument('--plugin_file', help='the filepath to which you\'d like to run plugins from', type=str, default=None)
    parser.add_argument('--plugins', help='provide a space separated list of plugins you\'d like to run', type=str, nargs='*', default=None)
    parser.add_argument('-o', '--output_file', type=str, default=None, dest="output_file")
    args = parser.parse_args()
    build_list = []

    if args.plugin_file:
        build_list = load_plugins_from_file(args.plugin_file)
    elif args.plugins:
        build_list = args.plugins
    elif "BUILD_TIME_PLUGINS" in os.environ and os.environ["BUILD_TIME_PLUGINS"]:
        build_list = load_plugins_from_file(os.environ["BUILD_TIME_PLUGINS"])

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
