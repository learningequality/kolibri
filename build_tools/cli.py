#TODO given the list of pl ugins that you want from here, pass that to initialize
#TODO from options['build_list'] take the list and call initialize on items
#TODO if no options call initialize normally 
#TODO error checks
#MAKE THE NEW FILE IN BUILD_TOOLS and make the command line tool 
#IN __NAME == MAIN in customize_build.py, add my function there
#inspiration from install_Cexts.py
from kolibri.utils.env import set_env
set_env()
import argparse
import sys
import os
import logging
import os
import sys
from distutils import util
from kolibri.plugins.registry import initialize
from kolibri.core.webpack.hooks import WebpackBundleHook


logger = logging.getLogger(__name__) 
logging.StreamHandler(sys.stdout)
logger.setLevel(logging.INFO)

def main():
    logger = logging.getLogger(__name__) 
    logging.StreamHandler(sys.stdout)
    logger.setLevel(logging.INFO)
    
    valid_module_names = [hook.__module__.replace('.kolibri_plugin','') for hook in WebpackBundleHook().registered_hooks]
    parser = argparse.ArgumentParser()

    parser.add_argument('-i', '--input_file', help='the filepath to which you\'d like to run plugins from' ,type=str, default=None)
    parser.add_argument('-b', '--build_list', help='provide a space separated list of plugins you\'d like to run' ,type=str, nargs='*', default=None)
    args = parser.parse_args()

    if args.input_file:
        result = []
        with open(args.input_file) as file:
            build_list = [plugin.strip() for plugin in file.readlines() if plugin.strip()]
            if 'kolibri.core' not in build_list:
                build_list.append('kolibri.core')
            logger.info("Gathering relevant modules from {}".format(build_list))
            for module in build_list:
                if module not in valid_module_names:
                    logger.info('Ignoring {}, since {} is not a module'.format(module,module))
                else:
                    result.append(module)
             initialize(result)
             
    elif args.build_list:
        initialize(args.build_list)
    
if __name__ == '__main__':
    set_env()
    main()