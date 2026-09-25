from __future__ import annotations

import threading
import typing
from concurrent.futures import Future
from enum import auto
from enum import Enum
from functools import partial

from gi.repository import Gio
from gi.repository import GLib
from gi.repository import KolibriDaemonDBus

from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_MAIN_OBJECT_PATH
from kolibri_app.login_tokens import login_tokens

from .dbus_helpers import DBusManagerProxy
from .desktop_users import AccountsServiceManager
from .desktop_users import UserInfo
from .futures import future_chain
from .glib_helpers import dict_to_vardict
from .kolibri_search_handler import SearchHandler

INACTIVITY_TIMEOUT_MS = 30 * 1000  # 30 seconds in milliseconds

DEFAULT_STOP_KOLIBRI_TIMEOUT_SECONDS = 60  # 1 minute in seconds


class KolibriStatus(Enum):
    STARTING = auto()
    STOPPED = auto()
    STARTED = auto()
    ERROR = auto()


class KolibriState(typing.NamedTuple):
    status: KolibriStatus = KolibriStatus.STOPPED
    base_url: str = ""
    extra_url: str = ""
    app_key: str = ""
    app_initialize_url: str = ""
    is_device_provisioned: bool = False
    kolibri_home: str = ""
    kolibri_version: str = ""

    def is_running(self) -> bool:
        return self.status in (KolibriStatus.STARTING, KolibriStatus.STARTED)


class KolibriControl(typing.Protocol):
    """
    Controls Kolibri's process bus. Each method returns at once and may be
    called from any thread.
    """

    def start(self) -> None: ...

    def stop(self) -> None: ...

    def exit(self) -> None: ...


