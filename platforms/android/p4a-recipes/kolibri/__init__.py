from os import environ
from os.path import dirname
from os.path import join

import kolibri
from pythonforandroid.recipe import PythonRecipe


class KolibriRecipe(PythonRecipe):
    version = kolibri.__version__
    url = None
    name = "kolibri"
    # Needed because our setup.py depends on setuptools
    # See https://github.com/kivy/python-for-android/issues/2078#issuecomment-754205392
    call_hostpython_via_targetpython = False
    depends = ["python3", "setuptools"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        environ["P4A_{}_DIR".format(self.name.lower())] = join(
            dirname(__file__), "../../tar/patched"
        )

    def should_build(self, arch):
        # Always clean the build to ensure that we always update Kolibri
        return True


recipe = KolibriRecipe()
