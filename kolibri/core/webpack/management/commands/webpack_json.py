from __future__ import absolute_import, print_function, unicode_literals

import json
import logging
from django.core.management.base import BaseCommand
from kolibri.core.webpack.hooks import WebpackBundleHook

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Creates a new schema'  # @ReservedAssignment
    
    def add_arguments(self, parser):
        parser.add_argument('--outputfile', type=str, default=None, dest="output_file")
        parser.add_argument('--build_list', type=str, default=None, nargs='*', help='enter your list of modules, space separated')
        parser.add_argument('--build_file', type=str, default=None, help='enter your file with a list of modules')

    def handle(self, *args, **options):
        logging.debug(args)

        if options["build_file"]:
           logger.info("Gathering relevant modules from {}".format(options["build_file"]))
           with open(options['build_file'], 'r') as f:
               options['build_list'] = [plugin.strip() for plugin in f.readlines() if plugin.strip()]

        valid_module_names = [hook.__module__.replace('.kolibri_plugin','') for hook in WebpackBundleHook().registered_hooks]
        if options["build_list"]:
            if 'kolibri.core' not in options['build_list']:
                options['build_list'].append('kolibri.core')
            logger.info("Gathering relevant modules from {}".format(options["build_list"]))
            for module in options['build_list']:
                if module not in valid_module_names:
                    logger.info('Ignoring {}, since {} is not a module'.format(module,module))
        result = []
        for hook in WebpackBundleHook().registered_hooks:
            if hook.webpack_bundle_data:
                if options['build_list']:
                    if hook.__module__.replace('.kolibri_plugin','') in options['build_list']:
                        result.append(hook.webpack_bundle_data)
                else:
                    result.append(hook.webpack_bundle_data)             
        if options["output_file"]:
            logger.info("Writing webpack_json output to {}".format(options["output_file"]))
            with open(options["output_file"], "w") as f:
                json.dump(result, f)
        else:
            logger.info("No output file argument; writing webpack_json output to stdout.")
            self.stdout.write(json.dumps(result))
            