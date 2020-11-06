"""
A settings module for running tests using a postgres db backend.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from .test import *  # noqa

try:
    isolation_level = None
    import psycopg2  # noqa

    isolation_level = psycopg2.extensions.ISOLATION_LEVEL_SERIALIZABLE
except ImportError:
    pass


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "USER": "postgres",
        "PASSWORD": "postgres",
        "NAME": os.environ.get("POSTGRES_DB") or "default",  # noqa
        "HOST": "localhost",
        "PORT": "5432",
        "TEST": {"NAME": "test"},
    },
    "default-serializable": {
        "ENGINE": "django.db.backends.postgresql",
        "USER": "postgres",
        "PASSWORD": "postgres",
        "NAME": os.environ.get("POSTGRES_DB") or "default",  # noqa
        "HOST": "localhost",
        "PORT": "5432",
        "OPTIONS": {"isolation_level": isolation_level},
        "TEST": {"MIRROR": "default"},
    },
}
