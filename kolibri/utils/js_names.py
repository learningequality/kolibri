"""
A module that reads names used to describe Javascript global variables
that we use for bootstrapping data into templates.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import io
import json
import os

with io.open(
    os.path.join(os.path.dirname(__file__), "kolibri_js_names.json"),
    mode="r",
    encoding="utf-8",
) as f:
    names = json.load(f)
    KOLIBRI_CORE_JS_NAME = names["KOLIBRI_CORE_JS_NAME"]
    KOLIBRI_JS_PLUGIN_DATA_NAME = names["KOLIBRI_JS_PLUGIN_DATA_NAME"]