class PublicDBusInterface(object):
    VERSION = 1

    __application: Application
    __skeleton: KolibriDaemonDBus.MainSkeleton

    __kolibri_state: KolibriState
    __accounts_service: typing.Optional[AccountsServiceManager] = None

    __hold_clients: dict

    __auto_stop_timeout_source: typing.Optional[int] = None
    __stop_kolibri_timeout_source: typing.Optional[int] = None

    __stop_kolibri_timeout_interval: int = DEFAULT_STOP_KOLIBRI_TIMEOUT_SECONDS

    def __init__(self, application: Application):
        self.__application = application

        self.__skeleton = KolibriDaemonDBus.MainSkeleton()
        self.__skeleton.props.version = self.VERSION
        self.set_kolibri_state(KolibriState())
        self.__skeleton.connect("handle-hold", self.__on_handle_hold)
        self.__skeleton.connect("handle-release", self.__on_handle_release)
        self.__skeleton.connect("handle-start", self.__on_handle_start)
        self.__skeleton.connect("handle-stop", self.__on_handle_stop)
        self.__skeleton.connect(
            "handle-get-login-token", self.__on_handle_get_login_token
        )
        self.__skeleton.connect(
            "handle-get-item-ids-for-search",
            self.__on_handle_get_item_ids_for_search,
        )
        self.__skeleton.connect(
            "handle-get-metadata-for-item-ids",
            self.__on_handle_get_metadata_for_item_ids,
        )

        self.__hold_clients = {}

    @property
    def clients_count(self) -> int:
        return len(self.__hold_clients)

    @property
    def autostop_timeout(self) -> int:
        return self.__stop_kolibri_timeout_interval

    @autostop_timeout.setter
    def autostop_timeout(self, value: int):
        self.__stop_kolibri_timeout_interval = value

    def init(self):
        self.__begin_auto_stop_timeout()

    def shutdown(self):
        self.__cancel_auto_stop_timeout()

    def set_kolibri_state(self, state: KolibriState):
        self.__kolibri_state = state
        self.__skeleton.props.app_key = state.app_key
        self.__skeleton.props.app_initialize_url = state.app_initialize_url
        self.__skeleton.props.base_url = state.base_url
        self.__skeleton.props.extra_url = state.extra_url
        self.__skeleton.props.is_device_provisioned = state.is_device_provisioned
        self.__skeleton.props.kolibri_home = state.kolibri_home
        self.__skeleton.props.kolibri_version = state.kolibri_version
        self.__skeleton.props.status = state.status.name

    def set_accounts_service(self, accounts_service: AccountsServiceManager):
        self.__accounts_service = accounts_service

    def export(self, connection: Gio.DBusConnection, object_path: str):
        return self.__skeleton.export(connection, object_path)

    def unexport(self, connection: Gio.DBusConnection):
        if self.__skeleton.has_connection(connection):
            self.__skeleton.unexport_from_connection(connection)

    def __hold_for_client(self, connection: Gio.DBusConnection, name: str):
        if name in self.__hold_clients:
            return

        watch_id = Gio.bus_watch_name_on_connection(
            connection,
            name,
            Gio.BusNameWatcherFlags.NONE,
            None,
            self.__on_hold_client_vanished,
        )
        self.__hold_clients[name] = watch_id

    def __release_for_client(self, name: str):
        try:
            watch_id = self.__hold_clients.pop(name)
        except KeyError:
            pass
        else:
            Gio.bus_unwatch_name(watch_id)

    def __on_hold_client_vanished(self, connection: Gio.DBusConnection, name: str):
        self.__release_for_client(name)

    def __on_handle_hold(
        self,
        interface: KolibriDaemonDBus.MainSkeleton,
        invocation: Gio.DBusMethodInvocation,
    ) -> bool:
        self.__application.reset_inactivity_timeout()
        self.__hold_for_client(invocation.get_connection(), invocation.get_sender())
        interface.complete_hold(invocation)
        return True

    def __on_handle_release(
        self,
        interface: KolibriDaemonDBus.MainSkeleton,
        invocation: Gio.DBusMethodInvocation,
    ) -> bool:
        self.__application.reset_inactivity_timeout()
        self.__release_for_client(invocation.get_sender())
        interface.complete_release(invocation)
        return True

    def __on_handle_start(
        self,
        interface: KolibriDaemonDBus.MainSkeleton,
        invocation: Gio.DBusMethodInvocation,
    ) -> bool:
        self.__application.reset_inactivity_timeout()
        self.__application.start_kolibri()
        interface.complete_start(invocation)
        return True

    def __on_handle_stop(
        self,
        interface: KolibriDaemonDBus.MainSkeleton,
        invocation: Gio.DBusMethodInvocation,
    ) -> bool:
        self.__application.reset_inactivity_timeout()
        self.__application.stop_kolibri()
        interface.complete_stop(invocation)
        return True

    def __on_handle_get_login_token(
        self,
        interface: KolibriDaemonDBus.MainSkeleton,
        invocation: Gio.DBusMethodInvocation,
    ) -> bool:
        self.__application.reset_inactivity_timeout()

        connection = invocation.get_connection()

        future_chain(
            future_chain(
                future_chain(
                    DBusManagerProxy.get_default(connection).init_future(),
                    map_fn=partial(
                        DBusManagerProxy.get_user_id_from_dbus_invocation_future,
                        invocation=invocation,
                    ),
                ),
                map_fn=partial(
                    UserInfo.from_user_id_future,
                    accounts_service=self.__accounts_service,
                ),
            ),
            map_fn=self.__application.generate_login_token,
        ).add_done_callback(
            partial(self.__complete_get_login_token_from_future, invocation)
        )

        return True

    def __complete_get_login_token_from_future(
        self, invocation: Gio.DBusMethodInvocation, future: Future[str]
    ):
        try:
            token_key = future.result()
        except Exception as error:
            invocation.return_error_literal(
                Gio.io_error_quark(),
                Gio.IOErrorEnum.FAILED,
                f"Error creating login token: {error}",
            )
        else:
            self.__skeleton.complete_get_login_token(invocation, token_key)

    def __on_handle_get_item_ids_for_search(
        self,
        interface: KolibriDaemonDBus.MainSkeleton,
        invocation: Gio.DBusMethodInvocation,
        search: str,
    ) -> bool:
        self.__application.reset_inactivity_timeout()
        # Using interface.complete_get_item_ids_for_search results in
        # `TypeError: Must be string, not list`, so instead we will return a
        # Variant manually...
        self.__complete_search_from_future(
            invocation,
            lambda item_ids: GLib.Variant.new_tuple(GLib.Variant.new_strv(item_ids)),
            self.__application.get_item_ids_for_search(search),
        )
        return True

    def __on_handle_get_metadata_for_item_ids(
        self,
        interface: KolibriDaemonDBus.MainSkeleton,
        invocation: Gio.DBusMethodInvocation,
        item_ids: list,
    ) -> bool:
        self.__application.reset_inactivity_timeout()
        self.__complete_search_from_future(
            invocation,
            lambda metadata_list: GLib.Variant(
                "(aa{sv})", (list(map(dict_to_vardict, metadata_list)),)
            ),
            self.__application.get_metadata_for_item_ids(item_ids),
        )
        return True

    def __complete_search_from_future(
        self,
        invocation: Gio.DBusMethodInvocation,
        to_variant: typing.Callable[[list], GLib.Variant],
        future: Future[list],
    ):
        future.add_done_callback(
            partial(GLib.idle_add, self.__complete_search, invocation, to_variant)
        )

    def __complete_search(
        self,
        invocation: Gio.DBusMethodInvocation,
        to_variant: typing.Callable[[list], GLib.Variant],
        future: Future[list],
    ):
        try:
            result = future.result()
        except Exception as error:
            invocation.return_error_literal(
                Gio.io_error_quark(),
                Gio.IOErrorEnum.FAILED,
                f"Error searching Kolibri: {error}",
            )
        else:
            invocation.return_value(to_variant(result))

    def __begin_auto_stop_timeout(self):
        if self.__auto_stop_timeout_source:
            return
        self.__auto_stop_timeout_source = GLib.timeout_add_seconds(
            5, self.__auto_stop_timeout_cb
        )

    def __cancel_auto_stop_timeout(self):
        if self.__auto_stop_timeout_source:
            GLib.source_remove(self.__auto_stop_timeout_source)
            self.__auto_stop_timeout_source = None

    def __auto_stop_timeout_cb(self) -> bool:
        # We manage Kolibri separately from GApplication's built in lifecycle
        # code. This allows us to stop the Kolibri service while providing the
        # KolibriDaemon dbus interface, instead of stopping Kolibri after the
        # dbus connection has been closed.

        # Stop Kolibri if no clients are connected
        if self.clients_count == 0 and self.__kolibri_state.is_running():
            self.__begin_stop_kolibri_timeout()
        else:
            self.__cancel_stop_kolibri_timeout()

        # Even if Kolibri's status is ERROR, we will continue running for
        # connected clients. This is because the error state usually requires
        # manual intervention.

        # Add a GApplication hold if clients are connected or Kolibri is running
        if self.clients_count > 0 or self.__kolibri_state.is_running():
            self.__application.hold_with_token(self)
        else:
            self.__application.release_with_token(self)

        return GLib.SOURCE_CONTINUE

    def __begin_stop_kolibri_timeout(self):
        if self.__stop_kolibri_timeout_source:
            return
        if self.__stop_kolibri_timeout_interval < 0:
            return
        self.__stop_kolibri_timeout_source = GLib.timeout_add_seconds(
            self.__stop_kolibri_timeout_interval, self.__stop_kolibri_timeout_cb
        )

    def __cancel_stop_kolibri_timeout(self):
        if self.__stop_kolibri_timeout_source:
            GLib.source_remove(self.__stop_kolibri_timeout_source)
            self.__stop_kolibri_timeout_source = None

    def __stop_kolibri_timeout_cb(self) -> bool:
        if self.clients_count == 0:
            self.__application.stop_kolibri()
        self.__stop_kolibri_timeout_source = None
        return GLib.SOURCE_REMOVE


