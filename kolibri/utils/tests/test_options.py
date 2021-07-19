"""
Tests for `kolibri.utils.options` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import os
import sys
import tempfile
from contextlib import contextmanager

import mock
import pytest

from kolibri.utils import options

logger = logging.getLogger(__name__)


LOG_LOGGER = []


def log_logger(logger_instance, LEVEL, msg, args, **kwargs):
    """
    Monkeypatching for logging.Logger._log to scoop up log messages if we wanna
    test something specific was logged.
    """
    LOG_LOGGER.append((LEVEL, msg))
    # Call the original function
    logger_instance.__log(LEVEL, msg, args, **kwargs)


@contextmanager
def activate_log_logger(monkeypatch):
    """
    Activates logging everything to ``LOG_LOGGER`` with the monkeypatch pattern
    of py.test (test accepts a ``monkeypatch`` argument)
    """
    monkeypatch.setattr(logging.Logger, "__log", logging.Logger._log, raising=False)
    monkeypatch.setattr(logging.Logger, "_log", log_logger)
    yield
    # Use this to clear the list for Py2 compatibility
    del LOG_LOGGER[:]


def test_option_reading_and_precedence_rules():
    """
    Checks that options can be read from a dummy options.ini file, and overridden by env vars.
    """
    if sys.platform == "win32":
        _CONTENT_DIR = "C:\\mycontentdir"
    else:
        _CONTENT_DIR = "/mycontentdir"
    _HTTP_PORT_INI = 7007
    _HTTP_PORT_ENV = 9009

    _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")
    with open(tmp_ini_path, "w") as f:
        f.write(
            "\n".join(
                [
                    "[Paths]",
                    "CONTENT_DIR = {dir}".format(dir=_CONTENT_DIR),
                    "[Deployment]",
                    "HTTP_PORT = {port}".format(port=_HTTP_PORT_INI),
                ]
            )
        )

    # when env vars are empty, values are drawn from ini file
    with mock.patch.dict(
        os.environ,
        {"KOLIBRI_CONTENT_DIR": "", "KOLIBRI_HTTP_PORT": "", "KOLIBRI_LISTEN_PORT": ""},
    ):
        OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
        assert OPTIONS["Paths"]["CONTENT_DIR"] == _CONTENT_DIR
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_INI

    # when an env var is set, use those instead of ini file values
    with mock.patch.dict(
        os.environ,
        {"KOLIBRI_HTTP_PORT": "", "KOLIBRI_LISTEN_PORT": str(_HTTP_PORT_ENV)},
    ):
        OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_ENV

    # when a higher precedence env var is set, it overrides the lower precedence env var
    with mock.patch.dict(
        os.environ,
        {"KOLIBRI_HTTP_PORT": str(_HTTP_PORT_ENV), "KOLIBRI_LISTEN_PORT": "64000"},
    ):
        OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_ENV


def test_default_envvar_generation():
    """
    Checks that options can be read from a dummy options.ini file, and overridden by env vars.
    """
    if sys.platform == "win32":
        _CONTENT_DIR = "C:\\mycontentdir"
    else:
        _CONTENT_DIR = "/mycontentdir"

    _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")

    # when an env var is set, use those instead of ini file values
    with mock.patch.dict(
        os.environ,
        {"KOLIBRI_CONTENT_DIR": _CONTENT_DIR},
    ):
        OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
        assert OPTIONS["Paths"]["CONTENT_DIR"] == _CONTENT_DIR


def test_improper_settings_display_errors_and_exit(monkeypatch):
    """
    Checks invalid options log errors and exit.
    """

    with activate_log_logger(monkeypatch):

        _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")

        # non-numeric arguments for an integer option in the ini file cause it to bail
        with open(tmp_ini_path, "w") as f:
            f.write("\n".join(["[Deployment]", "HTTP_PORT = abba"]))
        with mock.patch.dict(
            os.environ, {"KOLIBRI_HTTP_PORT": "", "KOLIBRI_LISTEN_PORT": ""}
        ):
            with pytest.raises(SystemExit):
                options.read_options_file(ini_filename=tmp_ini_path)
            assert 'value "abba" is of the wrong type' in LOG_LOGGER[-2][1]

        # non-numeric arguments for an integer option in the env var cause it to bail, even when ini file is ok
        with open(tmp_ini_path, "w") as f:
            f.write("\n".join(["[Deployment]", "HTTP_PORT = 1278"]))
        with mock.patch.dict(
            os.environ, {"KOLIBRI_HTTP_PORT": "baba", "KOLIBRI_LISTEN_PORT": ""}
        ):
            with pytest.raises(SystemExit):
                options.read_options_file(ini_filename=tmp_ini_path)
            assert 'value "baba" is of the wrong type' in LOG_LOGGER[-2][1]

        # invalid choice for "option" type causes it to bail
        with open(tmp_ini_path, "w") as f:
            f.write("\n".join(["[Database]", "DATABASE_ENGINE = penguin"]))
        with mock.patch.dict(os.environ, {"KOLIBRI_DATABASE_ENGINE": ""}):
            with pytest.raises(SystemExit):
                options.read_options_file(ini_filename=tmp_ini_path)
            assert 'value "penguin" is unacceptable' in LOG_LOGGER[-2][1]


def test_deprecated_values_ini_file(monkeypatch):
    """
    Checks that deprecated options log warnings.
    """

    with activate_log_logger(monkeypatch):

        _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")

        # deprecated options in the ini file log warnings
        with open(tmp_ini_path, "w") as f:
            f.write("\n".join(["[Server]", "CHERRYPY_START = false"]))
        options.read_options_file(ini_filename=tmp_ini_path)
        assert any("deprecated" in msg[1] for msg in LOG_LOGGER)


def test_deprecated_values_envvars(monkeypatch):
    """
    Checks that deprecated options log warnings.
    """

    with activate_log_logger(monkeypatch):

        _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")
        # deprecated options in the envvars log warnings
        with open(tmp_ini_path, "w") as f:
            f.write("\n")
        with mock.patch.dict(os.environ, {"KOLIBRI_CHERRYPY_START": "false"}):
            options.read_options_file(ini_filename=tmp_ini_path)
            assert any("deprecated" in msg[1] for msg in LOG_LOGGER)


def test_deprecated_envvars(monkeypatch):
    """
    Checks that deprecated options log warnings.
    """

    with activate_log_logger(monkeypatch):

        _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")
        # deprecated envvars for otherwise valid options log warnings
        with open(tmp_ini_path, "w") as f:
            f.write("\n")
        with mock.patch.dict(
            os.environ, {"KOLIBRI_LISTEN_PORT": "1234", "KOLIBRI_HTTP_PORT": ""}
        ):
            options.read_options_file(ini_filename=tmp_ini_path)
            assert any("deprecated" in msg[1] for msg in LOG_LOGGER)


def test_deprecated_aliases(monkeypatch):
    """
    Checks that deprecated options log warnings.
    """

    with activate_log_logger(monkeypatch):

        _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")
        # deprecated aliases for otherwise valid options log warnings
        with open(tmp_ini_path, "w") as f:
            f.write("\n".join(["[Cache]", "CACHE_REDIS_MIN_DB = 7"]))
        options.read_options_file(ini_filename=tmp_ini_path)
        assert any("deprecated" in msg[1] for msg in LOG_LOGGER)


def test_deprecated_aliases_envvars(monkeypatch):
    """
    Checks that deprecated options log warnings.
    """

    with activate_log_logger(monkeypatch):

        _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")
        # envvars for deprecated aliases of otherwise valid options log warnings
        with open(tmp_ini_path, "w") as f:
            f.write("\n")
        with mock.patch.dict(os.environ, {"KOLIBRI_CACHE_REDIS_MIN_DB": "1234"}):
            options.read_options_file(ini_filename=tmp_ini_path)
            assert any("deprecated" in msg[1] for msg in LOG_LOGGER)


def test_option_writing():
    """
    Checks that options can be written to a dummy options.ini file, validated, and then read back.
    """
    if sys.platform == "win32":
        _OLD_CONTENT_DIR = "C:\\mycontentdir"
        _NEW_CONTENT_DIR = "C:\\goodnessme"
    else:
        _OLD_CONTENT_DIR = "/mycontentdir"
        _NEW_CONTENT_DIR = "/goodnessme"
    _HTTP_PORT_GOOD = 7007
    _HTTP_PORT_BAD = "abba"

    _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")
    with open(tmp_ini_path, "w") as f:
        f.write(
            "\n".join(
                [
                    "[Paths]",
                    "CONTENT_DIR = {dir}".format(dir=_OLD_CONTENT_DIR),
                    "[Deployment]",
                    "HTTP_PORT = {port}".format(port=_HTTP_PORT_GOOD),
                ]
            )
        )

    with mock.patch.dict(
        os.environ, {"KOLIBRI_HTTP_PORT": "", "KOLIBRI_LISTEN_PORT": ""}
    ):

        # check that values are set correctly to begin with
        OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
        assert OPTIONS["Paths"]["CONTENT_DIR"] == _OLD_CONTENT_DIR
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_GOOD

        # change the content directory to something new
        options.update_options_file(
            "Paths",
            "CONTENT_DIR",
            _NEW_CONTENT_DIR,
            ini_filename=tmp_ini_path,
        )

        # try changing the port to something bad, which should throw an error
        with pytest.raises(ValueError):
            options.update_options_file(
                "Deployment",
                "HTTP_PORT",
                _HTTP_PORT_BAD,
                ini_filename=tmp_ini_path,
            )

        # check that the properly validated option was set correctly, and the invalid one wasn't
        OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
        assert OPTIONS["Paths"]["CONTENT_DIR"] == _NEW_CONTENT_DIR
        assert OPTIONS["Deployment"]["HTTP_PORT"] == _HTTP_PORT_GOOD


def test_path_expansion():
    """
    Checks that options under [Path] have "~" expanded, and are relativized to the KOLIBRI_HOME directory.
    """
    KOLIBRI_HOME_TEMP = tempfile.mkdtemp()
    logs_dir = os.path.join(KOLIBRI_HOME_TEMP, "logs")
    if not os.path.exists(logs_dir):
        os.mkdir(logs_dir)

    _, tmp_ini_path = tempfile.mkstemp(prefix="options", suffix=".ini")

    absolute_path = "C:\\absolute" if sys.platform == "win32" else "/absolute"

    with mock.patch("kolibri.utils.conf.KOLIBRI_HOME", KOLIBRI_HOME_TEMP):

        with mock.patch.dict(os.environ, {"KOLIBRI_CONTENT_DIR": absolute_path}):
            OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
            assert OPTIONS["Paths"]["CONTENT_DIR"] == absolute_path

        with mock.patch.dict(os.environ, {"KOLIBRI_CONTENT_DIR": "relative"}):
            OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
            assert OPTIONS["Paths"]["CONTENT_DIR"] == os.path.join(
                KOLIBRI_HOME_TEMP, "relative"
            )

        user_path = os.path.join("~", "homeiswherethecatis")

        with mock.patch.dict(os.environ, {"KOLIBRI_CONTENT_DIR": user_path}):
            OPTIONS = options.read_options_file(ini_filename=tmp_ini_path)
            assert OPTIONS["Paths"]["CONTENT_DIR"] == os.path.expanduser(user_path)
