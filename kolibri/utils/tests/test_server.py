"""
Tests for `kolibri.utils.server` module.
"""

import contextlib
import os
import sys
import threading
from unittest import mock
from unittest import TestCase
from urllib.parse import urlparse

import ifaddr
import pytest
from django.test import TestCase as DjangoTestCase

from kolibri.core.discovery.models import LocalHostname
from kolibri.core.tasks.worker import WorkerSupervisor
from kolibri.utils import server
from kolibri.utils.conf import OPTIONS
from kolibri.utils.constants import installation_types
from kolibri.utils.tests.helpers import running_pid_file


class TestServerInstallation:
    @mock.patch("sys.argv", ["kolibri-0.9.3.pex", "start"])
    def test_pex(self):
        install_type = server.installation_type()
        assert install_type == installation_types.PEX

    def test_dev(self):
        with mock.patch("os.environ", {"KOLIBRI_DEVELOPER_MODE": "True"}):
            install_type = server.installation_type()
            assert install_type == "devserver"

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    @mock.patch("os.environ", {"KOLIBRI_INSTALLER_VERSION": "1.0"})
    def test_dpkg(self):
        with mock.patch("kolibri.utils.server.check_output", return_value=""):
            install_type = server.installation_type()
            assert install_type == installation_types.install_type_map[
                installation_types.DEB
            ].format("1.0")

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_dpkg_version(self):
        DPKG_OUTPUT = """
        Package: kolibri
        Status: install ok installed
        Priority: optional
        Section: education
        Architecture: all
        Source: kolibri-source
        Version: 0.15.0~beta2-0ubuntu1
        Depends: python3 (>= 3.4), python3-pkg-resources, adduser
        Recommends: python3-cryptography (>= 1.2.3)
        """
        with mock.patch("kolibri.utils.server.check_output", return_value=DPKG_OUTPUT):
            install_type = server.installation_type()
            assert install_type == installation_types.install_type_map[
                installation_types.DEB
            ].format("0.15.0~beta2-0ubuntu1")

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    @mock.patch("os.environ", {"KOLIBRI_INSTALLER_VERSION": "1.0"})
    def test_apt(apt):
        with mock.patch("kolibri.utils.server.check_output", return_value="any repo"):
            install_type = server.installation_type()
            assert install_type == installation_types.install_type_map[
                installation_types.DEB
            ].format("1.0")

    @mock.patch("sys.argv", ["/usr/local/bin/kolibri", "start"])
    def test_whl(self):
        install_type = server.installation_type()
        assert (
            install_type == installation_types.install_type_map[installation_types.WHL]
        )


class TestServerServices:
    @mock.patch("kolibri.core.analytics.tasks.schedule_ping")
    @mock.patch("kolibri.core.tasks.main.initialize_workers")
    @mock.patch(
        "kolibri.core.discovery.utils.network.broadcast.NetworkDiscoveryBackend"
    )
    def test_required_services_initiate_on_start(
        self,
        mock_network_discovery_backend,
        initialize_workers,
        schedule_ping,
    ):
        # Start server services
        services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"))
        services_plugin.START()

        # Do we initialize workers when services start?
        initialize_workers.assert_called_once()

        mock_network_discovery_backend.assert_not_called()

    def test_services_shutdown_on_stop(self):
        # Initialize and ready services plugin for testing
        services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"))

        services_plugin.worker = mock.MagicMock(
            name="worker", spec_set=WorkerSupervisor
        )

        # Now, let us stop services plugin
        services_plugin.STOP()

        # Do we shutdown workers correctly?
        assert services_plugin.worker.shutdown.call_count == 1
        assert services_plugin.worker.mock_calls == [
            mock.call.shutdown(wait=True),
        ]


class TestProcessHookWiring:
    @mock.patch("kolibri.utils.server.KolibriProcessHook")
    def test_hooks_subscribe_on_services_bus(self, mock_process_hook, tmp_path):
        # Process hooks must wire onto the services bus, not only the full server
        # bus, so plugins like task scheduling run under `kolibri services` too.
        plugin = mock.MagicMock()
        hook = mock.MagicMock()
        hook.MagicBusPluginClass.return_value = plugin
        mock_process_hook.registered_hooks = [hook]

        bus = server.KolibriServicesProcessBus(pid_file=str(tmp_path / "pid"))

        hook.MagicBusPluginClass.assert_called_once_with(bus)
        plugin.subscribe.assert_called_once_with()


