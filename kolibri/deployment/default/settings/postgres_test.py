"""
A settings module for running tests using a postgres db backend.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .test import *  # noqa

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "USER": "postgres",
        "PASSWORD": "",
        "NAME": os.environ.get("POSTGRES_DB") or "default",  # noqa
        "TEST": {"NAME": "travis_ci_default"},
    }
}
