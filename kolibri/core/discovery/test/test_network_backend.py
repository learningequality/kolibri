import mock
from django.test import SimpleTestCase

from kolibri.core.discovery.hooks import NetworkDiscoveryHook
from kolibri.core.discovery.utils.network.broadcast import EVENT_ADD_INSTANCE
from kolibri.core.discovery.utils.network.broadcast import EVENT_REGISTER_INSTANCE
from kolibri.core.discovery.utils.network.broadcast import EVENT_REMOVE_INSTANCE
from kolibri.core.discovery.utils.network.broadcast import EVENT_RENEW_INSTANCE
from kolibri.core.discovery.utils.network.broadcast import EVENT_UNREGISTER_INSTANCE
from kolibri.core.discovery.utils.network.broadcast import EVENT_UPDATE_INSTANCE
from kolibri.core.discovery.utils.network.broadcast import KolibriInstance
from kolibri.core.discovery.utils.network.broadcast import NetworkDiscoveryBackend
from kolibri.core.discovery.utils.network.broadcast import SERVICE_TTL
from kolibri.core.discovery.utils.network.search import NetworkLocationListener
from kolibri.plugins.hooks import register_hook

MOCK_INTERFACE_IP = "111.222.111.222"
MOCK_PORT = 555
SEARCH_MODULE = "kolibri.core.discovery.utils.network.search."


def _register_transport(name="FakeTransport", as_default=False):
    """
    Registers a transport that records the calls the backend makes on it, and
    returns the singleton instance the backend will resolve. Each call defines
    a fresh subclass, so every registration gets its own recorder — under a
    distinct `name`, as the registry keys on it and would otherwise evict the
    earlier registration rather than rank the two.
    """

    class FakeTransport(NetworkDiscoveryHook):
        def __init__(self):
            self.calls = []
            self.rebound = False
            self.is_known = None
            self.on_register = None

        def register(self, instance):
            self.calls.append("register")
            if self.on_register is not None:
                self.on_register()

        def update(self, instance, on_rebind):
            self.calls.append("update")
            if self.rebound:
                on_rebind()
                self.calls.append("rebind")

        def unregister(self):
            self.calls.append("unregister")

        def start_listening(self, on_add, on_update, on_remove, is_known):
            self.calls.append("start_listening")
            self.is_known = is_known

        def stop_listening(self):
            self.calls.append("stop_listening")

    FakeTransport.__name__ = name
    FakeTransport.__module__ = "test.kolibri_plugin"
    Hook = register_hook(as_default=as_default)(FakeTransport)
    Hook.add_hook_to_registries()
    return Hook()


def _make_instance(instance_id, is_self=False):
    instance = KolibriInstance(
        instance_id,
        ip=MOCK_INTERFACE_IP,
        port=MOCK_PORT,
        device_info={"instance_id": instance_id},
    )
    instance.is_self = is_self
    return instance