class TestPIDPluginSetPidFile:
    @pytest.fixture
    def bus(self, tmp_path):
        bus = mock.MagicMock()
        bus.pid_file = str(tmp_path / "server.pid")
        bus.port = 8080
        bus.zip_port = 8081
        return bus

    @pytest.mark.skipif(
        sys.platform == "win32",
        reason="Windows refuses os.replace onto an open file, so the write falls back to in-place",
    )
    def test_pid_file_stays_readable_while_concurrently_rewritten(self, bus):
        plugin = server.PIDPlugin(bus)
        writes_done = threading.Event()
        read_statuses = set()
        write_errors = []

        def write_repeatedly():
            try:
                for _ in range(300):
                    plugin.set_pid_file(server.STATUS_RUNNING)
            except Exception as e:
                write_errors.append(e)

        def read_until_writes_done():
            while not writes_done.is_set():
                read_statuses.add(server._read_pid_file(bus.pid_file)[3])

        reader = threading.Thread(target=read_until_writes_done)
        writers = [threading.Thread(target=write_repeatedly) for _ in range(2)]
        reader.start()
        for writer in writers:
            writer.start()
        for writer in writers:
            writer.join()
        writes_done.set()
        reader.join()

        assert write_errors == []
        assert server.STATUS_PID_FILE_INVALID not in read_statuses

    @mock.patch.object(server, "PID_FILE_REPLACE_TIMEOUT", 0)
    def test_persistently_refused_replace_still_writes_pid_file(self, bus, tmp_path):
        plugin = server.PIDPlugin(bus)

        with mock.patch.object(server.os, "replace", side_effect=PermissionError):
            plugin.set_pid_file(server.STATUS_RUNNING)

        assert server._read_pid_file(bus.pid_file) == (
            os.getpid(),
            bus.port,
            bus.zip_port,
            server.STATUS_RUNNING,
        )
        assert os.listdir(tmp_path) == ["server.pid"]

    def test_briefly_refused_replace_still_replaces_pid_file(self, bus):
        plugin = server.PIDPlugin(bus)
        original_inode = os.stat(bus.pid_file).st_ino
        real_replace = os.replace
        refusals = [PermissionError, PermissionError]

        def replace_after_refusals(src, dst):
            if refusals:
                raise refusals.pop()
            real_replace(src, dst)

        with mock.patch.object(server.os, "replace", replace_after_refusals):
            plugin.set_pid_file(server.STATUS_RUNNING)

        assert os.stat(bus.pid_file).st_ino != original_inode
        assert server._read_pid_file(bus.pid_file)[3] == server.STATUS_RUNNING

    def test_failed_replace_leaves_no_temp_file(self, bus, tmp_path):
        plugin = server.PIDPlugin(bus)

        with mock.patch.object(server.os, "replace", side_effect=OSError):
            with pytest.raises(OSError):
                plugin.set_pid_file(server.STATUS_RUNNING)

        assert os.listdir(tmp_path) == ["server.pid"]