class Application(Gio.Application):
    __search_handler: SearchHandler

    __use_session_bus: bool = False
    __use_system_bus: bool = False

    __public_interface: PublicDBusInterface

    __hold_tokens: set
    __system_name_id: typing.Optional[int] = None

    __bus_name_event: threading.Event
    __owns_bus_name: bool = False

    __kolibri_lock: threading.Lock
    __kolibri: typing.Optional[KolibriControl] = None
    __is_kolibri_released: bool = False
    __is_start_requested: bool = False

    def __init__(
        self,
        search_handler: SearchHandler,
        *args,
        **kwargs,
    ):
        super().__init__(
            *args,
            application_id=DAEMON_APPLICATION_ID,
            flags=(
                Gio.ApplicationFlags.IS_SERVICE | Gio.ApplicationFlags.ALLOW_REPLACEMENT
            ),
            inactivity_timeout=INACTIVITY_TIMEOUT_MS,
            **kwargs,
        )

        self.__search_handler = search_handler

        self.__bus_name_event = threading.Event()
        self.__kolibri_lock = threading.Lock()

        self.__public_interface = PublicDBusInterface(self)
        self.__public_interface.init()

        self.__hold_tokens = set()

        # Released once Kolibri attaches, so a long initialize() never trips
        # the inactivity timeout.
        self.hold()

        self.add_main_option(
            "session",
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.NONE,
            "Connect to the session bus",
            None,
        )

        self.add_main_option(
            "system",
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.NONE,
            "Connect to the system bus",
            None,
        )

        self.add_main_option(
            "stop-timeout",
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.INT,
            "Timeout in seconds before stopping Kolibri",
            None,
        )

    def run(self, argv: typing.Optional[list] = None) -> int:
        try:
            return super().run(argv)
        finally:
            self.__bus_name_event.set()

    def await_bus_name(self) -> bool:
        """
        Blocks until this daemon owns its bus name, or until run() returns
        without owning it.
        """

        self.__bus_name_event.wait()
        return self.__owns_bus_name

    def attach_kolibri(self, kolibri: KolibriControl):
        with self.__kolibri_lock:
            if self.__is_kolibri_released:
                kolibri.exit()
                return
            self.__kolibri = kolibri
            if self.__is_start_requested:
                kolibri.start()
        GLib.idle_add(self.release)

    def update_kolibri_state(self, state: KolibriState):
        # Once detached, later states are dropped: Status must still read
        # STARTED when the bus name vanishes. Forwarding them would depend on
        # GLib dispatching the queued quit before the STOPPED that follows it.
        with self.__kolibri_lock:
            if not self.__is_kolibri_released:
                GLib.idle_add(self.__public_interface.set_kolibri_state, state)

    def detach_kolibri(self):
        self.__release_kolibri()
        GLib.idle_add(self.quit)

    def __release_kolibri(self) -> typing.Optional[KolibriControl]:
        with self.__kolibri_lock:
            kolibri = self.__kolibri
            self.__kolibri = None
            self.__is_kolibri_released = True
        return kolibri

    def start_kolibri(self):
        # Held so a Start during initialize() reaches Kolibri in order, from
        # attach_kolibri.
        with self.__kolibri_lock:
            self.__is_start_requested = True
            if self.__kolibri:
                self.__kolibri.start()

    def stop_kolibri(self):
        with self.__kolibri_lock:
            self.__is_start_requested = False
            if self.__kolibri:
                self.__kolibri.stop()

    @property
    def use_session_bus(self) -> bool:
        return self.__use_session_bus

    @property
    def use_system_bus(self) -> bool:
        return self.__use_system_bus

    def reset_inactivity_timeout(self):
        self.hold()
        self.release()

    def hold_with_token(self, token: typing.Hashable):
        if token not in self.__hold_tokens:
            self.hold()
            self.__hold_tokens.add(token)

    def release_with_token(self, token: typing.Hashable):
        if token in self.__hold_tokens:
            self.__hold_tokens.remove(token)
            self.release()

    def generate_login_token(self, user_info: UserInfo) -> str:
        return login_tokens.generate_for_user(
            user_info.user_id, user_info.user_name, user_info.is_admin
        )

    def get_item_ids_for_search(self, search: str) -> Future[list]:
        return self.__search_handler.get_item_ids_for_search(search)

    def get_metadata_for_item_ids(self, item_ids: list) -> Future[list]:
        return self.__search_handler.get_metadata_for_item_ids(item_ids)

    def do_dbus_register(
        self, connection: Gio.DBusConnection, object_path: str
    ) -> bool:
        if self.use_session_bus:
            self.__public_interface.export(connection, DAEMON_MAIN_OBJECT_PATH)
        return True

    def do_dbus_unregister(
        self, connection: Gio.DBusConnection, object_path: str
    ) -> bool:
        self.__public_interface.unexport(connection)
        return True

    def do_name_lost(self):
        self.quit()

    def do_handle_local_options(self, options: GLib.VariantDict) -> int:
        use_system_bus = options.lookup_value("system", None)
        if use_system_bus is not None:
            self.__use_system_bus = use_system_bus.get_boolean()
        else:
            self.__use_system_bus = False

        use_session_bus = options.lookup_value("session", None)
        if use_session_bus is not None:
            self.__use_session_bus = use_session_bus.get_boolean()
        elif self.__use_system_bus:
            # The --session and --system options are mutually exclusive
            self.__use_session_bus = False
        else:
            self.__use_session_bus = True

        stop_timeout = options.lookup_value("stop-timeout", GLib.VariantType("i"))
        if stop_timeout:
            self.__public_interface.autostop_timeout = stop_timeout.get_int32()

        return -1

    def do_startup(self):
        if self.use_system_bus:
            Gio.bus_get(Gio.BusType.SYSTEM, None, self.__system_bus_on_get)

        Gio.Application.do_startup(self)

        if self.use_session_bus:
            self.__on_bus_name_owned()

    def do_shutdown(self):
        kolibri = self.__release_kolibri()
        if kolibri:
            kolibri.exit()

        if self.__system_name_id:
            Gio.bus_unown_name(self.__system_name_id)
            self.__system_name_id = 0

        self.__public_interface.shutdown()

        Gio.Application.do_shutdown(self)

    def __on_bus_name_owned(self):
        self.__owns_bus_name = True
        self.__bus_name_event.set()

    def __system_bus_on_get(self, source: GLib.Object, result: Gio.AsyncResult):
        connection = Gio.bus_get_finish(result)

        accounts_service = AccountsServiceManager.get_default(connection)
        accounts_service.init()

        self.__public_interface.set_accounts_service(accounts_service)
        self.__public_interface.export(connection, DAEMON_MAIN_OBJECT_PATH)

        self.__system_name_id = Gio.bus_own_name_on_connection(
            connection,
            DAEMON_APPLICATION_ID,
            Gio.BusNameOwnerFlags.NONE,
            self.__on_system_name_acquired,
            self.__on_system_name_lost,
        )

    def __on_system_name_acquired(self, connection: Gio.DBusConnection, name: str):
        self.__on_bus_name_owned()

    def __on_system_name_lost(
        self, connection: typing.Optional[Gio.DBusConnection], name: str
    ):
        if connection:
            self.__public_interface.unexport(connection)
        self.quit()
