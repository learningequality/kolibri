"""
Tests for `kolibri.utils.options` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import tempfile

import mock
import pytest
from django.conf import settings

from kolibri.utils import options

logger = logging.getLogger(__name__)


LOG_LOGGER = []


def log_logger(logger_instance, LEVEL, msg, args, **kwargs):
    """
    Monkeypatching for logging.Logger._log to scoop up log messages if we wanna
    test something specific was logged.
    """
    LOG_LOGGER.append(
        (LEVEL, msg)
    )
    # Call the original function
    logger_instance.__log(LEVEL, msg, args, **kwargs)


def activate_log_logger(monkeypatch):
    """
    Activates logging everything to ``LOG_LOGGER`` with the monkeypatch pattern
    of py.test (test accepts a ``monkeypatch`` argument)
    """
    monkeypatch.setattr(logging.Logger, '__log', logging.Logger._log, raising=False)
    monkeypatch.setattr(logging.Logger, '_log', log_logger)


def test_option_reading_and_precedence_rules():
    """
    Checks that options can be read from a dummy options.ini file, and overridden by env vars.
    """
    _CONTENT_DIR = "/mycontentdir"
    _HTTP_PORT_INI = 7007
    _HTTP_PORT_ENV = 9009

    _, tmp_ini_path = tempfile.mkstemp(prefix='options', suffix='.ini')
    with open(tmp_ini_path, "w") as f:
        f.write("\n".join([
            "[Paths]",
            "CONTENT_DIR = {dir}".format(dir=_CONTENT_DIR),
            "[Deployment]",
            "HTTP_PORT = {port}".format(port=_HTTP_PORT_INI),
        ]))

    # when env vars are empty, values are drawn from ini file
    with mock.patch.dict(os.environ, {'KOLIBRI_CONTENT_DIR': '', 'KOLIBRI_HTTP_PORT': '', 'KOLIBRI_LISTEN_PORT': ''}):
        OPTIONS = options.read_options_file(settings.KOLIBRI_HOME, ini_filename=tmp_ini_path)
        assert OPTIONS["Paths"]["CONTENT_DIR"] == _CONTENT_DIR
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_INI

    # when an env var is set, use those instead of ini file values
    with mock.patch.dict(os.environ, {'KOLIBRI_HTTP_PORT': '', 'KOLIBRI_LISTEN_PORT': str(_HTTP_PORT_ENV)}):
        OPTIONS = options.read_options_file(settings.KOLIBRI_HOME, ini_filename=tmp_ini_path)
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_ENV

    # when a higher precedence env var is set, it overrides the lower precedence env var
    with mock.patch.dict(os.environ, {'KOLIBRI_HTTP_PORT': str(_HTTP_PORT_ENV), 'KOLIBRI_LISTEN_PORT': '88888'}):
        OPTIONS = options.read_options_file(settings.KOLIBRI_HOME, ini_filename=tmp_ini_path)
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_ENV


def test_improper_settings_display_errors_and_exit(monkeypatch):
    """
    Checks that options can be read from a dummy options.ini file, and overridden by env vars.
    """

    activate_log_logger(monkeypatch)

    _, tmp_ini_path = tempfile.mkstemp(prefix='options', suffix='.ini')

    # non-numeric arguments for an integer option in the ini file cause it to bail
    with open(tmp_ini_path, "w") as f:
        f.write("\n".join([
            "[Deployment]",
            "HTTP_PORT = abba",
        ]))
    with mock.patch.dict(os.environ, {'KOLIBRI_HTTP_PORT': '', 'KOLIBRI_LISTEN_PORT': ''}):
        with pytest.raises(SystemExit):
            options.read_options_file(settings.KOLIBRI_HOME, ini_filename=tmp_ini_path)
        assert 'value "abba" is of the wrong type' in LOG_LOGGER[-2][1]

    # non-numeric arguments for an integer option in the env var cause it to bail, even when ini file is ok
    with open(tmp_ini_path, "w") as f:
        f.write("\n".join([
            "[Deployment]",
            "HTTP_PORT = 1278",
        ]))
    with mock.patch.dict(os.environ, {'KOLIBRI_HTTP_PORT': 'baba', 'KOLIBRI_LISTEN_PORT': ''}):
        with pytest.raises(SystemExit):
            options.read_options_file(settings.KOLIBRI_HOME, ini_filename=tmp_ini_path)
        assert 'value "baba" is of the wrong type' in LOG_LOGGER[-2][1]

    # invalid choice for "option" type causes it to bail
    with open(tmp_ini_path, "w") as f:
        f.write("\n".join([
            "[Database]",
            "DATABASE_ENGINE = penguin",
        ]))
    with mock.patch.dict(os.environ, {'KOLIBRI_DATABASE_ENGINE': ''}):
        with pytest.raises(SystemExit):
            options.read_options_file(settings.KOLIBRI_HOME, ini_filename=tmp_ini_path)
        assert 'value "penguin" is unacceptable' in LOG_LOGGER[-2][1]
