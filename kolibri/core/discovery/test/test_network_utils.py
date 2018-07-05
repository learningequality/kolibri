import mock
import requests
from django.test import TestCase

from ..utils.network.client import NetworkClient
from ..utils.network.urls import get_normalized_url_variations
from ..utils.network.urls import InvalidHostname
from ..utils.network.urls import InvalidPort
from ..utils.network.urls import InvalidScheme


class TestURLParsing(TestCase):

    def test_valid_ipv4_address(self):
        urls = get_normalized_url_variations("192.168.0.1")
        self.assertEqual(urls, [
            'http://192.168.0.1:8080/',
            'http://192.168.0.1/',
            'http://192.168.0.1:8008/',
            'https://192.168.0.1/',
        ])

    def test_valid_ipv6_address(self):
        urls = get_normalized_url_variations("2001:0db8:85a3:0000:0000:8a2e:0370:7334")
        self.assertEqual(urls, [
            'http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8080/',
            'http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]/',
            'http://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]:8008/',
            'https://[2001:0db8:85a3:0000:0000:8a2e:0370:7334]/',
        ])

    def test_valid_domain_name(self):
        urls = get_normalized_url_variations("www.nomansland.com")
        self.assertEqual(urls, [
            'http://www.nomansland.com:8080/',
            'http://www.nomansland.com/',
            'http://www.nomansland.com:8008/',
            'https://www.nomansland.com/',
        ])

    def test_valid_domain_name_with_valid_port(self):
        urls = get_normalized_url_variations("www.nomansland.com:7007")
        self.assertEqual(urls, [
            'http://www.nomansland.com:7007/',
            'http://www.nomansland.com:8080/',
            'http://www.nomansland.com/',
            'http://www.nomansland.com:8008/',
            'https://www.nomansland.com:7007/',
            'https://www.nomansland.com/',
        ])

    def test_valid_domain_name_with_path(self):
        urls = get_normalized_url_variations("www.nomansland.com/mapath")
        self.assertEqual(urls, [
            'http://www.nomansland.com:8080/mapath/',
            'http://www.nomansland.com/mapath/',
            'http://www.nomansland.com:8008/mapath/',
            'https://www.nomansland.com/mapath/',
            'http://www.nomansland.com:8080/',
            'http://www.nomansland.com/',
            'http://www.nomansland.com:8008/',
            'https://www.nomansland.com/',
        ])

    def test_valid_http_url(self):
        urls = get_normalized_url_variations("http://www.nomansland.com")
        self.assertEqual(urls, [
            'http://www.nomansland.com:8080/',
            'http://www.nomansland.com/',
            'http://www.nomansland.com:8008/',
            'https://www.nomansland.com/',
        ])

    def test_valid_https_url(self):
        urls = get_normalized_url_variations("https://www.nomansland.com")
        self.assertEqual(urls, [
            'https://www.nomansland.com/',
            'http://www.nomansland.com:8080/',
            'http://www.nomansland.com/',
            'http://www.nomansland.com:8008/',
        ])

    def test_invalid_scheme(self):
        with self.assertRaises(InvalidScheme):
            get_normalized_url_variations("ftp://www.nomansland.com")

    def test_invalid_ipv4_address(self):
        with self.assertRaises(InvalidHostname):
            get_normalized_url_variations("192.168.1")

    def test_invalid_ipv6_address(self):
        with self.assertRaises(InvalidHostname):
            get_normalized_url_variations("2001:0db8:85a3:0000:0000:0370:7334")

    def test_invalid_domain_name(self):
        with self.assertRaises(InvalidHostname):
            get_normalized_url_variations("www.nomans&land.com")

    def test_valid_domain_name_with_invalid_huge_port(self):
        with self.assertRaises(InvalidPort):
            get_normalized_url_variations("www.nomansland.com:1234567")

    def test_valid_domain_name_with_invalid_nonnumeric_port(self):
        with self.assertRaises(InvalidPort):
            get_normalized_url_variations("www.nomansland.com:1231d")


def mock_patch_decorator(func):

    def wrapper(*args, **kwargs):
        mock_object = mock.Mock()
        mock_object.json.return_value = [{'id': 1, 'name': 'studio'}]
        with mock.patch.object(requests, 'get', return_value=mock_object):
            return func(*args, **kwargs)

    return wrapper


def mock_request(session, url, *args, **kwargs):
    response = mock.Mock()
    if url == "https://nonexistent.qqq/":
        response.status_code = 200
        return response
    else:
        raise requests.ConnectionError("No can do!")


@mock.patch.object(requests.Session, 'head', mock_request)
class TestNetworkClientConnections(TestCase):

    def test_successful_connection_to_address(self):
        nc = NetworkClient(address="nonexistent.qqq")
        self.assertEqual(nc.base_url, "https://nonexistent.qqq/")

    def test_unsuccessful_connection_to_address(self):
        with self.assertRaises(requests.ConnectionError):
            NetworkClient(address="nonexistentandnotmocked.qqq")

    def test_successful_connection_to_base_url(self):
        nc = NetworkClient(base_url="https://nonexistent.qqq/")
        self.assertEqual(nc.base_url, "https://nonexistent.qqq/")

    def test_unsuccessful_connection_to_base_url(self):
        with self.assertRaises(requests.ConnectionError):
            NetworkClient(base_url="https://nonexistentandnotmocked.qqq")
