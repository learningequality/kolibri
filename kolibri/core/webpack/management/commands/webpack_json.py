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

    def handle(self, *args, **options):

        logging.debug(args)

        result = [hook.webpack_bundle_data for hook in WebpackBundleHook().registered_hooks if hook.webpack_bundle_data]

        if options["output_file"]:
            logger.info("Writing webpack_json output to {}".format(options["output_file"]))
            with open(options["output_file"], "w") as f:
                json.dump(result, f)
        else:
            logger.info("No output file argument; writing webpack_json output to stdout.")
            self.stdout.write(json.dumps(result))
