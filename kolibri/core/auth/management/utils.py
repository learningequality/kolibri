"""
Utility methods for syncing.
"""
import getpass
import json
import logging
import math
import sys
from contextlib import contextmanager
from functools import wraps

import requests
from django.core.management.base import CommandError
from django.urls import reverse
from django.utils.six.moves import input
from morango.models import Certificate
from morango.models import InstanceIDModel
from morango.models import ScopeDefinition
from morango.sync.controller import MorangoProfileController
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants.morango_sync import DATA_PORTAL_SYNCING_BASE_URL
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.constants.morango_sync import State
from kolibri.core.auth.models import dataset_cache
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.sync_event_hook_utils import register_sync_event_handlers
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import provision_device
from kolibri.core.device.utils import provision_single_user_device
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import URLParseError
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.management.commands.base import AsyncCommand
from kolibri.core.utils.lock import db_lock
from kolibri.utils.data import bytes_for_humans


logger = logging.getLogger(__name__)


def confirm_or_exit(message):
    answer = ""
    while answer not in ["yes", "n", "no"]:
        answer = input("{} [Type 'yes' or 'no'.] ".format(message)).lower()
    if answer != "yes":
        print("Canceled! Exiting without touching the database.")
        sys.exit(1)


def _interactive_client_facility_selection():
    facilities = Facility.objects.all().order_by("name")
    message = "Please choose a facility:\n"
    for idx, facility in enumerate(facilities):
        message += "{}. {}\n".format(idx + 1, facility.name)
    idx = input(message)
    try:
        facility = facilities[int(idx) - 1]
    except IndexError:
        raise CommandError(
            (
                "{idx} is not in the range of (1, {range})".format(
                    idx=idx, range=len(facilities)
                )
            )
        )
    return facility


def _interactive_server_facility_selection(facilities):
    message = "Please choose a facility to sync with:\n"
    for idx, f in enumerate(facilities):
        message += "{}. {}\n".format(idx + 1, f["name"])
    idx = input(message)
    try:
        return facilities[int(idx) - 1]
    except IndexError:
        raise CommandError(
            (
                "{idx} is not in the range of (1, {range})".format(
                    idx=idx, range=len(facilities)
                )
            )
        )


def get_facility(facility_id=None, noninteractive=False):
    # try to get a valid facility from id
    if facility_id:
        try:
            facility = Facility.objects.get(id=facility_id)
        except Facility.DoesNotExist:
            raise CommandError("Facility with ID {} does not exist".format(facility_id))
    # if no id passed in, assume only one facility on device
    else:
        try:
            facility = Facility.objects.get()
        except Facility.DoesNotExist:
            raise CommandError(
                (
                    "There are no facilities on this device. "
                    "Please initialize your Kolibri installation by starting the server, loading Kolibri in the browser, "
                    "and completing the setup instructions. "
                )
            )
        except Facility.MultipleObjectsReturned:
            if noninteractive:
                raise CommandError(
                    (
                        "There are multiple facilities on this device. "
                        "Please pass in a facility ID by passing in --facility {ID} after the command."
                    )
                )
            else:
                # in interactive mode, allow user to select facility
                facility = _interactive_client_facility_selection()

    return facility


def get_facility_dataset_id(baseurl, identifier=None, noninteractive=False):
    # get list of facilities and if more than 1, display all choices to user
    facility_url = urljoin(baseurl, reverse("kolibri:core:publicfacility-list"))
    response = requests.get(facility_url)
    response.raise_for_status()
    facilities = response.json()
    if not facilities:
        raise CommandError("There are no facilities available at: {}".format(baseurl))
    # if provided, look up identifier in list of dataset and facility ids
    if identifier:
        for obj in facilities:
            if identifier == obj["dataset"] or identifier == obj.get("id"):
                return identifier, obj["dataset"]
        raise CommandError(
            "Facility with ID {} does not exist on server".format(identifier)
        )

    if noninteractive and len(facilities) > 1:
        raise CommandError(
            (
                "There are multiple facilities on the server. "
                "Please pass in a facility ID by passing in --facility {ID} after the command."
            )
        )

    facility = (
        _interactive_server_facility_selection(facilities)
        if len(facilities) > 1
        else facilities[0]
    )
    return facility["id"], facility["dataset"]


