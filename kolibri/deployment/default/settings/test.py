from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os
import tempfile

# If KOLIBRI_HOME isn't defined in the test env, it's okay to just set a
# temp directory for testing.
if "KOLIBRI_HOME" not in os.environ:
    os.environ["KOLIBRI_HOME"] = tempfile.mkdtemp()


from .base import *  # noqa isort:skip @UnusedWildImport

# Create a dummy cache for each cache
CACHES = {
    key: {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}
    for key in CACHES.keys()  # noqa F405
}
