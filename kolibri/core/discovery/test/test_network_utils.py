import json
from unittest import mock

import requests
from django.test import TestCase
from rest_framework.exceptions import ValidationError

import kolibri
from kolibri.utils.conf import OPTIONS
from kolibri.utils.tests.helpers import running_pid_file

from ..models import ConnectionStatus
from ..models import LocalHostname
from ..models import LocationTypes
from ..models import NetworkLocation
from ..utils.network import errors
from ..utils.network.client import NetworkClient
from ..utils.network.urls import get_normalized_url_variations
from ..viewsets.network_location import NetworkLocationSerializer
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
    databases = "__all__"

    def test_discover_from_address__skips_advertised_root_rewritten_to_self(self):
        root = "http://10.0.0.5/"
        peer = "https://10.0.0.5/"

        def request(session, method, url, **kwargs):
            base_url = root if url.startswith(root) else peer
            return mock_happy_request(base_url)(session, method, url, **kwargs)

        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "kolibri/",
            },
        ), mock.patch.object(requests.Session, "request", request):
            self.assertEqual(NetworkClient.discover_from_address(root).base_url, peer)

    def test_discover_from_address__excludes_own_mount_with_doubled_slash(self):
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": "10.0.0.5", "URL_PATH_PREFIX": "nested/lab/"},
        ), mock.patch.object(
            requests.Session,
            "request",
            mock_happy_request("http://10.0.0.5:8080/nested/lab/"),
        ):
            with self.assertRaises(errors.NetworkLocationNotFound):
                NetworkClient.discover_from_address("http://10.0.0.5:8080/nested//lab/")

    def test_discover_from_address__advertised_root_redirect_to_self(self):
        for prefix in ("kolibri/", "api/public/info/"):
            with self.subTest(prefix=prefix):
                self.assert_advertised_root_redirect_to_self_rejected(prefix)

    def assert_advertised_root_redirect_to_self_rejected(self, prefix):
        root = "http://10.0.0.5/"
        root_info = root + "api/public/info/"
        self_info = root + prefix + "api/public/info/"

        def send(adapter, request, **kwargs):
            url = request.url.split("?", 1)[0]
            if url not in (root_info, self_info):
                raise requests.ConnectionError(request=request)
            response = requests.Response()
            response.url = request.url
            response.request = request
            response.raw = mock.Mock(_original_response=None)
            response.raw._connection.sock.getpeername.return_value = ("10.0.0.5", 80)
            response._content_consumed = True
            if url == root_info:
                response.status_code = 302
                response.headers["Location"] = self_info
                response._content = b""
            else:
                response.status_code = 200
                response._content = json.dumps(mock_device_info).encode("utf-8")
            return response

        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": prefix,
            },
        ), mock.patch.object(requests.adapters.HTTPAdapter, "send", send):
            with self.assertRaises(errors.NetworkLocationNotFound):
                NetworkClient.discover_from_address(root)

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://happyurl.qqq/")
    )
    def test_discover_from_address__success(self):
        nc = NetworkClient.discover_from_address("happyurl.qqq")
        self.assertEqual(nc.base_url, "https://happyurl.qqq/")

    @mock.patch.object(
        requests.Session, "request", mock_sad_request("https://sadurl.qqq/")
    )
    def test_discover_from_address__not_found__request_failure(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient.discover_from_address("sadurl.qqq")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("http://kolibri.local:8080/")
    )
    def test_discover_from_address__excludes_own_bound_port_when_advertising(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": "10.0.0.5", "ADVERTISED_HTTP_PORT": 80},
        ):
            with self.assertRaises(errors.NetworkLocationNotFound):
                NetworkClient.discover_from_address("kolibri.local")

    @mock.patch.object(
        requests.Session,
        "request",
        mock_happy_request("http://kolibri.local:8080/kolibri/"),
    )
    def test_discover_from_address__excludes_own_bound_port_with_url_path_prefix(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "kolibri/",
            },
        ):
            with self.assertRaises(errors.NetworkLocationNotFound):
                NetworkClient.discover_from_address("kolibri.local:8080/kolibri/")

    def test_discover_from_address__excludes_own_mount_with_encoded_path(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "schöol/",
            },
        ):
            for path in ("sch%C3%B6ol/", "sch%c3%b6ol/", "schöol/"):
                url = f"http://kolibri.local:8080/{path}"
                with self.subTest(path=path), mock.patch.object(
                    requests.Session, "request", mock_happy_request(url)
                ):
                    with self.assertRaises(errors.NetworkLocationNotFound):
                        NetworkClient.discover_from_address(url)

    def test_discover_from_address__excludes_own_mount_with_encoded_unreserved_char(
        self,
    ):
        LocalHostname.objects.create(hostname="kolibri.local")
        own_info_url = "http://kolibri.local/kolibri/api/public/info/"

        def send(adapter, request, **kwargs):
            response = requests.Response()
            response.url = request.url
            response.request = request
            response._content_consumed = True
            response.raw = mock.Mock(_original_response=None)
            response.raw._connection.sock.getpeername.return_value = ("10.0.0.5", 80)
            if request.url.split("?", 1)[0] == own_info_url:
                response.status_code = 200
                response._content = json.dumps(mock_device_info).encode("utf-8")
            else:
                response.status_code = 404
                response._content = b""
            return response

        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "kolibri/",
            },
        ), mock.patch.object(requests.adapters.HTTPAdapter, "send", send):
            with self.assertRaises(errors.NetworkLocationNotFound):
                NetworkClient.discover_from_address("http://kolibri.local/%6Bolibri/")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("http://kolibri.local:8080/")
    )
    def test_discover_from_address__excludes_own_root_with_url_path_prefix(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "kolibri/",
            },
        ):
            with self.assertRaises(errors.NetworkLocationNotFound):
                NetworkClient.discover_from_address("kolibri.local:8080")

    def test_discover_from_address__finds_other_mount_on_own_origin(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "nested/lab/",
            },
        ):
            for path in ("another-kolibri/", "nested%2Flab/"):
                url = f"http://kolibri.local:8080/{path}"
                with self.subTest(path=path), mock.patch.object(
                    requests.Session, "request", mock_happy_request(url)
                ):
                    client = NetworkClient.discover_from_address(url)
                    self.assertEqual(client.base_url, url)

    def test_discover_from_address__finds_peer_at_root_after_redirect(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        origin = "http://kolibri.local:8080/"
        response = requests.Response()
        response.status_code = 200
        response._content = json.dumps(mock_device_info).encode()
        response._content_consumed = True
        response.raw = mock.Mock()
        response.raw._original_response = None
        response.raw._connection.sock.getpeername.return_value = ("10.0.0.5", 8080)
        info_url = origin + "api/public/info/"
        alias_info_url = origin + "alias/api/public/info/"
        response.url = info_url
        redirect = requests.Response()
        redirect.status_code = 302
        redirect.headers["Location"] = info_url
        redirect._content = b""
        redirect._content_consumed = True

        def send(adapter, request, **kwargs):
            if request.url.split("?", 1)[0] == alias_info_url:
                redirect.url = request.url
                redirect.request = request
                return redirect
            self.assertEqual(request.url, info_url)
            return response

        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "kolibri/",
            },
        ), mock.patch.object(requests.adapters.HTTPAdapter, "send", send):
            client = NetworkClient.discover_from_address(origin + "alias/")
        self.assertEqual(client.base_url, origin)

    def test_discover_from_address__uses_recent_peer_without_http_probe(self):
        url = "http://peer.example:8080/another/"
        NetworkLocation.objects.create(
            base_url=url, connection_status=ConnectionStatus.Okay
        )
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": "10.0.0.5", "URL_PATH_PREFIX": "kolibri/"},
        ), mock.patch.object(
            requests, "get", side_effect=requests.exceptions.ReadTimeout
        ) as probe, mock.patch.object(requests.Session, "request") as request:
            client = NetworkClient.discover_from_address(url)
        self.assertEqual(client.base_url, url)
        probe.assert_not_called()
        request.assert_not_called()

    def test_discover_from_address__finds_peer_when_local_status_is_missing(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        url = "http://kolibri.local:8080/kolibri/"
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": "10.0.0.5", "URL_PATH_PREFIX": "kolibri/"},
        ), mock.patch.object(
            requests, "get", return_value=mock_response(404)
        ), mock.patch.object(requests.Session, "request", mock_happy_request(url)):
            self.assertEqual(NetworkClient.discover_from_address(url).base_url, url)

    def test_discover_from_address__finds_peer_when_adapter_name_cannot_be_decoded(
        self,
    ):
        host = "10.0.0.5"
        peer_url = "http://10.0.0.9:8080/peer/"
        refused = requests.ConnectionError()
        refused.__cause__ = ConnectionRefusedError()
        decode_error = UnicodeDecodeError("utf-8", b"veth\xff", 4, 5, "invalid byte")

        with running_pid_file(8080, bind_address=host), mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": host, "URL_PATH_PREFIX": "kolibri/"},
        ), mock.patch.dict(
            OPTIONS["Server"], {"CHERRYPY_START": True}
        ), mock.patch.object(requests, "get", side_effect=refused), mock.patch.object(
            server.ifaddr, "get_adapters", side_effect=decode_error
        ), mock.patch.object(requests.Session, "request", mock_happy_request(peer_url)):
            self.assertEqual(
                NetworkClient.discover_from_address(peer_url).base_url, peer_url
            )

    def test_discover_from_address__excludes_own_encoded_slash_mount(self):
        origin = "http://127.0.0.1:8080/"
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "127.0.0.1",
                "ADVERTISED_HTTP_PORT": 8000,
                "URL_PATH_PREFIX": "lab%2Froom/",
            },
        ):
            encoded_url = origin + "lab%2Froom/"
            with mock.patch.object(
                requests.Session, "request", mock_happy_request(encoded_url)
            ):
                with self.assertRaises(errors.NetworkLocationNotFound):
                    NetworkClient.discover_from_address(encoded_url)

            other_mount = origin + "lab/room/"
            with mock.patch.object(
                requests.Session, "request", mock_happy_request(other_mount)
            ):
                self.assertEqual(
                    NetworkClient.discover_from_address(other_mount).base_url,
                    other_mount,
                )

    def test_validate_network_location__rejects_unparseable_hostname(self):
        with self.assertRaises(ValidationError):
            NetworkLocationSerializer().validate(
                {"base_url": "http://\u017fchool.local/"}
            )

    def test_discover_from_address__excludes_own_mount_at_literal_colon_path(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        url = "http://kolibri.local/lab:room/"
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {
                "LISTEN_ADDRESS": "10.0.0.5",
                "ADVERTISED_HTTP_PORT": 80,
                "URL_PATH_PREFIX": "lab:room/",
            },
        ), mock.patch.object(requests.Session, "request", mock_happy_request(url)):
            with self.assertRaises(errors.NetworkLocationNotFound):
                NetworkClient.discover_from_address(url)

    @mock.patch.object(requests.Session, "request", mock_not_found())
    def test_discover_from_address__not_found(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient.discover_from_address("nonkolibrihappyurl.qqq")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://happyurl.qqq/")
    )
    def test_build_for_address__success(self):
        NetworkLocation.objects.create(base_url="https://happyurl.qqq/")
        nc = NetworkClient.build_for_address("https://happyurl.qqq/")
        self.assertEqual(nc.base_url, "https://happyurl.qqq/")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://happyurl.qqq/")
    )
    def test_build_for_address__matches_via_variation(self):
        NetworkLocation.objects.create(base_url="https://happyurl.qqq/")
        nc = NetworkClient.build_for_address("happyurl.qqq")
        self.assertEqual(nc.base_url, "https://happyurl.qqq/")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("http://happyurl.qqq:8080/")
    )
    def test_build_for_address__stored_without_trailing_slash(self):
        # Stored base_urls aren't always normalized to a trailing slash —
        # `get_normalized_url_variations` always adds one, so the allowlist
        # lookup must tolerate either shape.
        NetworkLocation.objects.create(base_url="http://happyurl.qqq:8080")
        nc = NetworkClient.build_for_address("http://happyurl.qqq:8080")
        self.assertEqual(nc.base_url, "http://happyurl.qqq:8080/")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://attacker.qqq/")
    )
    def test_build_for_address__not_in_allowlist(self):
        with self.assertRaises(errors.NetworkLocationNotFound):
            NetworkClient.build_for_address("https://attacker.qqq/")

    def test_build_for_address__keep_alive_populates_device_info(self):
        # A recently-okay location takes the keep-alive fast path (no /info
        # request, so `requests` is left unmocked here) and the returned client
        # still exposes the device info we persisted for it.
        NetworkLocation.objects.create(
            base_url="https://happyurl.qqq/",
            connection_status=ConnectionStatus.Okay,
            application="kolibri",
            kolibri_version="0.20.0",
        )
        nc = NetworkClient.build_for_address("https://happyurl.qqq/")
        self.assertEqual(nc.device_info["application"], "kolibri")
        self.assertEqual(nc.device_info["kolibri_version"], "0.20.0")

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://url.qqq/")
    )
    def test_build_for_network_location__previously_not_okay(self):
        network_loc = mock.MagicMock(
            spec=NetworkLocation,
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
            spec=NetworkLocation,
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
            spec=NetworkLocation,
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
            spec=NetworkLocation,
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
            spec=NetworkLocation,
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

    @mock.patch.object(
        requests.Session, "request", mock_happy_request("https://example.com")
    )
    def test_request__user_agent(self):
        client = NetworkClient("https://example.com")
        response = client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(f"Kolibri/{kolibri.__version__}", client.headers["User-Agent"])

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
                    **mock_device_info,
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
                    **mock_device_info,
                ),
            )

    @mock.patch.object(
        requests.Session,
        "request",
        mock_happy_request("https://url.qqq/api/public/info/api/public/info/"),
    )
    def test_connect__preserves_mount_matching_info_endpoint(self):
        mount = "https://url.qqq/api/public/info/"
        with NetworkClient(mount) as client:
            self.assertTrue(client.connect())
            self.assertEqual(client.base_url, mount)

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

    def _redirect_response(self, url, location):
        response = requests.Response()
        response.url = url
        response.status_code = 302
        response.headers["Location"] = location
        return response

    def test_get_redirect_target__cross_host_blocked(self):
        response = self._redirect_response(
            "http://peer.qqq/api/info/", "http://attacker.qqq/"
        )
        with NetworkClient("http://peer.qqq/") as nc:
            self.assertIsNone(nc.get_redirect_target(response))

    def test_get_redirect_target__same_host_followed(self):
        response = self._redirect_response(
            "http://peer.qqq/api/info/", "http://peer.qqq/api/info"
        )
        with NetworkClient("http://peer.qqq/") as nc:
            self.assertEqual(
                nc.get_redirect_target(response), "http://peer.qqq/api/info"
            )
