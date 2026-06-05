import os
import subprocess
import sys


def test_time_zone_falls_back_to_utc_when_get_localzone_name_returns_none():
    # get_localzone_name() silently returns None in containers where /etc/localtime
    # is a plain file with no TZ env or /etc/timezone — the None must become 'UTC'.
    code = """\
import os, tempfile
os.environ.setdefault('KOLIBRI_HOME', tempfile.mkdtemp())
from unittest.mock import patch
with patch('tzlocal.get_localzone_name', return_value=None):
    import kolibri.deployment.default.settings.base as s
assert s.TIME_ZONE == 'UTC', f'TIME_ZONE={s.TIME_ZONE!r}'"""
    result = subprocess.run(
        [sys.executable, "-c", code],
        env=os.environ.copy(),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        timeout=30,
    )
    assert result.returncode == 0, (
        "TIME_ZONE was not 'UTC' when get_localzone_name() returns None.\n\n"
        + result.stdout
    )
