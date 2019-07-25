import mock
import requests
from django.test import TestCase

from ..utils.network import errors
from ..utils.network.client import NetworkClient
from ..utils.network.urls import get_normalized_url_variations
from .helpers import mock_request


class TestURLParsing(TestCase):
    def test_valid_ipv4_address(self):
        urls = get_normalized_url_variations("192.168.0.1")
        self.assertEqual(
            urls,
            [
                "http://192.168.0.1:8080/",
                "http://192.168.0.1/",
                "http://192.168.0.1:8008/",
                "http://192.168.0.1:8000/",
                "http://192.168.0.1:5000/",
                "https://192.168.0.1/",
            ],
        )

    def test_valid_ipv6_address(self):
        urls = get_normalized_url_variations("2001:0db8:85a3:0000:0000:8a2e:0370:7334")
        self.assertEqual(
            urls,
            [
                "http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080/",
                "http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]/",
                "http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8008/",
                "http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8000/",
                "http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:5000/",
                "https://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]/",
            ],
        )

    def test_valid_domain_name(self):
        urls = get_normalized_url_variations("www.nomansland.com")
        self.assertEqual(
            urls,
            [
                "http://www.nomansland.com:8080/",
                "http://www.nomansland.com/",
                "http://www.nomansland.com:8008/",
                "http://www.nomansland.com:8000/",
                "http://www.nomansland.com:5000/",
                "https://www.nomansland.com/",
            ],
        )

    def test_valid_domain_name_with_valid_port(self):
        urls = get_normalized_url_variations("www.nomansland.com:7007")
        self.assertEqual(
            urls,
            [
                "http://www.nomansland.com:7007/",
                "http://www.nomansland.com:8080/",
                "http://www.nomansland.com/",
                "http://www.nomansland.com:8008/",
                "http://www.nomansland.com:8000/",
                "http://www.nomansland.com:5000/",
                "https://www.nomansland.com:7007/",
                "https://www.nomansland.com/",
            ],
        )

    def test_valid_domain_name_with_path(self):
        urls = get_normalized_url_variations("www.nomansland.com/mapath")
        self.assertEqual(
            urls,
            [
                "http://www.nomansland.com:8080/mapath/",
                "http://www.nomansland.com/mapath/",
                "http://www.nomansland.com:8008/mapath/",
                "http://www.nomansland.com:8000/mapath/",
                "http://www.nomansland.com:5000/mapath/",
                "https://www.nomansland.com/mapath/",
                "http://www.nomansland.com:8080/",
                "http://www.nomansland.com/",
                "http://www.nomansland.com:8008/",
                "http://www.nomansland.com:8000/",
                "http://www.nomansland.com:5000/",
                "https://www.nomansland.com/",
            ],
        )

    def test_valid_http_url(self):
        urls = get_normalized_url_variations("http://www.nomansland.com")
        self.assertEqual(
            urls,
            [
                "http://www.nomansland.com:8080/",
                "http://www.nomansland.com/",
                "http://www.nomansland.com:8008/",
                "http://www.nomansland.com:8000/",
                "http://www.nomansland.com:5000/",
                "https://www.nomansland.com/",
            ],
        )

    def test_valid_https_url(self):
        urls = get_normalized_url_variations("https://www.nomansland.com")
        self.assertEqual(
            urls,
            [
                "https://www.nomansland.com/",
                "http://www.nomansland.com:8080/",
                "http://www.nomansland.com/",
                "http://www.nomansland.com:8008/",
                "http://www.nomansland.com:8000/",
                "http://www.nomansland.com:5000/",
            ],
        )

    def test_invalid_scheme(self):
        with self.assertRaises(errors.InvalidScheme):
            get_normalized_url_variations("ftp://www.nomansland.com")

    def test_invalid_ipv4_address(self):
        with self.assertRaises(errors.InvalidHostname):
            get_normalized_url_variations("192.168.1")

    def test_invalid_ipv6_address(self):
        with self.assertRaises(errors.InvalidHostname):
            get_normalized_url_variations("2001:0db8:85a3:0000:0000:0370:7334")

    def test_invalid_domain_name(self):
        with self.assertRaises(errors.InvalidHostname):
            get_normalized_url_variations("www.nomans&land.com")

    def test_valid_domain_name_with_invalid_huge_port(self):
        with self.assertRaises(errors.InvalidPort):
            get_normalized_url_variations("www.nomansland.com:1234567")

    def test_valid_domain_name_with_invalid_nonnumeric_port(self):
        with self.assertRaises(errors.InvalidPort):
            get_normalized_url_variations("www.nomansland.com:1231d")


@mock.patch.object(requests.Session, "get", mock_request)
class TestNetworkClientConnections(TestCase):
    def test_successful_connection_to_kolibri_address(self):
        nc = NetworkClient(address="kolibrihappyurl.qqq")
        self.assertEqual(nc.base_url, "https://kolibrihappyurl.qqq/")

    def test_unsuccessful_connection_to_unavailable_address(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient(address="sadurl.qqq")

    def test_unsuccessful_connection_to_nonkolibri_address(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient(address="nonkolibrihappyurl.qqq")

    def test_successful_connection_to_address_with_port80_timeout(self):
        nc = NetworkClient(address="timeoutonport80url.qqq")
        self.assertEqual(nc.base_url, "http://timeoutonport80url.qqq:8080/")

    def test_successful_connection_to_kolibri_base_url(self):
        nc = NetworkClient(base_url="https://kolibrihappyurl.qqq/")
        self.assertEqual(nc.base_url, "https://kolibrihappyurl.qqq/")

    def test_unsuccessful_connection_to_unavailable_base_url(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient(base_url="https://sadurl.qqq")

    def test_unsuccessful_connection_to_nonkolibri_base_url(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient(base_url="nonkolibrihappyurl.qqq")

    def test_unsuccessful_connection_to_base_url_with_timeout(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient(base_url="http://timeoutonport80url.qqq/")
