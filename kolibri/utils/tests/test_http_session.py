import requests
from django.test import TestCase

from kolibri.utils.http_session import SameHostSession


def _redirect_response(url, location, status_code=302):
    """Build a Response whose .url and Location header trigger redirect logic."""
    response = requests.Response()
    response.url = url
    response.status_code = status_code
    response.headers["Location"] = location
    return response


class SameHostSessionTestCase(TestCase):
    def setUp(self):
        self.session = SameHostSession()

    def test_same_host_redirect_is_followed(self):
        resp = _redirect_response(
            "http://peer.example/api/info/", "http://peer.example/api/info"
        )
        self.assertEqual(
            self.session.get_redirect_target(resp), "http://peer.example/api/info"
        )

    def test_https_upgrade_on_same_host_is_followed(self):
        resp = _redirect_response(
            "http://peer.example/api/info/", "https://peer.example/api/info/"
        )
        self.assertEqual(
            self.session.get_redirect_target(resp),
            "https://peer.example/api/info/",
        )

    def test_relative_redirect_is_followed(self):
        resp = _redirect_response("http://peer.example/api/info/", "/new/")
        self.assertEqual(self.session.get_redirect_target(resp), "/new/")

    def test_cross_host_redirect_is_blocked(self):
        resp = _redirect_response(
            "http://peer.example/api/info/", "http://attacker.example/"
        )
        self.assertIsNone(self.session.get_redirect_target(resp))

    def test_redirect_to_cloud_metadata_is_blocked(self):
        resp = _redirect_response(
            "http://peer.example/api/info/",
            "http://169.254.169.254/latest/meta-data/",
        )
        self.assertIsNone(self.session.get_redirect_target(resp))

    def test_same_host_different_port_is_followed(self):
        resp = _redirect_response(
            "http://peer.example:80/api/info/", "http://peer.example:8080/api/info/"
        )
        self.assertEqual(
            self.session.get_redirect_target(resp),
            "http://peer.example:8080/api/info/",
        )

    def test_hostname_comparison_is_case_insensitive(self):
        resp = _redirect_response(
            "http://PEER.example/api/info/", "http://peer.example/new/"
        )
        self.assertEqual(
            self.session.get_redirect_target(resp), "http://peer.example/new/"
        )

    def test_non_redirect_response_returns_none(self):
        response = requests.Response()
        response.url = "http://peer.example/"
        response.status_code = 200
        self.assertIsNone(self.session.get_redirect_target(response))
