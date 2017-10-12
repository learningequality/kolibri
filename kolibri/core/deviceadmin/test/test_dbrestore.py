from __future__ import print_function, unicode_literals, absolute_import

import pytest

from kolibri.dist.django.core.management import call_command


def test_latest():

    with pytest.raises(RuntimeError):
        call_command("dbrestore", latest=True)
