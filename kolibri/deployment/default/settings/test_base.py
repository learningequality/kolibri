from kolibri.deployment.default.settings import base
from kolibri.deployment.default.settings.base import _get_postgres_ssl_options
from kolibri.deployment.default.settings.base import _get_session_cookie_age
from kolibri.utils import conf


def test_get_postgres_ssl_options_disabled():
    assert (
        _get_postgres_ssl_options(
            {"DATABASE_SSL_MODE": "disable", "DATABASE_SSL_ROOT_CERT": ""}
        )
        == {}
    )


def test_get_postgres_ssl_options_with_mode_only():
    assert _get_postgres_ssl_options(
        {"DATABASE_SSL_MODE": "require", "DATABASE_SSL_ROOT_CERT": ""}
    ) == {"sslmode": "require"}


def test_get_postgres_ssl_options_with_root_cert():
    assert _get_postgres_ssl_options(
        {
            "DATABASE_SSL_MODE": "verify-full",
            "DATABASE_SSL_ROOT_CERT": "  /tmp/ca.pem  ",
        }
    ) == {"sslmode": "verify-full", "sslrootcert": "/tmp/ca.pem"}


def test_get_postgres_ssl_options_skips_whitespace_only_cert():
    assert _get_postgres_ssl_options(
        {
            "DATABASE_SSL_MODE": "verify-ca",
            "DATABASE_SSL_ROOT_CERT": "   ",
        }
    ) == {"sslmode": "verify-ca"}


def test_get_session_cookie_age_zero_is_unlimited():
    assert _get_session_cookie_age(0) == 52560000


def test_get_session_cookie_age_preserves_configured_value():
    assert _get_session_cookie_age(1200) == 1200


def test_session_settings_wired_from_auto_logout_time():
    assert base.SESSION_EXPIRE_AT_BROWSER_CLOSE is False
    # Not hardcoded — derived from the AUTO_LOGOUT_TIME option.
    assert base.SESSION_COOKIE_AGE == _get_session_cookie_age(
        conf.OPTIONS["Deployment"]["AUTO_LOGOUT_TIME"]
    )
