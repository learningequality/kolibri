import imp
import os
import sys

from django.test import TestCase

from kolibri import dist as kolibri_dist

dist_dir = os.path.realpath(os.path.dirname(kolibri_dist.__file__))


class FutureAndFuturesTestCase(TestCase):
    def test_import_concurrent_py3(self):
        import concurrent

        if sys.version_info[0] == 3:
            # Python 3 is supposed to import its builtin package `concurrent`
            # instead of being inside kolibri/dist/py2only or kolibri/dist
            concurrent_parent_path = os.path.realpath(
                os.path.dirname(os.path.dirname(concurrent.__file__))
            )

            self.assertNotEqual(dist_dir, concurrent_parent_path)
            self.assertNotEqual(
                os.path.join(dist_dir, "py2only"), concurrent_parent_path
            )

    def test_import_future_py2(self):
        from future.standard_library import TOP_LEVEL_MODULES

        if sys.version_info[0] == 2:
            for module_name in TOP_LEVEL_MODULES:
                if "test" in module_name:
                    continue

                module_parent_path = os.path.realpath(
                    os.path.dirname(imp.find_module(module_name)[1])
                )
                # future's standard libraries such as `html` should not be found
                # at the same level as kolibri/dist; otherwise, python3 will try to
                # import them from kolibri/dist instead of its builtin packages
                self.assertNotEqual(dist_dir, module_parent_path)
