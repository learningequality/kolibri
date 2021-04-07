from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import copy
import json
import tempfile

from ..hooks import WebpackBundleHook


TEST_STATS_FILE_DATA = {
    "status": "done",
    "chunks": {
        "untitled": [
            {
                "name": "non_default_frontend-2c4fb3d6a29238b06f84.js",
                "publicPath": "non_default_frontend/non_default_frontend-2c4fb3d6a29238b06f84.js",
                "path": "kolibri/core/static/non_default_frontend/non_default_frontend-2c4fb3d6a29238b06f84.js",
            }
        ]
    },
    "publicPath": "default_frontend/",
    "messages": "true",
}


class HookMixin(object):
    """
    This hook will automatically create a stats file (normally created by npm)
    and populate it with test data according to the unique_id of the hook
    that it's mixed into.
    """

    @property
    def _stats_file(self):
        _, filename = tempfile.mkstemp()
        self.TEST_STATS_FILE = open(filename, mode="w+")
        self.TEST_STATS_FILE_DATA = copy.deepcopy(TEST_STATS_FILE_DATA)
        self.TEST_STATS_FILE_DATA["chunks"][self.unique_id] = self.TEST_STATS_FILE_DATA[
            "chunks"
        ].pop("untitled")
        json.dump(self.TEST_STATS_FILE_DATA, self.TEST_STATS_FILE)
        self.TEST_STATS_FILE.close()
        print(self.unique_id)
        return self.TEST_STATS_FILE.name


class Hook(HookMixin, WebpackBundleHook):
    bundle_id = "non_default_frontend"
