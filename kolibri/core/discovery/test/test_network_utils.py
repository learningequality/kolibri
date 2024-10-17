import mock
import requests
from django.test import TestCase

import kolibri
from ..models import ConnectionStatus
from ..models import LocationTypes
from ..models import NetworkLocation
from ..utils.network import errors
from ..utils.network.client import NetworkClient
from ..utils.network.urls import get_normalized_url_variations
from .helpers import info as mock_device_info
from .helpers import mock_happy_request
from .helpers import mock_not_found
from .helpers import mock_response
from .helpers import mock_sad_request


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

    def test_valid_ipv4_address__dedupe_port(self):
        urls = get_normalized_url_variations("192.168.0.1:8080")
        self.assertEqual(
            urls,
            [
                "http://192.168.0.1:8080/",
                "http://192.168.0.1/",
                "http://192.168.0.1:8008/",
                "http://192.168.0.1:8000/",
                "http://192.168.0.1:5000/",
                "https://192.168.0.1:8080/",
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


class NetworkClientTestCase(TestCase):
    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://happyurl.qqq/")
    )
    def test_build_for_address__success(self):
        nc = NetworkClient.build_for_address("happyurl.qqq")
        self.assertEqual(nc.base_url, "https://happyurl.qqq/")

    @mock.patch.object(
        requests.Session, "request", mock_sad_request("https://sadurl.qqq/")
    )
    def test_build_for_address__not_found__request_failure(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient.build_for_address("sadurl.qqq")

    @mock.patch.object(requests.Session, "request", mock_not_found())
    def test_build_for_address__not_found(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient.build_for_address("nonkolibrihappyurl.qqq")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://url.qqq/")
    )
    def test_build_for_network_location__previously_not_okay(self):
        network_loc = mock.MagicMock(
            spec=NetworkLocation(),
            base_url="url.qqq",
            connection_status=ConnectionStatus.Unknown,
            location_type=LocationTypes.Dynamic,
        )
        client = NetworkClient.build_from_network_location(network_loc)
        # should have resolved the base url to something different
        self.assertNotEqual(client.base_url, network_loc.base_url)
        self.assertEqual(client.base_url, "https://url.qqq/")

    @mock.patch.object(
        requests.Session, "request", mock_sad_request("https://url.qqq/")
    )
    def test_build_for_network_location__failure(self):
        network_loc = mock.MagicMock(
            spec=NetworkLocation(),
            base_url="url.qqq",
            connection_status=ConnectionStatus.Unknown,
            location_type=LocationTypes.Dynamic,
        )
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient.build_from_network_location(network_loc)

    @mock.patch.object(
        requests.Session, "request", mock_sad_request("https://url.qqq/")
    )
    def test_build_for_network_location__no_raise(self):
        network_loc = mock.MagicMock(
            spec=NetworkLocation(),
            base_url="url.qqq",
            connection_status=ConnectionStatus.ConnectionFailure,
            location_type=LocationTypes.Dynamic,
        )
        try:
            NetworkClient.build_from_network_location(network_loc)
        except errors.NetworkLocationNotFound:
            self.fail("Should not raise NetworkLocationNotFound")

    @mock.patch.object(
        requests.Session, "request", mock_sad_request("https://url.qqq/")
    )
    def test_build_for_network_location__static(self):
        network_loc = mock.MagicMock(
            spec=NetworkLocation(),
            base_url="url.qqq",
            connection_status=ConnectionStatus.Unknown,
        )
        try:
            NetworkClient.build_from_network_location(network_loc)
        except errors.NetworkLocationNotFound:
            self.fail("Should not raise NetworkLocationNotFound")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://url.qqq/")
    )
    def test_build_for_network_location__already_okay(self):
        network_loc = mock.MagicMock(
            spec=NetworkLocation(),
            base_url="https://url.qqq/",
            connection_status=ConnectionStatus.Okay,
        )
        client = NetworkClient.build_from_network_location(network_loc)
        # should have resolved the base url to something different
        self.assertEqual(client.base_url, network_loc.base_url)
        self.assertEqual(client.base_url, "https://url.qqq/")

    def test_request__connection_failure(self):
        excs = (
            requests.exceptions.ConnectionError,
            requests.exceptions.SSLError,
            requests.exceptions.ConnectTimeout,
            requests.exceptions.URLRequired,
            requests.exceptions.MissingSchema,
            requests.exceptions.InvalidSchema,
            requests.exceptions.InvalidURL,
            requests.exceptions.InvalidHeader,
            requests.exceptions.InvalidJSONError,
        )
        for exc in excs:
            with mock.patch.object(
                requests.Session, "request", mock_not_found(default_error=exc)
            ):
                with self.assertRaises(errors.NetworkLocationConnectionFailure):
                    with NetworkClient("http://sadurl.qqq") as nc:
                        nc.connect()

    def test_request__response_timeout(self):
        excs = (
            requests.exceptions.ReadTimeout,
            requests.exceptions.TooManyRedirects,
        )
        for exc in excs:
            with mock.patch.object(
                requests.Session, "request", mock_not_found(default_error=exc)
            ):
                with self.assertRaises(errors.NetworkLocationResponseTimeout):
                    with NetworkClient("http://sadurl.qqq") as nc:
                        nc.connect()

    def test_request__response_failure(self):
        excs = (
            requests.exceptions.HTTPError,
            requests.exceptions.ContentDecodingError,
            requests.exceptions.ChunkedEncodingError,
            requests.exceptions.RequestException,
        )
        for exc in excs:
            with mock.patch.object(
                requests.Session, "request", mock_not_found(default_error=exc)
            ):
                with self.assertRaises(errors.NetworkLocationResponseFailure):
                    with NetworkClient("http://sadurl.qqq") as nc:
                        nc.connect()

    @mock.patch.object(requests.Session, "get", mock_response(200))
    def test_request__user_agent(self):
        client = NetworkClient("https://example.com")
        response = client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(
            "Kolibri/{0}".format(kolibri.__version__), client.headers["User-Agent"]
        )

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://url.qqq/")
    )
    def test_connect__success(self):
        with NetworkClient("https://url.qqq/") as nc:
            self.assertTrue(nc.connect())
            self.assertEqual(nc.base_url, "https://url.qqq/")
            self.assertEqual(
                nc.device_info,
                dict(
                    min_content_schema_version=None,
                    subset_of_users_device=False,
                    **mock_device_info
                ),
            )

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://url.qqq/prefix/")
    )
    def test_connect__success__prefixed(self):
        with NetworkClient("https://url.qqq/prefix/") as nc:
            self.assertTrue(nc.connect())
            self.assertEqual(nc.base_url, "https://url.qqq/prefix/")
            self.assertEqual(
                nc.device_info,
                dict(
                    min_content_schema_version=None,
                    subset_of_users_device=False,
                    **mock_device_info
                ),
            )

    @mock.patch.object(requests.Session, "request", mock_not_found())
    def test_connect__not_found(self):
        with self.assertRaises(errors.NetworkLocationConnectionFailure):
            with NetworkClient("https://sadurl.qqq") as nc:
                nc.connect()

    @mock.patch.object(
        requests.Session, "request", mock_sad_request("http://sadurl.qqq")
    )
    def test_connect__server_error(self):
        with NetworkClient("http://sadurl.qqq") as nc:
            self.assertFalse(nc.connect(raise_if_unavailable=False))

    @mock.patch.object(
        requests.Session,
        "request",
        mock_not_found(default_error=requests.exceptions.ReadTimeout),
    )
    def test_connect__timeout(self):
        with NetworkClient("http://erroronport80url.qqq/") as nc:
            self.assertFalse(nc.connect(raise_if_unavailable=False))

    def test_connect__not_okay(self):
        response = mock_response(204)
        response.url = "http://url.qqq/"

        with self.assertRaises(errors.NetworkLocationInvalidResponse):
            with mock.patch.object(NetworkClient, "get", return_value=response):
                with NetworkClient("http://url.qqq/") as nc:
                    nc.connect()

    def test_connect__redirected(self):
        response = mock_response(200)
        response.url = "http://url.qqq/not/the/api"

        with self.assertRaises(errors.NetworkLocationInvalidResponse):
            with mock.patch.object(NetworkClient, "get", return_value=response):
                with NetworkClient("http://url.qqq/") as nc:
                    nc.connect()

    def test_connect__not_a_kolibri(self):
        response = mock_response(200)
        response.json.return_value = {"application": "not-a-kolibri"}
        response.url = "http://url.qqq/api/public/info"

        with self.assertRaises(errors.NetworkLocationInvalidResponse):
            with mock.patch.object(NetworkClient, "get", return_value=response):
                with NetworkClient("http://url.qqq/") as nc:
                    nc.connect()

    def test_connect__invalid_json(self):
        response = mock_response(200)
        response.json.side_effect = requests.exceptions.JSONDecodeError("oops")
        response.url = "http://url.qqq/api/public/info"

        with self.assertRaises(errors.NetworkLocationInvalidResponse):
            with mock.patch.object(NetworkClient, "get", return_value=response):
                with NetworkClient("http://url.qqq/") as nc:
                    nc.connect()
