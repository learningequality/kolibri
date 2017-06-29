from __future__ import absolute_import, print_function, unicode_literals

import os
import tempfile

# If KOLIBRI_HOME isn't defined in the test env, it's okay to just set a
# temp directory for testing.
if 'KOLIBRI_HOME' not in os.environ:
    os.environ['KOLIBRI_HOME'] = tempfile.mkdtemp()


from .base import *  # noqa isort:skip @UnusedWildImport

KOLIBRI_SKIP_AUTO_DATABASE_MIGRATION = False