def is_portal_sync(baseurl):
    return baseurl == DATA_PORTAL_SYNCING_BASE_URL


def get_baseurl(baseurl):
    # if url matches data portal, no need to validate it
    if is_portal_sync(baseurl):
        return baseurl

    # validate base url
    try:
        return NetworkClient(address=baseurl).base_url
    except URLParseError:
        raise CommandError(
            "Base URL/IP: {} is not valid. Please retry command and enter a valid URL/IP.".format(
                baseurl
            )
        )
    except NetworkLocationNotFound:
        raise CommandError("Unable to connect to: {}".format(baseurl))


def get_network_connection(baseurl):
    controller = MorangoProfileController(PROFILE_FACILITY_DATA)
    network_connection = controller.create_network_connection(get_baseurl(baseurl))

    # validate instance IDs are differemt, which would mean this device is trying to sync with itself
    if (
        InstanceIDModel.get_or_create_current_instance()[0].id
        == network_connection.server_info["instance_id"]
    ):
        raise CommandError(
            "Device can not sync with itself. Please recheck base URL and try again."
        )

    return network_connection


def get_client_and_server_certs(
    username,
    password,
    dataset_id,
    nc,
    user_id=None,
    facility_id=None,
    noninteractive=False,
):

    # get any full-facility certificates we have for the facility
    owned_certs = (
        Certificate.objects.filter(id=dataset_id)
        .get_descendants(include_self=True)
        .filter(scope_definition_id=ScopeDefinitions.FULL_FACILITY)
        .exclude(_private_key=None)
    )

    if not user_id:  # it's a full-facility sync

        csr_scope_params = {"dataset_id": dataset_id}

        client_scope = ScopeDefinitions.FULL_FACILITY
        server_scope = ScopeDefinitions.FULL_FACILITY

    else:  # it's a single-user sync

        csr_scope_params = {"dataset_id": dataset_id, "user_id": user_id}

        if owned_certs:
            # client is the one with a full-facility cert
            client_scope = ScopeDefinitions.FULL_FACILITY
            server_scope = ScopeDefinitions.SINGLE_USER
        else:
            # server must be the one with the full-facility cert
            client_scope = ScopeDefinitions.SINGLE_USER
            server_scope = ScopeDefinitions.FULL_FACILITY

            # check for certs we own for the specific user_id for single-user syncing
            owned_certs = (
                Certificate.objects.filter(id=dataset_id)
                .get_descendants(include_self=True)
                .filter(scope_definition_id=ScopeDefinitions.SINGLE_USER)
                .filter(scope_params__contains=user_id)
                .exclude(_private_key=None)
            )

    # get server certificates that server has a private key for
    server_certs = nc.get_remote_certificates(dataset_id, scope_def_id=server_scope)

    # filter down to the single-user certificates for this specific user, if needed
    if server_scope == ScopeDefinitions.SINGLE_USER:
        server_certs = [cert for cert in server_certs if user_id in cert.scope_params]

    if not server_certs:
        raise CommandError(
            "Server does not have needed certificate with scope '{}'".format(
                server_scope
            )
        )
    server_cert = server_certs[0]

    # if we don't own any certs, do a csr request
    if not owned_certs:

        # prompt user for creds if not already specified
        if not username or not password:
            if noninteractive:
                raise CommandError("Server username and/or password not specified")
            else:
                username = input("Please enter username: ")
                password = getpass.getpass("Please enter password: ")

        userargs = username
        if facility_id:
            # add facility so `FacilityUserBackend` can validate
            userargs = {
                FacilityUser.USERNAME_FIELD: username,
                FACILITY_CREDENTIAL_KEY: facility_id,
            }
        client_cert = nc.certificate_signing_request(
            server_cert,
            client_scope,
            csr_scope_params,
            userargs=userargs,
            password=password,
        )
    else:
        client_cert = owned_certs[0]

    return client_cert, server_cert, username


