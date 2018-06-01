from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os
import random
import tempfile

import pytest
from django.conf import settings
from django.core.management import call_command
from django.test.utils import override_settings
from mock import patch

from kolibri.auth.constants.collection_kinds import FACILITY
from kolibri.utils.server import NotRunning
from kolibri.utils.server import STATUS_UNKNOWN

MOCK_DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ":memory:",
        'OPTIONS': {
            'timeout': 100,
        }
    }
}

MOCK_DB_MALFORMED_FILE = os.path.join(
    tempfile.mkdtemp(),
    "test{}.db".format(random.randint(0, 100000))
)

MOCK_DATABASES_FILE = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': MOCK_DB_MALFORMED_FILE,
        'OPTIONS': {
            'timeout': 100,
        }
    }
}


def is_sqlite_settings():
    """
    This does not work during pytest collection, needs to be called while
    executing tests!
    """
    return 'sqlite3' in settings.DATABASES['default']['ENGINE']


def mock_status_not_running():
    raise NotRunning(STATUS_UNKNOWN)


@pytest.mark.django_db
@pytest.mark.filterwarnings('ignore:Overriding setting DATABASES')
def test_recover():
    if not is_sqlite_settings():
        return
    with patch(
        "kolibri.utils.server.get_status",
        side_effect=mock_status_not_running
    ):

        # Recover corrupt database
        with override_settings(DATABASES=MOCK_DATABASES):
            from django import db
            from kolibri.auth.models import Facility
            # Destroy current connections and create new ones:
            db.connections.close_all()
            db.connections = db.ConnectionHandler()
            call_command("dbrestore", latest=True)
            # Test that the user has been restored!
            assert Facility.objects.filter(name="test latest", kind=FACILITY).count() == 1

    call_command("dbrecover", no_input=True)
