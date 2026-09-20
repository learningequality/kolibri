import os
import subprocess
import sys

import pytest
import tzlocal.utils

BACKPORT_ONLY = """\
class ZoneInfoNotFoundError(KeyError):
    pass
backport = types.ModuleType('backports.zoneinfo')
backport.ZoneInfoNotFoundError = ZoneInfoNotFoundError
backports = types.ModuleType('backports')
backports.zoneinfo = backport
sys.modules.update({'zoneinfo': None, 'backports': backports, 'backports.zoneinfo': backport})
"""


def _settings_time_zone(setup, get_localzone_name):
    code = "\n".join(
        [
            "import os, sys, tempfile, types",
            "os.environ.setdefault('KOLIBRI_HOME', tempfile.mkdtemp())",
            "from unittest.mock import patch",
            "import tzlocal",
            setup,
            f"with patch('tzlocal.get_localzone_name', {get_localzone_name}):",
            "    import kolibri.deployment.default.settings.base as s",
            "print(s.TIME_ZONE)",
        ]
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        env=os.environ.copy(),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stdout
    return result.stdout.splitlines()[-1]


def test_time_zone_falls_back_to_utc_when_get_localzone_name_returns_none():
    # get_localzone_name() silently returns None in containers where /etc/localtime
    # is a plain file with no TZ env or /etc/timezone — the None must become 'UTC'.
    assert _settings_time_zone("", "return_value=None") == "UTC"


@pytest.mark.skipif(sys.version_info < (3, 9), reason="zoneinfo is stdlib from 3.9")
def test_time_zone_falls_back_to_utc_when_tzlocal_raises_zoneinfo_error():
    assert (
        _settings_time_zone(
            "import zoneinfo",
            "side_effect=zoneinfo.ZoneInfoNotFoundError('Nowhere/Zone')",
        )
        == "UTC"
    )


@pytest.mark.skipif(
    not hasattr(tzlocal.utils, "ZoneInfoNotFoundError"),
    reason="tzlocal 5 dropped tzlocal.utils.ZoneInfoNotFoundError",
)
def test_time_zone_falls_back_to_utc_when_tzlocal_4_raises_its_own_error():
    assert (
        _settings_time_zone(
            "import tzlocal.utils",
            "side_effect=tzlocal.utils.ZoneInfoNotFoundError('Nowhere/Zone')",
        )
        == "UTC"
    )


def test_time_zone_falls_back_to_utc_with_only_the_zoneinfo_backport():
    assert (
        _settings_time_zone(
            BACKPORT_ONLY,
            "side_effect=ZoneInfoNotFoundError('Nowhere/Zone')",
        )
        == "UTC"
    )
