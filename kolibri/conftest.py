import ipaddress
import os
import shutil
import socket

import pytest

from kolibri.core.utils.cache import process_cache

# referenced in pytest.ini
TEMP_KOLIBRI_HOME = "./.pytest_kolibri_home"

# Network access guard
#
# Blocks all network access to non-loopback addresses for the entire test
# run, so that no test can ever depend on (or be broken by) an external
# service. Any attempt to resolve or connect to a non-local host raises
# BlockedNetworkAccessError pointing at the offending call.
#
# Tests that exercise code making outbound HTTP requests should mock at the
# requests session level, e.g. by patching ``requests.Session.request`` -
# see kolibri/core/discovery/test/helpers.py for reusable helpers.

LOOPBACK_HOSTNAMES = {"localhost", "localhost.localdomain", "ip6-localhost", ""}

_real_getaddrinfo = socket.getaddrinfo
_real_socket_connect = socket.socket.connect


class BlockedNetworkAccessError(RuntimeError):
    pass


def _is_local_host(host):
    if host is None:
        return True
    if isinstance(host, bytes):
        host = host.decode("utf-8", "replace")
    host = host.lower().rstrip(".")
    if host in LOOPBACK_HOSTNAMES:
        return True
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        # A non-local hostname that would require DNS resolution
        return False
    return ip.is_loopback or ip.is_unspecified


def _block(api, host, port):
    raise BlockedNetworkAccessError(
        "A test attempted real network access via {api} to {host}:{port}. "
        "Tests must not make requests to external services - mock them "
        "instead, e.g. by patching requests.Session.request "
        "(see kolibri/core/discovery/test/helpers.py).".format(
            api=api, host=host, port=port
        )
    )


def _guarded_getaddrinfo(host, port, *args, **kwargs):
    if not _is_local_host(host):
        _block("socket.getaddrinfo", host, port)
    return _real_getaddrinfo(host, port, *args, **kwargs)


def _guarded_socket_connect(sock, address):
    if sock.family in (socket.AF_INET, socket.AF_INET6) and isinstance(address, tuple):
        host = address[0]
        if not _is_local_host(host):
            _block("socket.connect", host, address[1] if len(address) > 1 else "")
    return _real_socket_connect(sock, address)


def _use_small_test_keys():
    # Morango generates a 2048-bit RSA keypair for every Key() (certificates,
    # instance IDs, sync setup). With the pure-Python ``rsa`` backend that
    # Kolibri ships, each keygen costs ~1-2s and dominates test setup. Key
    # *size* is irrelevant to test correctness (sign/verify still round-trips
    # and keys stay distinct), so force a small size in tests - the crypto
    # analogue of using a fast password hasher.
    #
    # Only the pure-Python backend supports arbitrary key sizes: the
    # ``cryptography`` backend stores public keys against a hardcoded 2048-bit
    # DER header (PKCS8_HEADER), so a smaller key fails to deserialize. That
    # backend (and M2Crypto) generates keys in milliseconds anyway, so there
    # is nothing to gain - only patch the slow pure-Python path.
    from morango.models.fields.crypto import Key
    from morango.models.fields.crypto import PythonRSAKey

    if Key is not PythonRSAKey:
        return

    _orig_generate = Key.generate_new_key

    def _generate_small_key(self, keysize=2048):
        return _orig_generate(self, keysize=512)

    Key.generate_new_key = _generate_small_key


def pytest_configure(config):
    socket.getaddrinfo = _guarded_getaddrinfo
    socket.socket.connect = _guarded_socket_connect
    _use_small_test_keys()


@pytest.fixture(autouse=True)
def clear_process_cache():
    process_cache.clear()


@pytest.fixture(scope="session", autouse=True)
def global_fixture():
    if not os.path.exists(TEMP_KOLIBRI_HOME):
        os.mkdir(TEMP_KOLIBRI_HOME)
    if not os.path.exists(os.path.join(TEMP_KOLIBRI_HOME, "content")):
        os.mkdir(os.path.join(TEMP_KOLIBRI_HOME, "content"))
    yield  # wait until the test ended
    if os.path.exists(TEMP_KOLIBRI_HOME):
        try:
            shutil.rmtree(TEMP_KOLIBRI_HOME)
        except OSError:
            # Don't fail a test just because we failed to cleanup
            pass