class TestZeroConfPlugin:
    @mock.patch("kolibri.core.discovery.utils.network.search.NetworkLocationListener")
    @mock.patch(
        "kolibri.core.discovery.utils.network.broadcast.build_broadcast_instance"
    )
    @mock.patch(
        "kolibri.core.discovery.utils.network.broadcast.NetworkDiscoveryBackend"
    )
    def test_required_services_initiate_on_start(
        self, mock_network_discovery_backend, mock_build_instance, *args
    ):
        # Start zeroconf services
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        zeroconf_plugin.START()

        mock_network_discovery_backend.assert_not_called()

        zeroconf_plugin.SERVING(1234)
        zeroconf_plugin.RUN()

        # Do we register ourselves on zeroconf?
        mock_network_discovery_backend.assert_called()
        mock_network_discovery_backend().start_broadcast.assert_called_once_with()
        mock_build_instance.assert_called_once_with(1234)

        zeroconf_plugin.STOP()

    @pytest.mark.django_db(databases="__all__", transaction=True)
    @mock.patch(
        "kolibri.core.discovery.utils.network.broadcast.NetworkDiscoveryBackend"
    )
    def test_broadcasts_advertised_port(self, mock_backend):
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 8080)
        with mock.patch.dict(OPTIONS["Deployment"], {"ADVERTISED_HTTP_PORT": 9000}):
            zeroconf_plugin.SERVING(8080)
            zeroconf_plugin.RUN()
        (instance,), _kwargs = mock_backend.call_args
        assert instance.port == 9000

    @mock.patch(
        "kolibri.core.discovery.utils.network.broadcast.NetworkDiscoveryBackend"
    )
    def test_services_shutdown_on_stop(self, mock_network_discovery_backend):
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        backend = mock_network_discovery_backend()
        zeroconf_plugin.backend = backend
        # Now, let us stop services plugin
        zeroconf_plugin.STOP()

        # Do we unregister ourselves from zeroconf network?
        backend.stop_broadcast.assert_called_once()

    def test_monitor_tick_before_backend_created_is_noop(self):
        # the monitor thread starts on START, one transition before RUN builds
        # the backend
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        assert zeroconf_plugin.backend is None
        zeroconf_plugin.run()

    def test_monitor_tick_updates_the_broadcast(self):
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        backend = mock.Mock()
        zeroconf_plugin.backend = backend
        zeroconf_plugin.run()
        backend.update_broadcast.assert_called_once_with()


@pytest.mark.django_db(databases="__all__", transaction=True)
class TestGetLocalHostnames:
    def test_no_hostnames_stored(self):
        assert server.get_local_hostnames() == []

    def test_returns_stored_hostnames(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        LocalHostname.objects.create(hostname="tonyslaptop.local")
        assert set(server.get_local_hostnames()) == {
            "kolibri.local",
            "tonyslaptop.local",
        }


class GetUrlsTestCase(DjangoTestCase):
    databases = "__all__"

    @mock.patch.object(server, "get_local_hostnames")
    @mock.patch.object(server, "_get_local_ips")
    def test_get_urls__includes_local_hostnames(self, mock_ips, mock_hostnames):
        mock_ips.return_value = ["10.0.0.5"]
        mock_hostnames.return_value = ["kolibri.local", "tonyslaptop.local"]
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "0.0.0.0"}):
            status, urls = server.get_urls(listen_port=1234)
        self.assertEqual(server.STATUS_RUNNING, status)
        self.assertIn("http://10.0.0.5:1234/", urls)
        self.assertIn("http://kolibri.local:1234/", urls)
        self.assertIn("http://tonyslaptop.local:1234/", urls)

    def test_get_urls__port_80_omitted(self):
        LocalHostname.objects.create(hostname="kolibri.local")
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "10.0.0.5"}):
            _status, urls = server.get_urls(listen_port=80)
        self.assertEqual(["http://10.0.0.5/", "http://kolibri.local/"], urls)

    def test_get_urls__advertised_port(self):
        with running_pid_file(8080), mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": "10.0.0.5", "ADVERTISED_HTTP_PORT": 80},
        ):
            _status, urls = server.get_urls()
        self.assertEqual(["http://10.0.0.5/"], urls)

    def test_get_urls__listen_port_uses_advertised_port(self):
        with mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": "10.0.0.5", "ADVERTISED_HTTP_PORT": 80},
        ):
            _status, urls = server.get_urls(listen_port=8080)
        self.assertEqual(["http://10.0.0.5/"], urls)

    def test_get_urls__not_advertised_keeps_listen_port(self):
        with mock.patch.dict(
            OPTIONS["Deployment"],
            {"LISTEN_ADDRESS": "10.0.0.5", "ADVERTISED_HTTP_PORT": 80},
        ):
            _status, urls = server.get_urls(listen_port=8081, advertise=False)
        self.assertEqual(["http://10.0.0.5:8081/"], urls)

    @mock.patch.object(server, "get_local_hostnames")
    @mock.patch.object(server, "_get_local_ips")
    def test_get_urls__local_hostnames_survive_ip_enumeration_failure(
        self, mock_ips, mock_hostnames
    ):
        mock_ips.side_effect = RuntimeError()
        mock_hostnames.return_value = ["kolibri.local"]
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "0.0.0.0"}):
            status, urls = server.get_urls(listen_port=1234)
        self.assertEqual(server.STATUS_RUNNING, status)
        self.assertEqual(["http://kolibri.local:1234/"], urls)


