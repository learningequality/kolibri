"""
Settings for the Kolibri servers the integration tests spawn as subprocesses.

Base settings, plus the same fast password hasher the test suite uses. The tests
set passwords in-process and the spawned server verifies them, so the two have
to agree on the hasher; without this the server runs Django's PBKDF2 default and
its many rounds dominate user creation and login across the suite.
"""

from .base import *  # noqa isort:skip @UnusedWildImport

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
