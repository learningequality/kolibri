from __future__ import unicode_literals

import json

from importlib_resources import files

ref = files("kolibri.core.auth.constants").joinpath(
    "facility_configuration_presets.json"
)
presets = json.loads(ref.read_text())

choices = [(key, key) for key in presets]

mappings = {key: item["mappings"] for key, item in presets.items()}

default = next((key for key, item in presets.items() if item.get("default")), None)