class GetUrlsLocalHostnamesTestCase(DjangoTestCase):
    databases = "__all__"

    def setUp(self):
        LocalHostname.objects.create(hostname="kolibri.local")

    def test_get_urls__loopback_listen_address_omits_local_hostnames(self):
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "127.0.0.1"}):
            _status, urls = server.get_urls(listen_port=1234)
        self.assertEqual(["http://127.0.0.1:1234/"], urls)

    @mock.patch.object(server, "get_outgoing_interface_address", return_value=None)
    @mock.patch(
        "kolibri.utils.server.ifaddr.get_adapters",
        return_value=[ifaddr.Adapter("lo", "lo", [ifaddr.IP("127.0.0.1", 8, "lo")])],
    )
    def test_get_urls__no_lan_address_omits_local_hostnames(self, *mocks):
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "0.0.0.0"}):
            _status, urls = server.get_urls(listen_port=1234)
        self.assertEqual(["http://127.0.0.1:1234/"], urls)


def _adapter(nice_name, ip, prefix=24, name=None):
    return ifaddr.Adapter(
        nice_name if name is None else name,
        nice_name,
        [ifaddr.IP(ip, prefix, nice_name)],
    )


def _adapter_ipv4s():
    return [
        ip.ip for adapter in ifaddr.get_adapters() for ip in adapter.ips if ip.is_IPv4
    ]


def _patch_multicast_addresses():
    return mock.patch("zeroconf.get_all_addresses", side_effect=_adapter_ipv4s)


def _windows_adapter(description, ip, prefix=24):
    return _adapter(
        description, ip, prefix, name=b"{4D36E972-E325-11CE-BFC1-08002BE10318}"
    )


