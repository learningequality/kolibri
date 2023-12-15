import copy

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
}


class HookMixin(object):
    """
    This hook will mock stats file JSON (normally created by npm)
    and populate it with test data according to the unique_id of the hook
    that it's mixed into.
    """

    def get_stats(self):
        self.TEST_STATS_FILE_DATA = copy.deepcopy(TEST_STATS_FILE_DATA)
        self.TEST_STATS_FILE_DATA["chunks"][self.unique_id] = self.TEST_STATS_FILE_DATA[
            "chunks"
        ].pop("untitled")
        return self.TEST_STATS_FILE_DATA


class Hook(HookMixin, WebpackBundleHook):
    bundle_id = "non_default_frontend"
