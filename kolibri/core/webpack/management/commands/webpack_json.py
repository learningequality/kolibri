from __future__ import absolute_import, print_function, unicode_literals

import json
import logging

from django.core.management.base import BaseCommand

from kolibri.core.webpack.hooks import WebpackBundleHook


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    args = ()
    help = 'Creates a new schema'  # @ReservedAssignment
    option_list = BaseCommand.option_list + ()

    def handle(self, *args, **options):

        logging.debug(args)

        for hook in WebpackBundleHook().registered_hooks:
            print(json.dumps(hook.webpack_bundle_data))