class GetUrlsIpOrderTestCase(DjangoTestCase):
    databases = "__all__"

    def setUp(self):
        for patcher in (
            mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "0.0.0.0"}),
            _patch_multicast_addresses(),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_ip_order(self):
        cases = [
            (
                "windows bytes adapter name",
                [_windows_adapter("Intel Wi-Fi", "192.168.1.20")],
                None,
                ["192.168.1.20"],
            ),
            (
                "default route first",
                [_adapter("eth0", "10.0.0.5"), _adapter("wlan0", "192.168.1.20")],
                "192.168.1.20",
                ["192.168.1.20", "10.0.0.5"],
            ),
            (
                "loopback first",
                [_adapter("wlan0", "192.168.1.20"), _adapter("lo", "127.0.0.1", 8)],
                "192.168.1.20",
                ["127.0.0.1", "192.168.1.20"],
            ),
            (
                "vpn on default route after lan",
                [_adapter("tun0", "10.8.0.2"), _adapter("wlan0", "192.168.1.20")],
                "10.8.0.2",
                ["192.168.1.20", "10.8.0.2"],
            ),
            (
                "nordlynx on default route after lan",
                [_adapter("nordlynx", "10.5.0.2"), _adapter("wlan0", "192.168.1.20")],
                "10.5.0.2",
                ["192.168.1.20", "10.5.0.2"],
            ),
            (
                "windows nordlynx on default route after lan",
                [
                    _windows_adapter("NordLynx Tunnel", "10.5.0.2"),
                    _windows_adapter("Intel Wi-Fi", "192.168.1.20"),
                ],
                "10.5.0.2",
                ["192.168.1.20", "10.5.0.2"],
            ),
            (
                "anyconnect on default route after lan",
                [_adapter("cscotun0", "10.20.0.9"), _adapter("wlan0", "192.168.1.20")],
                "10.20.0.9",
                ["192.168.1.20", "10.20.0.9"],
            ),
            (
                "windows anyconnect after lan",
                [
                    _windows_adapter(
                        "Cisco AnyConnect Secure Mobility Client Virtual Miniport Adapter for Windows x64",
                        "10.20.0.9",
                    ),
                    _windows_adapter("Intel Wi-Fi", "192.168.1.20"),
                ],
                None,
                ["192.168.1.20", "10.20.0.9"],
            ),
            (
                "zerotier after lan",
                [
                    _adapter("ztc3q4abcd", "10.147.17.5"),
                    _adapter("wlan0", "192.168.1.20"),
                ],
                None,
                ["192.168.1.20", "10.147.17.5"],
            ),
            (
                "windows zerotier after lan",
                [
                    _windows_adapter("ZeroTier Virtual Port", "10.147.17.5"),
                    _windows_adapter("Intel Wi-Fi", "192.168.1.20"),
                ],
                None,
                ["192.168.1.20", "10.147.17.5"],
            ),
            (
                "non-lan default route after lan",
                [
                    _adapter("tailscale0", "100.101.102.103", 32),
                    _adapter("wlan0", "192.168.1.20"),
                ],
                "100.101.102.103",
                ["192.168.1.20", "100.101.102.103"],
            ),
            (
                "public address before virtual adapter",
                [
                    _adapter("docker0", "172.17.0.1", 16),
                    _adapter("eth0", "185.199.108.5"),
                ],
                None,
                ["185.199.108.5", "172.17.0.1"],
            ),
            (
                "windows virtual adapter after lan",
                [
                    _windows_adapter(
                        "Hyper-V Virtual Ethernet Adapter", "172.27.144.1", 20
                    ),
                    _windows_adapter("Intel Wi-Fi", "192.168.1.20"),
                ],
                None,
                ["192.168.1.20", "172.27.144.1"],
            ),
            (
                "windows mobile hotspot not virtual",
                [
                    _windows_adapter("Intel Ethernet", "192.168.200.15"),
                    _windows_adapter(
                        "Microsoft Wi-Fi Direct Virtual Adapter", "192.168.137.1"
                    ),
                ],
                None,
                ["192.168.137.1", "192.168.200.15"],
            ),
            (
                "docker network bridge after lan",
                [
                    _adapter("br-3f9a1c2b4d5e", "172.18.0.1", 16),
                    _adapter("wlan0", "192.168.1.20"),
                ],
                None,
                ["192.168.1.20", "172.18.0.1"],
            ),
            (
                "openwrt lan bridge before wan",
                [_adapter("br-lan", "192.168.1.1"), _adapter("eth1", "100.70.0.2", 10)],
                "100.70.0.2",
                ["192.168.1.1", "100.70.0.2"],
            ),
            (
                "android hotspot before cellular default route",
                [
                    _adapter("rmnet_data0", "10.45.3.2"),
                    _adapter("swlan0", "192.168.43.1"),
                ],
                "10.45.3.2",
                ["192.168.43.1", "10.45.3.2"],
            ),
            (
                "linux hotspot before wwan default route",
                [
                    _adapter("wlan0", "10.42.0.1"),
                    _adapter("wwan0", "10.170.5.3"),
                ],
                "10.170.5.3",
                ["10.42.0.1", "10.170.5.3"],
            ),
            *(
                (
                    f"{off_lan.nice_name} after lan with no default route",
                    [off_lan, _adapter("wlan0", "192.168.100.5")],
                    None,
                    ["192.168.100.5", off_lan.ips[0].ip],
                )
                for off_lan in (
                    _adapter("podman0", "10.88.0.1", 16),
                    _adapter("lxdbr0", "10.10.10.1"),
                    _adapter("vmnet1", "172.16.5.1"),
                    _adapter("vboxnet0", "192.168.56.1"),
                    _adapter("wg0", "10.6.0.2"),
                    _adapter("tap0", "10.9.0.2"),
                    _adapter("utun3", "10.7.0.2"),
                    _adapter("ccmni0", "10.45.3.2"),
                    _adapter("v4-rmnet_data0", "192.0.0.4", 29),
                    _adapter("ppp0", "10.64.12.7", 32),
                    _windows_adapter(
                        "VirtualBox Host-Only Ethernet Adapter", "192.168.56.1"
                    ),
                    _windows_adapter(
                        "VMware Virtual Ethernet Adapter for VMnet1", "192.168.80.1"
                    ),
                    _windows_adapter("WireGuard Tunnel", "10.6.0.2"),
                    _windows_adapter("Wintun Userspace Tunnel", "10.7.0.2"),
                    _windows_adapter("TAP-Windows Adapter V9", "10.8.0.2"),
                )
            ),
            (
                "ppp on default route after lan",
                [
                    _adapter("ppp0", "10.64.12.7", 32),
                    _adapter("wlan0", "192.168.1.5"),
                ],
                "10.64.12.7",
                ["192.168.1.5", "10.64.12.7"],
            ),
        ]
        for description, adapters, outgoing_ip, expected_ips in cases:
            with self.subTest(description), mock.patch.object(
                server, "get_outgoing_interface_address", return_value=outgoing_ip
            ), mock.patch(
                "kolibri.utils.server.ifaddr.get_adapters", return_value=adapters
            ):
                _status, urls = server.get_urls(listen_port=1234)
                self.assertEqual([urlparse(url).hostname for url in urls], expected_ips)

    @mock.patch.object(
        server, "get_outgoing_interface_address", return_value="10.45.3.2"
    )
    @mock.patch(
        "kolibri.utils.server.ifaddr.get_adapters",
        return_value=[
            _adapter("lo", "127.0.0.1", 8),
            _adapter("seth_lte0", "10.45.3.2"),
            _adapter("wlan1", "192.168.43.1"),
        ],
    )
    @mock.patch("zeroconf.get_all_addresses", return_value=["192.168.43.1"])
    def test_non_multicast_adapter_after_multicast_adapter(self, *mocks):
        _status, urls = server.get_urls(listen_port=1234)
        self.assertEqual(
            [urlparse(url).hostname for url in urls],
            ["127.0.0.1", "192.168.43.1", "10.45.3.2"],
        )