class NetworkDiscoveryBackendTestCase(SimpleTestCase):
    def setUp(self):
        super().setUp()
        self.instance = _make_instance("abcd")
        self.backend = NetworkDiscoveryBackend(instance=self.instance)
        # swap in an empty registry so only this test's transports resolve; the
        # real one — which holds the default zeroconf transport — is restored in
        # tearDown
        self.registered_hooks = NetworkDiscoveryHook._registered_hooks
        NetworkDiscoveryHook._registered_hooks = {}

    def tearDown(self):
        NetworkDiscoveryHook._registered_hooks = self.registered_hooks
        super().tearDown()

    def _subscribe(self, event):
        listener = mock.Mock()
        self.backend.events.subscribe(event, listener)
        return listener

    def _start_with_transport(self, rebound=False):
        transport = _register_transport(as_default=True)
        transport.rebound = rebound
        self.backend.start_broadcast()
        return transport

    # --- dispatch tests (no transport needed) ---

    @mock.patch(SEARCH_MODULE + "add_dynamic_network_location.enqueue")
    def test_on_add_dispatches_to_network_location_listener(self, mock_enqueue):
        self.backend.add_listener(NetworkLocationListener)
        peer = _make_instance("peer")
        self.backend.on_add(peer)
        mock_enqueue.assert_called_once()

    @mock.patch(SEARCH_MODULE + "add_dynamic_network_location.enqueue")
    @mock.patch(SEARCH_MODULE + "remove_dynamic_network_location.enqueue")
    def test_on_remove_dispatches_to_network_location_listener(
        self, mock_enqueue, mock_add_enqueue
    ):
        self.backend.add_listener(NetworkLocationListener)
        peer = _make_instance("peer")
        peer.set_broadcasting(mock.Mock())
        self.backend.on_add(peer)
        self.backend.on_remove(peer.name)
        mock_enqueue.assert_called_once()

    def test_leave_rejoin_republishes_add(self):
        listener = self._subscribe(EVENT_ADD_INSTANCE)
        peer = _make_instance("peer")
        peer.set_broadcasting(mock.Mock())
        self.backend.on_add(peer)
        self.backend.on_remove(peer.name)
        rejoined = _make_instance("peer")
        rejoined.set_broadcasting(mock.Mock())
        self.backend.on_add(rejoined)
        self.assertEqual(listener.call_count, 2)

    def test_on_add_ignores_self_instance(self):
        listener = self._subscribe(EVENT_ADD_INSTANCE)
        peer = _make_instance("peer", is_self=True)
        self.backend.on_add(peer)
        listener.assert_not_called()
        self.assertEqual(self.backend.other_instances, {})

    def test_on_update_publishes_update(self):
        listener = self._subscribe(EVENT_UPDATE_INSTANCE)
        peer = _make_instance("peer")
        self.backend.on_update(peer)
        listener.assert_called_once()

    def test_on_update_ignores_self_instance(self):
        listener = self._subscribe(EVENT_UPDATE_INSTANCE)
        peer = _make_instance("peer", is_self=True)
        self.backend.on_update(peer)
        listener.assert_not_called()
        self.assertEqual(self.backend.other_instances, {})

    # --- on_update dedup against the cached instance ---

    def _update_cached_peer(self, original, updated):
        """
        Seeds `original` in the cache under the service name both instances
        share, then dispatches `updated` for that name.

        :return: the EVENT_UPDATE_INSTANCE listener and the cached instance
        """
        original.zeroconf_id = updated.zeroconf_id = "peer"
        self.backend.other_instances[original.name] = original
        listener = self._subscribe(EVENT_UPDATE_INSTANCE)
        self.backend.on_update(updated)
        return listener, self.backend.other_instances[updated.name]

    def test_on_update__no_change_less_than_TTL(self):
        original = _make_instance("peer")
        updated = _make_instance("peer")
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_not_called()
        self.assertIs(original, cached)

    def test_on_update__no_change_more_than_or_equal_to_TTL(self):
        original = _make_instance("peer")
        updated = _make_instance("peer")
        updated.last_seen = original.last_seen + SERVICE_TTL
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_called_once_with(updated)
        self.assertIs(updated, cached)

    def test_on_update__change_id(self):
        original = _make_instance("peer")
        original.id = "not the same id"
        updated = _make_instance("peer")
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_called_once_with(updated)
        self.assertIs(updated, cached)

    def test_on_update__change_ip(self):
        original = _make_instance("peer")
        original.ip = "211.211.16.1"
        updated = _make_instance("peer")
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_called_once_with(updated)
        self.assertIs(updated, cached)

    def test_on_update__change_port(self):
        original = _make_instance("peer")
        original.port = 2121
        updated = _make_instance("peer")
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_called_once_with(updated)
        self.assertIs(updated, cached)

    def test_on_update__change_host(self):
        original = _make_instance("peer")
        original.host = "http://test.com"
        updated = _make_instance("peer")
        updated.host = "http://test2.com"
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_called_once_with(updated)
        self.assertIs(updated, cached)

    def test_on_update__change_device_info(self):
        original = _make_instance("peer")
        original.device_info = {"kolibri_version": "0.15.12"}
        updated = _make_instance("peer")
        updated.device_info = {"kolibri_version": "0.16.0"}
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_called_once_with(updated)
        self.assertIs(updated, cached)

    def test_on_update__change_prefix(self):
        original = _make_instance("peer")
        updated = _make_instance("peer")
        updated.prefix = "/kolibri"
        listener, cached = self._update_cached_peer(original, updated)
        listener.assert_called_once_with(updated)
        self.assertIs(updated, cached)

    def test_on_add__cached_broadcasting_peer_ignored(self):
        listener = self._subscribe(EVENT_ADD_INSTANCE)
        cached = _make_instance("peer")
        cached.set_broadcasting(mock.Mock())
        self.backend.other_instances[cached.name] = cached
        rediscovered = _make_instance("peer")
        rediscovered.set_broadcasting(mock.Mock())
        self.backend.on_add(rediscovered)
        listener.assert_not_called()
        self.assertIs(cached, self.backend.other_instances[cached.name])

    def test_on_remove__is_self(self):
        listener = self._subscribe(EVENT_REMOVE_INSTANCE)
        peer = _make_instance("peer")
        peer.set_broadcasting(mock.Mock(), is_self=True)
        self.backend.other_instances[peer.name] = peer
        self.backend.on_remove(peer.name)
        listener.assert_not_called()
        self.assertTrue(peer.is_broadcasting)

    def test_on_remove__not_found(self):
        listener = self._subscribe(EVENT_REMOVE_INSTANCE)
        self.backend.on_remove(_make_instance("peer").name)
        listener.assert_not_called()

    # --- the cache lookup the transport uses to skip re-querying a peer ---

    def test_is_known_only_for_cached_broadcasting_peer(self):
        peer = _make_instance("peer")
        self.assertFalse(self.backend.is_known(peer.name))
        self.backend.other_instances[peer.name] = peer
        self.assertFalse(self.backend.is_known(peer.name))
        peer.set_broadcasting(mock.Mock())
        self.assertTrue(self.backend.is_known(peer.name))

    # --- transport resolution + lifecycle tests ---

    def test_start_broadcast_uses_default_transport(self):
        transport = self._start_with_transport()
        self.assertIn("register", transport.calls)

    def test_override_transport_preferred_over_default(self):
        default_transport = _register_transport("DefaultTransport", as_default=True)
        override_transport = _register_transport("OverrideTransport")
        self.backend.start_broadcast()
        self.assertEqual(default_transport.calls, [])
        self.assertIn("register", override_transport.calls)
        self.assertIn("start_listening", override_transport.calls)

    def test_transport_can_ask_whether_a_peer_is_already_cached(self):
        transport = self._start_with_transport()
        peer = _make_instance("peer")
        peer.set_broadcasting(mock.Mock())
        self.backend.on_add(peer)
        self.assertTrue(transport.is_known(peer.name))

    def test_start_broadcast_publishes_register_after_the_transport_registered(self):
        # the transport settles our `zeroconf_id` while registering, and can
        # still raise on a name conflict; publishing first shows listeners an
        # unsettled id, and one for a registration that never happened
        transport = _register_transport(as_default=True)
        self.backend.events.subscribe(
            EVENT_REGISTER_INSTANCE, lambda instance: transport.calls.append("publish")
        )
        self.backend.start_broadcast()
        self.assertEqual(["register", "publish", "start_listening"], transport.calls)

    def test_start_broadcast__stopped_while_registering(self):
        transport = _register_transport(as_default=True)
        transport.on_register = self.backend.stop_broadcast
        listener = self._subscribe(EVENT_REGISTER_INSTANCE)
        self.backend.start_broadcast()
        self.assertEqual(["register", "unregister", "stop_listening"], transport.calls)
        listener.assert_not_called()

    def test_update_broadcast_publishes_renew(self):
        transport = self._start_with_transport()
        # the transport may have renamed us on a name conflict, and the replacement
        # instance has to keep broadcasting under the name peers already know
        self.instance.zeroconf_id = "abcd-1"
        listener = self._subscribe(EVENT_RENEW_INSTANCE)
        new_instance = _make_instance("abcd")
        self.backend.update_broadcast(instance=new_instance)
        self.assertIs(new_instance, self.backend.instance)
        self.assertEqual("abcd-1", self.backend.instance.zeroconf_id)
        listener.assert_called_once()
        self.assertIn("update", transport.calls)

    def test_update_broadcast_rebound_cycles_id_and_unregisters(self):
        transport = self._start_with_transport(rebound=True)
        old_id = self.backend.id
        ids = []

        def on_unregister(instance):
            transport.calls.append("publish")
            ids.append(self.backend.id)

        self.backend.events.subscribe(EVENT_UNREGISTER_INSTANCE, on_unregister)
        self.backend.update_broadcast()
        self.assertNotEqual(self.backend.id, old_id)
        # the id cycles, and UNREGISTER publishes, before the transport rebinds:
        # a peer the rebind rediscovers is enqueued under `backend.id`, and the
        # reset UNREGISTER triggers deletes locations held under any other id
        self.assertEqual([self.backend.id], ids)
        self.assertEqual(
            ["register", "start_listening", "update", "publish", "rebind"],
            transport.calls,
        )

    def test_update_broadcast_no_rebound_keeps_id(self):
        self._start_with_transport(rebound=False)
        old_id = self.backend.id
        self.backend.update_broadcast()
        self.assertEqual(self.backend.id, old_id)

    def test_stop_broadcast_unregisters_and_clears_cache(self):
        transport = self._start_with_transport()
        self.backend.other_instances["peer"] = _make_instance("peer")
        listener = self._subscribe(EVENT_UNREGISTER_INSTANCE)
        self.backend.stop_broadcast()
        listener.assert_called_once()
        self.assertLess(
            transport.calls.index("unregister"),
            transport.calls.index("stop_listening"),
        )
        self.assertEqual(self.backend.other_instances, {})

    def test_start_broadcast_without_transport_loses_discovery_only(self):
        # a platform whose transport override fails to register must lose
        # discovery, not take server startup down with it
        listener = self._subscribe(EVENT_REGISTER_INSTANCE)
        self.backend.start_broadcast()
        listener.assert_not_called()
        self.assertIsNone(self.backend.transport)

    def test_start_broadcast__already_broadcasting(self):
        transport = self._start_with_transport()
        self.backend.start_broadcast()
        self.assertEqual(["register", "start_listening"], transport.calls)

    def test_stop_broadcast__never_started(self):
        # `start_broadcast` bailing out leaves the backend in the plugin's hands,
        # so STOP still reaches here; publishing UNREGISTER would reset connection
        # states for a broadcast id that never had any
        listener = self._subscribe(EVENT_UNREGISTER_INSTANCE)
        self.backend.start_broadcast()
        self.backend.stop_broadcast()
        listener.assert_not_called()

    def test_stop_broadcast__register_raised(self):
        # same, for a transport that resolved but failed to come up — and since
        # that leaves nothing for `stop_broadcast` to release, the half-finished
        # register has to be torn down where it failed
        transport = _register_transport(as_default=True)
        transport.on_register = mock.Mock(side_effect=OSError("no interfaces"))
        listener = self._subscribe(EVENT_UNREGISTER_INSTANCE)
        with self.assertRaises(OSError):
            self.backend.start_broadcast()
        self.backend.stop_broadcast()
        listener.assert_not_called()
        self.assertEqual(["register", "stop_listening"], transport.calls)

    def test_update_broadcast__never_started(self):
        listener = self._subscribe(EVENT_RENEW_INSTANCE)
        self.backend.start_broadcast()
        self.backend.update_broadcast(instance=_make_instance("abcd"))
        listener.assert_not_called()
