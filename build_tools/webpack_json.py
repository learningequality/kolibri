from kolibri.utils.env import set_env
set_env()
import argparse
import sys
import os
import json
import logging
from distutils import util
from kolibri.plugins.registry import initialize
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.registry import __registry
from customize_build import load_plugins_from_file

logger = logging.getLogger(__name__) 
logging.StreamHandler(sys.stdout)
logger.setLevel(logging.INFO)

os.environ.setdefault(
    "BUILD_TIME_PLUGINS", os.path.join(os.path.dirname(__file__), "default_plugins.txt")
)

def validate_modules(build_list):
    valid_module_names = [hook.__module__.replace('.kolibri_plugin','') for hook in WebpackBundleHook().registered_hooks]
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

    parser.add_argument('-i', '--input_file', help='the filepath to which you\'d like to run plugins from' ,type=str, default=None)
    parser.add_argument('-b', '--build_list', help='provide a space separated list of plugins you\'d like to run' ,type=str, nargs='*', default=None)
    parser.add_argument('-o', '--output_file', type=str, default=None, dest="output_file")
    args = parser.parse_args()
    build_list = []

    if args.input_file:
        load_plugins_from_file(args.input_file)
    elif args.build_list:
        build_list = args.build_list   
    else:
        if "BUILD_TIME_PLUGINS" in os.environ and os.environ["BUILD_TIME_PLUGINS"]:
            build_list = load_plugins_from_file(os.environ["BUILD_TIME_PLUGINS"])

    if 'kolibri.core' not in build_list:
            build_list.append('kolibri.core')
    
    logger.info("Gathering relevant modules from {}".format(build_list))
    initialize(build_list)  
    validate_modules(build_list)

    result = [hook.webpack_bundle_data for hook in WebpackBundleHook().registered_hooks if hook.webpack_bundle_data]
        
    if args.output_file:
        logger.info("Writing webpack_json output to {}".format(args.output_file))
        with open(args.output_file, "w") as f:
            json.dump(result, f)
    else:
        logger.info("No output file argument; writing webpack_json output to stdout.")
        logger.info(json.dumps(result))


if __name__ == '__main__':
    set_env()
    main()