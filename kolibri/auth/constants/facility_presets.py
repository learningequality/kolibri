from __future__ import unicode_literals

import json
import os

from django.utils.translation import ugettext_lazy as _

with open(os.path.join(os.path.dirname(__file__), './facility_configuration_presets.json'), 'r') as f:
    presets = json.load(f)

choices = list(
    (key, _(item['name'])) for key, item in presets.items()
)

mappings = {
    key: item['mappings'] for key, item in presets.items()
}

default = next((key for key, item in presets.items() if item.get('default')), None)