@mock.patch.object(server, "get_outgoing_interface_address", return_value=None)
@mock.patch(
    "kolibri.utils.server.ifaddr.get_adapters",
    return_value=[
        ifaddr.Adapter("eth1", "eth1", [ifaddr.IP("10.0.0.5", 24, "eth1")]),
        ifaddr.Adapter("wlan0", "wlan0", [ifaddr.IP("192.168.1.5", 24, "wlan0")]),
    ],
)
@_patch_multicast_addresses()
class GetLanAddressTestCase(TestCase):
    def test_all_interfaces(self, *mocks):
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "0.0.0.0"}):
            self.assertEqual("10.0.0.5", server.get_lan_address())

    def test_listen_address(self, *mocks):
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "192.168.1.5"}):
            self.assertEqual("192.168.1.5", server.get_lan_address())

    def test_loopback_listen_address(self, *mocks):
        with mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "127.0.0.1"}):
            self.assertIsNone(server.get_lan_address())


@mock.patch.object(server, "get_outgoing_interface_address", return_value=None)
class GetLanAddressAdapterOrderTestCase(DjangoTestCase):
    databases = "__all__"

    def setUp(self):
        for patcher in (
            mock.patch.dict(OPTIONS["Deployment"], {"LISTEN_ADDRESS": "0.0.0.0"}),
            _patch_multicast_addresses(),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_public_lan_adapter_over_docker_bridge(self, _mock_outgoing):
        with mock.patch(
            "kolibri.utils.server.ifaddr.get_adapters",
            return_value=[
                _adapter("docker0", "172.17.0.1", 16),
                _adapter("eth0", "185.199.108.5", 16),
            ],
        ):
            self.assertEqual("185.199.108.5", server.get_lan_address())

    def test_only_virtual_adapter(self, _mock_outgoing):
        with mock.patch(
            "kolibri.utils.server.ifaddr.get_adapters",
            return_value=[_adapter("docker0", "172.17.0.1", 16)],
        ):
            self.assertEqual("172.17.0.1", server.get_lan_address())

    def test_cgnat_only(self, _mock_outgoing):
        with mock.patch(
            "kolibri.utils.server.ifaddr.get_adapters",
            return_value=[_adapter("tailscale0", "100.101.102.103", 32)],
        ):
            self.assertIsNone(server.get_lan_address())

    def test_first_ip_url_is_lan_address(self, mock_outgoing):
        cases = [
            (
                "public lan adapter over cgnat vpn on default route",
                [
                    _adapter("eth0", "130.89.1.20", 16),
                    _adapter("tailscale0", "100.101.102.103", 32),
                ],
                "100.101.102.103",
            ),
            (
                "public lan adapter over public vpn on default route",
                [
                    _adapter("eth0", "130.89.1.20", 16),
                    _adapter("tailscale0", "203.0.113.7", 32),
                ],
                "203.0.113.7",
            ),
        ]
        for description, adapters, outgoing_ip in cases:
            mock_outgoing.return_value = outgoing_ip
            with self.subTest(description), mock.patch(
                "kolibri.utils.server.ifaddr.get_adapters", return_value=adapters
            ):
                _status, urls = server.get_urls(listen_port=1234)
                self.assertEqual("http://130.89.1.20:1234/", urls[0])
                self.assertEqual("130.89.1.20", server.get_lan_address())

    def test_get_urls_lists_hostnames_for_public_lan_adapter(self, _mock_outgoing):
        LocalHostname.objects.create(hostname="kolibri.local")
        with mock.patch(
            "kolibri.utils.server.ifaddr.get_adapters",
            return_value=[_adapter("eth0", "130.89.1.20", 16)],
        ):
            _status, urls = server.get_urls(listen_port=1234)
        self.assertEqual(
            ["http://130.89.1.20:1234/", "http://kolibri.local:1234/"], urls
        )


class GetOutgoingInterfaceAddressTestCase(TestCase):
    @mock.patch("kolibri.utils.server.socket.socket")
    def test_returns_routing_table_source_address(self, mock_socket):
        sock = mock_socket.return_value
        sock.getsockname.return_value = ("192.168.1.5", 9)
        self.assertEqual("192.168.1.5", server.get_outgoing_interface_address())
        sock.close.assert_called_once_with()

    @mock.patch("kolibri.utils.server.socket.socket")
    def test_returns_none_when_no_default_route(self, mock_socket):
        sock = mock_socket.return_value
        sock.connect.side_effect = OSError()
        self.assertIsNone(server.get_outgoing_interface_address())
        sock.close.assert_called_once_with()


@mock.patch(
    "kolibri.utils.server._read_pid_file", return_value=((None, None, None, None))
)
class ServerInitializationTestCase(TestCase):
    def tearDown(self):
        with contextlib.suppress(FileNotFoundError):
            os.remove(server.PID_FILE)

    @mock.patch("kolibri.utils.server.logger.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_occupied(self, wait_for_port_mock, logging_mock, read_pid_file_mock):
        wait_for_port_mock.side_effect = OSError
        with self.assertRaises(server.PortOccupied):
            server._port_check("8080")
        logging_mock.assert_called()

    @mock.patch("kolibri.utils.server.logger.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_occupied_socket_activation(
        self, wait_for_port_mock, logging_mock, read_pid_file_mock
    ):
        wait_for_port_mock.side_effect = OSError
        # LISTEN_PID environment variable would be set if using socket activation
        with mock.patch.dict(os.environ, {"LISTEN_PID": "1234"}):
            server._port_check("8080")
            logging_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.logger.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_zero_zip_port_zero(
        self, wait_for_port_mock, logging_mock, read_pid_file_mock
    ):
        wait_for_port_mock.side_effect = OSError
        server._port_check(0)
        logging_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.pid_exists")
    def test_unclean_shutdown(self, pid_exists_mock, read_pid_file_mock):
        pid_exists_mock.return_value = False
        read_pid_file_mock.return_value = (1000, 8000, 8001, server.STATUS_RUNNING)
        with mock.patch.object(server.KolibriProcessBus, "run") as run_mock:
            server.start()
            run_mock.assert_called()

    @mock.patch("kolibri.utils.server.pid_exists")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_server_running(
        self, wait_for_port_mock, pid_exists_mock, read_pid_file_mock
    ):
        wait_for_port_mock.side_effect = OSError
        pid_exists_mock.return_value = True
        read_pid_file_mock.return_value = (1000, 8000, 8001, server.STATUS_RUNNING)
        with self.assertRaises(server.PortOccupied):
            server.start(port=8000)


class ServerSignalHandlerTestCase(TestCase):
    @mock.patch("kolibri.utils.server.os.getpid")
    @mock.patch("kolibri.utils.server.BaseSignalHandler._handle_signal")
    def test_signal_different_pid(self, handle_signal_mock, getpid_mock):
        getpid_mock.return_value = 1235
        signal_handler = server.SignalHandler(mock.MagicMock())
        signal_handler.process_pid = 1234
        signal_handler._handle_signal()
        handle_signal_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.os.getpid")
    @mock.patch("kolibri.utils.server.BaseSignalHandler._handle_signal")
    def test_signal_same_pid(self, handle_signal_mock, getpid_mock):
        pid = 1234
        getpid_mock.return_value = pid
        signal_handler = server.SignalHandler(mock.MagicMock())
        signal_handler.process_pid = pid
        signal_handler._handle_signal()
        handle_signal_mock.assert_called()

    def test_signal_subscribe(self):
        bus_mock = mock.MagicMock()
        signal_handler = server.SignalHandler(bus_mock)
        signal_handler.subscribe()
        bus_mock.subscribe.assert_called_with("ENTER", signal_handler.ENTER)


class TestBaseKolibriProcessBusPorts:
    @pytest.fixture(autouse=True)
    def _isolate_bus(self):
        with mock.patch.object(server, "PIDPlugin"), mock.patch.object(
            server, "LogPlugin"
        ), mock.patch.object(
            server.SystemdNotifyPlugin, "is_supported", return_value=False
        ):
            yield

    def test_ports_default_to_options(self):
        with mock.patch.dict(
            OPTIONS["Deployment"], {"HTTP_PORT": 1234, "ZIP_CONTENT_PORT": 5678}
        ):
            bus = server.BaseKolibriProcessBus()
        assert bus.port == 1234
        assert bus.zip_port == 5678

    def test_missing_zip_port_falls_back_to_option(self):
        with mock.patch.dict(OPTIONS["Deployment"], {"ZIP_CONTENT_PORT": 5678}):
            bus = server.BaseKolibriProcessBus(port=9000)
        assert bus.port == 9000
        assert bus.zip_port == 5678

    def test_explicit_zero_ports_are_kept(self):
        with mock.patch.dict(
            OPTIONS["Deployment"], {"HTTP_PORT": 1234, "ZIP_CONTENT_PORT": 5678}
        ):
            bus = server.BaseKolibriProcessBus(port=0, zip_port=0)
        assert bus.port == 0
        assert bus.zip_port == 0


class TestAppInstallationTypes:
    @pytest.mark.parametrize(
        "installation_type, expected",
        [
            (installation_types.WINDOWS_APP, "Windows App"),
            (installation_types.MACOS, "Mac"),
            (installation_types.APK, "apk"),
        ],
    )
    def test_bare_name_without_installer_version(self, installation_type, expected):
        with mock.patch("os.environ", {"KOLIBRI_INSTALLATION_TYPE": installation_type}):
            assert server.installation_type() == expected

    def test_flatpak_reports_installer_version(self):
        environ = {
            "KOLIBRI_INSTALLATION_TYPE": installation_types.FLATPAK,
            "KOLIBRI_INSTALLER_VERSION": "1.2.3",
        }
        with mock.patch("os.environ", environ):
            assert server.installation_type() == "Flatpak - 1.2.3"
