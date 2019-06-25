from __future__ import unicode_literals

import io
import json
import os

presets_file = os.path.join(
    os.path.dirname(__file__), "./facility_configuration_presets.json"
)
with io.open(presets_file, mode="r", encoding="utf-8") as f:
    presets = json.load(f)

choices = [(key, key) for key in presets]

mappings = {key: item["mappings"] for key, item in presets.items()}

default = next((key for key, item in presets.items() if item.get("default")), None)