def create_superuser_and_provision_device(username, dataset_id, noninteractive=False):
    facility = Facility.objects.get(dataset_id=dataset_id)
    # if device has not been provisioned, set it up
    if not device_provisioned():
        provision_device(default_facility=facility)

    # Prompt user to pick a superuser if one does not currently exist
    while not DevicePermissions.objects.filter(is_superuser=True).exists():
        # specify username of account that will become a superuser
        if not username:
            if (
                noninteractive
            ):  # we don't want to setup a device without a superuser, so create a temporary one
                superuser = FacilityUser.objects.create(
                    username="superuser", facility=facility
                )
                superuser.set_password("password")
                superuser.save()
                DevicePermissions.objects.create(
                    user=superuser, is_superuser=True, can_manage_content=True
                )
                print(
                    "Temporary superuser with username: `superuser` and password: `password` created"
                )
                return
            username = input(
                "Please enter username of account that will become the superuser on this device: "
            )
        if not FacilityUser.objects.filter(username=username).exists():
            print(
                "User with username `{}` does not exist on this device".format(username)
            )
            username = None
            continue

        # make the user with the given credentials, a superuser for this device
        user = FacilityUser.objects.get(username=username, dataset_id=dataset_id)

        # create permissions for the authorized user
        DevicePermissions.objects.update_or_create(
            user=user, defaults={"is_superuser": True, "can_manage_content": True}
        )


def is_single_user_scoped(cert):
    """
    :type cert: Certificate
    :rtype: bool
    """
    return cert.scope_definition_id == ScopeDefinitions.SINGLE_USER


def get_sync_filter_scope(client_cert, user_id=None):
    """
    :type client_cert: Certificate
    :type user_id: str|None
    :return: (Scope, dict)
    """
    scope = client_cert.get_scope()
    params = json.loads(client_cert.scope_params)

    # when a user_id has been passed in, but the sync cert isn't a single user cert, we want to
    # use the same filters as a single user cert would, so we manually create a scope and to use
    # the same filters for the single user scope definition
    if user_id is not None and not is_single_user_scoped(client_cert):
        params.update(user_id=user_id)
        scope_def = ScopeDefinition.objects.get(id=ScopeDefinitions.SINGLE_USER)
        scope = scope_def.get_scope(params)

    return scope, params


def run_once(f):
    """
    Runs a function once, useful for connection once to a signal
    :type f: function
    :rtype: function
    """

    @wraps(f)
    def wrapper(*args, **kwargs):
        if not wrapper.has_run:
            result = f(*args, **kwargs)
            wrapper.has_run = True
            return result

    wrapper.has_run = False
    return wrapper


