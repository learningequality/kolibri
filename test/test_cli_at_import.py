"""
Tests for `kolibri.utils.cli` module.
These tests deliberately omit `@pytest.mark.django_db` from the tests,
so that any attempt to access the Django database during the running
of these cli methods will result in an error and test failure.
"""

from mock import patch

# Patched inside each test, after kolibri is imported: env.set_env() prepends
# kolibri/dist to sys.path, so resolving Django earlier can bind a different copy.
DJANGO_CONNECT = "django.db.backends.base.base.BaseDatabaseWrapper.connect"


def test_status_no_db_access():
    """
    Tests that status does not try to access the database
    """
    from kolibri.utils import cli

    with patch(DJANGO_CONNECT) as connect_mock:
        try:
            cli.status.callback()
        except SystemExit:
            pass
    connect_mock.assert_not_called()


def test_stop_no_db_access():
    """
    Tests that stop does not try to access the database
    """
    from kolibri.utils import cli

    with patch(DJANGO_CONNECT) as connect_mock:
        try:
            cli.stop.callback()
        except SystemExit:
            pass
    connect_mock.assert_not_called()


@patch("kolibri.utils.conf.OPTIONS")
def test_import_no_options_evaluation(options_mock):
    from kolibri.utils import cli  # noqa F401

    options_mock.__getitem__.assert_not_called()
