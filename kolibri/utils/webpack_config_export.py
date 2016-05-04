import importlib
import json
import sys

# Import cli in order to set environment vars that are required to import the modules below.
from . import cli

if __name__ == "__main__":
    # Assert cli is imported, as otherwise, we have an unimported module that we are relying on for a side effect.
    assert cli
    module_name = sys.argv[1]
    module = importlib.import_module(module_name)
    for plugin in module.PLUGINS:
        if "webpack_bundle_data" in dir(plugin):
            print(json.dumps(plugin.webpack_bundle_data()))