class MorangoSyncCommand(AsyncCommand):
    """
    Common methods for Morango sync commands
    """

    TRANSFER_MESSAGE = "{records_transferred}/{records_total}, {transfer_total}"

    def _sync(self, sync_session_client, **options):  # noqa: C901
        """
        :type sync_session_client: morango.sync.syncsession.SyncSessionClient
        :param options: Command arguments
        :return:
        """
        username = options.get("username")
        (no_push, no_pull, noninteractive, no_provision, keep_alive, user_id) = (
            options["no_push"],
            options["no_pull"],
            options["noninteractive"],
            options["no_provision"],
            options["keep_alive"],
            options["user"],
        )

        client_cert = sync_session_client.sync_session.client_certificate
        register_sync_event_handlers(sync_session_client.controller)

        filter_scope, scope_params = get_sync_filter_scope(client_cert, user_id=user_id)
        dataset_id = scope_params.get("dataset_id")
        pull_filter = filter_scope.read_filter
        push_filter = filter_scope.write_filter

        # when given a user ID but the cert isn't a single user cert, we'll flip the read and write
        # filters such that this performs a single user sync with the perspective that the instance
        # we're syncing with is the SoUD
        if user_id is not None and not is_single_user_scoped(client_cert):
            pull_filter = filter_scope.write_filter
            push_filter = filter_scope.read_filter

        dataset_cache.clear()
        dataset_cache.activate()

        if not noninteractive:
            # output session ID for CLI user
            logger.info("Session ID: {}".format(sync_session_client.sync_session.id))
            logger.info(
                "Session instance info: {}".format(
                    sync_session_client.sync_session.client_instance_data
                )
            )

        try:
            # pull from server
            if not no_pull:
                self._pull(
                    sync_session_client,
                    noninteractive,
                    pull_filter,
                )
                # and push our own data to server
            if not no_push:
                self._push(
                    sync_session_client,
                    noninteractive,
                    push_filter,
                )

            if not no_provision:
                with self._lock():
                    if user_id:
                        provision_single_user_device(
                            FacilityUser.objects.get(id=user_id)
                        )
                    else:
                        create_superuser_and_provision_device(
                            username, dataset_id, noninteractive=noninteractive
                        )

        except UserCancelledError:
            if self.job:
                self.job.extra_metadata.update(sync_state=State.CANCELLED)
                self.job.save_meta()
            logger.info("Syncing has been cancelled.")
            return

        conn = sync_session_client.sync_connection

        # if not keeping the sync session alive, close it!
        if not keep_alive:
            conn.close_sync_session(sync_session_client.sync_session)

        # close network connection
        conn.close()

        if self.job:
            self.job.extra_metadata.update(sync_state=State.COMPLETED)
            self.job.save_meta()

        dataset_cache.deactivate()
        if not noninteractive:
            logger.info("Syncing has been completed.")

    @contextmanager
    def _lock(self):
        cancellable = False
        # job can't be cancelled while locked
        if self.job:
            cancellable = self.job.cancellable
            self.job.save_as_cancellable(cancellable=False)

        with db_lock():
            yield

        if self.job:
            self.job.save_as_cancellable(cancellable=cancellable)

    def _raise_cancel(self, *args, **kwargs):
        if self.is_cancelled() and (not self.job or self.job.cancellable):
            raise UserCancelledError()

    def _pull(
        self,
        sync_session_client,
        noninteractive,
        sync_filter,
    ):
        """
        :type sync_session_client: morango.sync.syncsession.SyncSessionClient
        :type noninteractive: bool
        :type sync_filter: Filter
        """
        sync_client = sync_session_client.get_pull_client()
        sync_client.signals.queuing.connect(self._raise_cancel)
        sync_client.signals.transferring.connect(self._raise_cancel)

        self._queueing_tracker_adapter(
            sync_client.signals.queuing,
            "Remotely preparing data",
            State.REMOTE_QUEUING,
            noninteractive,
        )
        self._transfer_tracker_adapter(
            sync_client.signals.transferring,
            "Receiving data ({})".format(self.TRANSFER_MESSAGE),
            State.PULLING,
            noninteractive,
        )
        self._queueing_tracker_adapter(
            sync_client.signals.dequeuing,
            "Locally integrating received data",
            State.LOCAL_DEQUEUING,
            noninteractive,
        )

        self._session_tracker_adapter(
            sync_client.signals.session,
            noninteractive,
        )

        sync_client.initialize(sync_filter)

        sync_client.run()
        with self._lock():
            sync_client.finalize()

    def _push(
        self,
        sync_session_client,
        noninteractive,
        sync_filter,
    ):
        """
        :type sync_session_client: morango.sync.syncsession.SyncSessionClient
        :type noninteractive: bool
        :type sync_filter: Filter
        """
        sync_client = sync_session_client.get_push_client()
        sync_client.signals.transferring.connect(self._raise_cancel)

        self._queueing_tracker_adapter(
            sync_client.signals.queuing,
            "Locally preparing data to send",
            State.LOCAL_QUEUING,
            noninteractive,
        )
        self._transfer_tracker_adapter(
            sync_client.signals.transferring,
            "Sending data ({})".format(self.TRANSFER_MESSAGE),
            State.PUSHING,
            noninteractive,
        )
        self._queueing_tracker_adapter(
            sync_client.signals.dequeuing,
            "Remotely integrating data",
            State.REMOTE_DEQUEUING,
            noninteractive,
        )

        self._session_tracker_adapter(
            sync_client.signals.session,
            noninteractive,
        )

        with self._lock():
            sync_client.initialize(sync_filter)

        sync_client.run()

        # we can't cancel remotely integrating data
        if self.job:
            self.job.save_as_cancellable(cancellable=False)

        # allow server timeout since remotely integrating data can take a while and the request
        # could timeout. In that case, we'll assume everything is good.
        sync_client.finalize()

    def _update_all_progress(self, progress_fraction, progress):
        """
        Override parent progress update callback to report from the progress tracker we're sent
        """
        if self.job:
            self.job.update_progress(progress_fraction, 1.0)
            self.job.extra_metadata.update(progress.extra_data)
            self.job.save_meta()

    def _session_tracker_adapter(self, signal_group, noninteractive):
        """
        Attaches a signal handler to session creation signals

        :type signal_group: morango.sync.syncsession.SyncSignalGroup
        :type noninteractive: bool
        """

        @run_once
        def session_creation(transfer_session):
            """
            A session is created individually for pushing and pulling
            """
            if self.job:
                self.job.extra_metadata.update(sync_state=State.SESSION_CREATION)

        @run_once
        def session_destruction(transfer_session):
            if not noninteractive and transfer_session.records_total == 0:
                logger.info("There are no records to transfer")

        signal_group.started.connect(session_creation)
        signal_group.completed.connect(session_destruction)

    def _transfer_tracker_adapter(
        self, signal_group, message, sync_state, noninteractive
    ):
        """
        Attaches a signal handler to pushing/pulling signals

        :type signal_group: morango.sync.syncsession.SyncSignalGroup
        :type message: str
        :type sync_state: str
        :type noninteractive: bool
        """
        tracker = self.start_progress(total=100)

        def stats_msg(transfer_session):
            transfer_total = (
                transfer_session.bytes_sent + transfer_session.bytes_received
            )
            return message.format(
                records_transferred=transfer_session.records_transferred,
                records_total=transfer_session.records_total,
                transfer_total=bytes_for_humans(transfer_total),
            )

        def stats(transfer_session):
            if transfer_session.records_total > 0:
                logger.info(stats_msg(transfer_session))

        def handler(transfer_session):
            """
            :type transfer_session: morango.models.core.TransferSession
            """
            if transfer_session.records_total > 0:
                progress = (
                    100
                    * transfer_session.records_transferred
                    / float(transfer_session.records_total)
                )
            else:
                progress = 100

            tracker.update_progress(
                increment=math.ceil(progress - tracker.progress),
                message=stats_msg(transfer_session),
                extra_data=dict(
                    bytes_sent=transfer_session.bytes_sent,
                    bytes_received=transfer_session.bytes_received,
                    sync_state=sync_state,
                ),
            )

        if noninteractive or tracker.progressbar is None:
            signal_group.started.connect(stats)
            signal_group.in_progress.connect(stats)

        signal_group.connect(handler)

    def _queueing_tracker_adapter(
        self, signal_group, message, sync_state, noninteractive
    ):
        """
        Attaches a signal handler to queuing/dequeuing signals

        :type signal_group: morango.sync.syncsession.SyncSignalGroup
        :type message: str
        :type sync_state: str
        :type noninteractive: bool
        """
        tracker = self.start_progress(total=2)

        def started(transfer_session):
            dataset_cache.clear()
            if noninteractive or tracker.progressbar is None:
                if (
                    not sync_state.endswith("DEQUEUING")
                    or transfer_session.records_total > 0
                ):
                    logger.info(message)
                else:
                    logger.info("No records transferred")

        def handler(transfer_session):
            tracker.update_progress(
                message=message, extra_data=dict(sync_state=sync_state)
            )

        signal_group.started.connect(started)
        signal_group.started.connect(handler)
