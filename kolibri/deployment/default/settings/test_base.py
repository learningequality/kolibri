from kolibri.deployment.default.settings.base import _get_postgres_ssl_options


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
