import copy
import json
import logging
import re
from abc import ABCMeta
from abc import abstractmethod
from contextlib import contextmanager
from functools import wraps

from django.core.management import call_command
from django.db import connection
from django.db.models import IntegerField
from django.db.models.expressions import Case
from django.db.models.expressions import When
from morango.management.commands.cleanupsyncs import Command as CleanupsyncCommand
from morango.models import Certificate
from morango.models import Filter
from morango.models import InstanceIDModel
from morango.models import ScopeDefinition
from morango.models import SyncSession
from morango.sync.controller import MorangoProfileController
from morango.sync.controller import SessionControllerSignals
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied

from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants import collection_kinds
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.constants.collection_kinds import CLASSROOM
from kolibri.core.auth.constants.collection_kinds import LEARNERGROUP
from kolibri.core.auth.constants.morango_sync import DATA_PORTAL_SYNCING_BASE_URL
from kolibri.core.auth.constants.morango_sync import PARTITION_CLASSROOM
from kolibri.core.auth.constants.morango_sync import PARTITION_SUFFIX_COACH_RW
from kolibri.core.auth.constants.morango_sync import PARTITION_SUFFIX_LEARNER_RW
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.constants.morango_sync import State
from kolibri.core.auth.errors import DeviceNotProvisionedError
from kolibri.core.auth.errors import FacilityLookupError
from kolibri.core.auth.errors import MissingSyncCredentialsError
from kolibri.core.auth.errors import MultipleFacilitiesError
from kolibri.core.auth.errors import SyncError
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import dataset_cache
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Membership
from kolibri.core.auth.models import Role
from kolibri.core.auth.sync_event_hook_utils import post_sync_transfer_handler
from kolibri.core.auth.sync_event_hook_utils import pre_sync_transfer_handler
from kolibri.core.auth.utils.facility import get_facility
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import device_provisioned
from kolibri.core.device.utils import provision_device
from kolibri.core.device.utils import provision_single_user_device
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.utils import JobProgressMixin
from kolibri.core.utils.lock import db_lock_sqlite_only
from kolibri.core.utils.retry import retry
from kolibri.core.utils.urls import reverse_path
from kolibri.utils.data import bytes_for_humans

logger = logging.getLogger(__name__)


def find_soud_sync_sessions(using=None, **filters):
    """
    :param using: Database alias string
    :param filters: A dict of queryset filter
    :return: A SyncSession queryset
    """
    qs = SyncSession.objects.all()
    if using is not None:
        qs = qs.using(using)

    return qs.filter(
        active=True,
        connection_kind="network",
        profile=PROFILE_FACILITY_DATA,
        client_certificate__scope_definition_id=ScopeDefinitions.SINGLE_USER,
        **filters,
    ).order_by("-last_activity_timestamp")


def find_soud_sync_session_for_resume(user, base_url, using=None):
    """
    Finds the most recently active sync session for a SoUD sync

    :type user: FacilityUser
    :param base_url: The server url
    :type base_url: str
    :param using: Database alias string
    :rtype: SyncSession|None
    """
    # SoUD requests sync with server, so for resume we filter by client and matching base url
    sync_sessions = find_soud_sync_sessions(
        is_server=False,
        connection_path__startswith=base_url.rstrip("/"),
        using=using,
    )

    # ensure the certificate is for the user we're checking for
    for sync_session in sync_sessions:
        scope_params = json.loads(sync_session.client_certificate.scope_params)
        dataset_id = scope_params.get("dataset_id")
        user_id = scope_params.get("user_id")
        if user_id == user.id and user.dataset_id == dataset_id:
            return sync_session

    return None


def get_facility_dataset_id(baseurl, identifier=None):
    client = NetworkClient.discover_from_address(baseurl)
    facility_url = reverse_path("kolibri:core:publicfacility-list")
    response = client.get(facility_url)
    facilities = response.json()
    if not facilities:
        raise FacilityLookupError(f"There are no facilities available at: {baseurl}")
    # if provided, look up identifier in list of dataset and facility ids
    if identifier:
        for obj in facilities:
            if identifier == obj["dataset"] or identifier == obj.get("id"):
                return identifier, obj["dataset"]
        raise FacilityLookupError(
            f"Facility with ID {identifier} does not exist on server"
        )

    if len(facilities) > 1:
        raise MultipleFacilitiesError(
            "There are multiple facilities on the server.", facilities
        )

    return facilities[0]["id"], facilities[0]["dataset"]


def is_portal_sync(baseurl):
    return baseurl == DATA_PORTAL_SYNCING_BASE_URL


def get_baseurl(address):
    # if url matches data portal, no need to validate it
    if is_portal_sync(address):
        return address

    return NetworkClient.discover_from_address(address).base_url


def get_network_connection(address):
    controller = MorangoProfileController(PROFILE_FACILITY_DATA)
    network_connection = controller.create_network_connection(get_baseurl(address))

    # validate instance IDs are differemt, which would mean this device is trying to sync with itself
    if (
        InstanceIDModel.get_or_create_current_instance()[0].id
        == network_connection.server_info["instance_id"]
    ):
        raise SyncError(
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
        raise SyncError(
            f"Server does not have needed certificate with scope '{server_scope}'"
        )
    server_cert = server_certs[0]

    # if we don't own any certs, do a csr request
    if not owned_certs:
        if not username or not password:
            raise MissingSyncCredentialsError(
                "Server username and/or password not specified"
            )

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


def create_superuser_and_provision_device(username, dataset_id):
    facility = Facility.objects.get(dataset_id=dataset_id)
    # if device has not been provisioned, set it up
    if not device_provisioned():
        provision_device(default_facility=facility)

    if DevicePermissions.objects.filter(is_superuser=True).exists():
        return

    if username and FacilityUser.objects.filter(username=username).exists():
        # make the user with the given credentials, a superuser for this device
        user = FacilityUser.objects.get(username=username, dataset_id=dataset_id)

        # create permissions for the authorized user
        DevicePermissions.objects.update_or_create(
            user=user, defaults={"is_superuser": True, "can_manage_content": True}
        )
        return

    if username:
        logger.error("User with username `%s` does not exist on this device", username)

    # we don't want to setup a device without a superuser, so create a temporary one
    superuser = FacilityUser.objects.create(username="superuser", facility=facility)
    superuser.set_password("password")
    superuser.save()
    DevicePermissions.objects.create(
        user=superuser, is_superuser=True, can_manage_content=True
    )
    logger.info(
        "Temporary superuser with username: `superuser` and password: `password` created"
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


@retry(NetworkClientError)
def validate_and_create_sync_credentials(
    baseurl, facility_id, username, password, user_id=None
):
    """
    Validates user credentials for syncing by performing certificate verification, which will also
    save any certificates after successful authentication

    :param user_id: Optional user ID for SoUD use case
    """
    # call this in case user directly syncs without migrating database
    if not ScopeDefinition.objects.filter():
        call_command("loaddata", "scopedefinitions")

    controller = MorangoProfileController(PROFILE_FACILITY_DATA)
    network_connection = controller.create_network_connection(baseurl)

    # try to get the certificate, which will save it if successful
    try:
        # make sure we get the dataset ID
        facility_id, dataset_id = get_facility_dataset_id(
            baseurl, identifier=facility_id
        )

        # username and password are not required for this to succeed unless there is no cert
        get_client_and_server_certs(
            username,
            password,
            dataset_id,
            network_connection,
            user_id=user_id,
            facility_id=facility_id,
        )
    except (FacilityLookupError, SyncError, NetworkLocationResponseFailure) as e:
        if not username and not password:
            raise PermissionDenied(
                "Username and password required to validate sync credentials, and were not supplied"
            ) from e
        raise AuthenticationFailed(e) from e


def learner_canonicalized_assignments(resource_name, assignments):
    """
    Creates a queryset of assignments to ensure that there is only one assignment
    per 'resource_name' (e.g. lesson or exam), and that the canonical assignment is the one
    with assigned in this order: classroom, learnergroup, adhoclearnersgroup, none.

    This should not be used for a queryset that holds assignments for more than one learner.

    :param resource_name: The name of the resource that the assignments are for
    :param assignments: An assignment queryset, for LessonAssignment or ExamAssignment
    :return: A queryset of canonicalized assignments
    """
    resource_id_name = f"{resource_name}_id"
    annotated_assignments = assignments.annotate(
        canonical_preference=Case(
            When(collection__kind=CLASSROOM, then=1),
            When(collection__kind=LEARNERGROUP, then=2),
            When(collection__kind=ADHOCLEARNERSGROUP, then=3),
            default=4,
            output_field=IntegerField(),
        )
    )

    # if postgres, we can use DISTINCT ON to get a list of distinct resource assignments
    # ordered by preference of which we use as the canonical assignment
    if connection.vendor == "postgresql":
        return annotated_assignments.distinct(resource_id_name).order_by(
            resource_id_name, "canonical_preference"
        )

    # Theoretically, we could use a subquery to get the canonical assignment for each resource_id
    # but Django pushes the ORDER BY clause into the subquery's SELECT clause, even with
    # `values('id')`, which breaks the `id__in` filter because 2 columns are returned instead of 1
    return assignments.filter(
        id__in=[
            (
                annotated_assignments.filter(**{resource_id_name: resource_id})
                .order_by("canonical_preference")
                .values_list("id", flat=True)
                .first()
            )
            for resource_id in assignments.values_list(
                resource_id_name, flat=True
            ).distinct()
        ]
    )


class ClassroomPartitionFactory:
    """
    A factory class to create partitions for syncable models related to the classroom partition
    structure.
    """

    def __init__(self, dataset_id):
        """
        :param dataset_id: The facility dataset id.
        :type dataset_id: str
        """
        self.dataset_id = dataset_id
        self.filter_template = PARTITION_CLASSROOM
        self.filter_suffix = None

    def set_suffix(self, suffix):
        """
        Sets the partition suffix.
        :rtype: ClassroomPartitionFactory
        """
        self.filter_suffix = suffix
        return self

    def set_coach_writeable(self):
        """
        Sets the writeable permission for the coach role.
        :rtype: ClassroomPartitionFactory
        """
        return self.set_suffix(PARTITION_SUFFIX_COACH_RW)

    def set_learner_writeable(self):
        """
        Sets the writeable permission for the learner role.
        :rtype: ClassroomPartitionFactory
        """
        return self.set_suffix(PARTITION_SUFFIX_LEARNER_RW)

    def build(self, collection_id, filter_suffix=None):
        """
        Builds the partition and returns it as a Filter instance.
        :param collection_id: The classroom's collection ID.
        :param filter_suffix: An optional filter suffix that overrides the factory's.
        :return: Filter instance
        :rtype: Filter
        """
        filter_template = self.filter_template
        filter_suffix = filter_suffix or self.filter_suffix

        if filter_suffix:
            filter_template += filter_suffix

        return Filter.from_template(
            filter_template,
            params={
                "dataset_id": self.dataset_id,
                "collection_id": collection_id,
            },
        )

    @classmethod
    def get_classroom_collection(cls, collection_id=None, collection=None):
        """
        Determines the classroom collection of a collection tree.
        :param collection_id: The ID of a collection.
        :param collection: A Collection instance.
        :return: A Collection instance that represents the classroom collection.
        :rtype: kolibri.core.auth.models.Collection
        """
        if collection is None and collection_id is None:
            raise ValueError("Either a Collection or collection_id is required.")

        if collection is None:
            collection = Collection.objects.get(pk=collection_id)

        while collection.kind != collection_kinds.CLASSROOM:
            if not collection.parent:
                raise ValueError("No classroom was found for the given collection.")
            collection = collection.parent

        return collection


class ClassroomPartitionFilterFactory(ClassroomPartitionFactory):
    """
    A factory class to create partition filters for syncing models related to the classroom
    partition structure.
    """

    def __init__(self, dataset_id):
        super().__init__(dataset_id)
        self.filter_writeable = False

    def set_writeable(self, writeable=True):
        """
        Sets the partition with writeable permission.
        :return: ClassroomPartitionFilterFactory
        """
        self.filter_writeable = writeable
        return self

    def build(self, collection_id, filter_suffix=None):
        """
        Builds the partition filter and returns it as a Filter instance, or None if the user
        is not associated with this classroom.

        :param collection_id: The classroom's collection ID.
        :param filter_suffix: An optional filter suffix that overrides the factory's.
        :return: Filter instance
        :rtype: Filter
        """
        filter_suffix = filter_suffix or self.filter_suffix

        if not filter_suffix and self.filter_writeable:
            raise ValueError(
                "A filter suffix must be specified for writeable permission"
            )

        return super().build(
            collection_id,
            filter_suffix=filter_suffix,
        )

    def build_for_user(self, user_id):
        """
        Generates a combined syncing partition filter for a user and all their memberships or roles
        with classroom collections

        :param user_id: The user ID to constrain the permittable partition filter
        :return: Filter or None
        :rtype: Filter|None
        """
        collection_groups = {
            PARTITION_SUFFIX_LEARNER_RW: (
                Membership.objects.filter(
                    dataset_id=self.dataset_id,
                    user_id=user_id,
                    collection__kind=collection_kinds.CLASSROOM,
                )
                .values_list("collection_id", flat=True)
                .distinct()
            ),
            PARTITION_SUFFIX_COACH_RW: (
                Role.objects.filter(
                    dataset_id=self.dataset_id,
                    user_id=user_id,
                    kind__in=[
                        role_kinds.COACH,
                        role_kinds.ADMIN,
                    ],
                )
                .values_list("collection_id", flat=True)
                .distinct()
            ),
        }
        combo_filter = None

        for suffix, collection_ids in collection_groups.items():
            for collection_id in collection_ids:
                collection_filter = self.build(
                    collection_id,
                    filter_suffix=suffix if self.filter_writeable else None,
                )
                combo_filter = Filter.add(combo_filter, collection_filter)

        return combo_filter


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
        return None

    wrapper.has_run = False
    return wrapper


class MorangoSyncManagerBase(JobProgressMixin, metaclass=ABCMeta):
    """
    Runs a Morango sync session, reporting progress to the CLI or current job
    """

    TRANSFER_MESSAGE = "{records_transferred}/{records_total}, {transfer_total}"

    def __init__(
        self,
        baseurl=DATA_PORTAL_SYNCING_BASE_URL,
        chunk_size=200,
        user_id=None,
        noninteractive=False,
        no_push=False,
        no_pull=False,
        no_provision=False,
        keep_alive=False,
    ):
        self.baseurl = baseurl
        self.chunk_size = chunk_size
        self.user_id = user_id
        self.username = None
        self.noninteractive = noninteractive
        self.no_push = no_push
        self.no_pull = no_pull
        self.no_provision = no_provision
        self.keep_alive = keep_alive
        super().__init__()

    @abstractmethod
    def create_sync_session_client(self, network_connection):
        """
        :type network_connection: morango.sync.syncsession.NetworkSyncConnection
        :rtype: morango.sync.syncsession.SyncSessionClient
        """

    def run(self):
        # try to connect to server
        network_connection = get_network_connection(self.baseurl)
        sync_session_client = self.create_sync_session_client(network_connection)

        user_id = self.user_id
        noninteractive = self.noninteractive
        client_cert = sync_session_client.sync_session.client_certificate
        # we create a custom signals, so we can fire them outside of transaction blocks
        custom_signals = SessionControllerSignals()
        custom_signals.initializing.started.connect(pre_sync_transfer_handler)
        custom_signals.cleanup.completed.connect(post_sync_transfer_handler)

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
            logger.info("Session ID: %s", sync_session_client.sync_session.id)
            logger.info(
                "Session instance info: %s",
                sync_session_client.sync_session.client_instance_data,
            )

        try:
            # pull from server
            if not self.no_pull:
                self._pull(
                    sync_session_client,
                    noninteractive,
                    pull_filter,
                    custom_signals,
                )
                # and push our own data to server
            if not self.no_push:
                self._push(
                    sync_session_client,
                    noninteractive,
                    push_filter,
                    custom_signals,
                )

            if not self.no_provision:
                self._provision(user_id, self.username, dataset_id)

        except UserCancelledError:
            self._save_sync_state(State.CANCELLED)
            logger.info("Syncing has been cancelled.")
            return

        conn = sync_session_client.sync_connection

        # if not keeping the sync session alive, close it!
        if not self.keep_alive:
            conn.close_sync_session(sync_session_client.sync_session)

        # close network connection
        conn.close()

        self._save_sync_state(State.COMPLETED)

        dataset_cache.deactivate()
        if not noninteractive:
            logger.info("Syncing has been completed.")

    def get_superuser_username(self, username):
        """
        Username of the account to make superuser when provisioning. Override to prompt.
        """
        return username

    def _provision(self, user_id, username, dataset_id):
        with self._lock():
            try:
                user = FacilityUser.all_objects.get(id=user_id)
            except FacilityUser.DoesNotExist:
                user = None
            if user:
                provision_single_user_device(user)
            else:
                create_superuser_and_provision_device(
                    self.get_superuser_username(username), dataset_id
                )

    def _save_sync_state(self, sync_state):
        if self.job:
            self.job.extra_metadata.update(sync_state=sync_state)
            self.job.save_meta()

    @contextmanager
    def _lock(self):
        cancellable = False
        # job can't be cancelled while locked
        if self.job:
            cancellable = self.job.cancellable
            self.job.save_as_cancellable(cancellable=False)

        with db_lock_sqlite_only():
            yield

        if self.job:
            self.job.save_as_cancellable(cancellable=cancellable)

    def _raise_cancel(self, *args, **kwargs):
        if self.is_cancelled() and (not self.job or self.job.cancellable):
            raise UserCancelledError()

    def _fire_signal_with_context_clone(self, signal, context, sync_filter=None):
        """
        Adding the sync_filter more than once raises an error

        :type signal: morango.sync.utils.SyncSignal
        :type context: morango.sync.context.CompositeSessionContext
        :type sync_filter: Filter|str
        """
        context_clone = copy.deepcopy(context)
        if sync_filter:
            # context_clone.filter = sync_filter
            context_clone._update_attrs(sync_filter=sync_filter)
        signal.fire(context=context_clone)

    def _pull(
        self,
        sync_session_client,
        noninteractive,
        sync_filter,
        custom_signals,
    ):
        """
        :type sync_session_client: morango.sync.syncsession.SyncSessionClient
        :type noninteractive: bool
        :type sync_filter: Filter
        :type custom_signals: SessionControllerSignals
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
            f"Receiving data ({self.TRANSFER_MESSAGE})",
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

        # update sync filter manually because sync hooks connected to signals need it,
        # see how `sync_client.initialize` does this
        self._fire_signal_with_context_clone(
            custom_signals.initializing.started, sync_client.context, sync_filter
        )
        sync_client.initialize(sync_filter)

        sync_client.run()
        with self._lock():
            sync_client.finalize()
        # fire completed signal outside of transaction block
        custom_signals.cleanup.completed.fire(context=sync_client.context)

    def _push(
        self,
        sync_session_client,
        noninteractive,
        sync_filter,
        custom_signals,
    ):
        """
        :type sync_session_client: morango.sync.syncsession.SyncSessionClient
        :type noninteractive: bool
        :type sync_filter: Filter
        :type custom_signals: SessionControllerSignals
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
            f"Sending data ({self.TRANSFER_MESSAGE})",
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

        # update sync filter manually because sync hooks connected to signals need it,
        # see how `sync_client.initialize` does this
        # fire signal outside of transaction block
        self._fire_signal_with_context_clone(
            custom_signals.initializing.started, sync_client.context, sync_filter
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
        # fire completed signal
        custom_signals.cleanup.completed.fire(context=sync_client.context)

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
            if (
                noninteractive or self.progresstracker.progressbar is None
            ) and transfer_session.records_total > 0:
                logger.info(stats_msg(transfer_session))

        def started(transfer_session):
            stats(transfer_session)
            self.start_progress(total=transfer_session.records_total or 100)

        def handler(transfer_session):
            """
            :type transfer_session: morango.models.core.TransferSession
            """
            if transfer_session.records_total > 0:
                progress = transfer_session.records_transferred
            else:
                progress = 100

            self.update_progress(
                current_progress=progress,
                message=stats_msg(transfer_session),
                extra_data={
                    "bytes_sent": transfer_session.bytes_sent,
                    "bytes_received": transfer_session.bytes_received,
                    "sync_state": sync_state,
                },
            )

        signal_group.started.connect(started)
        signal_group.started.connect(handler)
        signal_group.in_progress.connect(stats)
        signal_group.in_progress.connect(handler)
        signal_group.completed.connect(handler)

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

        def started(transfer_session):
            self.start_progress(total=1)
            dataset_cache.clear()
            if noninteractive or self.progresstracker.progressbar is None:
                if (
                    not sync_state.endswith("DEQUEUING")
                    or transfer_session.records_total > 0
                ):
                    logger.info(message)
                else:
                    logger.info("No records transferred")

        def handler(transfer_session):
            self.update_progress(message=message, extra_data={"sync_state": sync_state})

        signal_group.started.connect(started)
        signal_group.started.connect(handler)
        signal_group.completed.connect(handler)


def cleanup_sync_sessions(
    ids=None,
    sync_filter=None,
    client_instance_id=None,
    server_instance_id=None,
    push=None,
    pull=None,
    expiration=6,
):
    if not device_provisioned():
        raise DeviceNotProvisionedError("Kolibri is unprovisioned")
    CleanupsyncCommand().handle(
        ids=ids,
        sync_filter=sync_filter,
        client_instance_id=client_instance_id,
        server_instance_id=server_instance_id,
        push=push,
        pull=pull,
        expiration=expiration,
    )


class SyncManager(MorangoSyncManagerBase):
    def __init__(self, facility_id=None, username=None, password=None, **kwargs):
        super().__init__(**kwargs)
        self.facility_id = facility_id
        self.username = username
        self.password = password

    def get_facility(self, facility_id):
        return get_facility(facility_id=facility_id)

    def get_facility_dataset_id(self, baseurl, facility_id):
        return get_facility_dataset_id(baseurl, identifier=facility_id)

    def get_client_and_server_certs(self, dataset_id, network_connection, **kwargs):
        client_cert, server_cert, self.username = get_client_and_server_certs(
            self.username, self.password, dataset_id, network_connection, **kwargs
        )
        return client_cert, server_cert

    def create_sync_session_client(self, network_connection):
        facility_id = self.facility_id
        user_id = self.user_id

        # call this in case user directly syncs without migrating database
        if not ScopeDefinition.objects.filter():
            call_command("loaddata", "scopedefinitions")

        baseurl = network_connection.base_url

        if user_id:  # it's a single-user sync
            if not facility_id:
                raise SyncError(
                    "Facility ID must be specified in order to do single-user syncing"
                )
            if not re.match("[a-f0-9]{32}", user_id):
                raise SyncError("User ID must be a 32-character UUID (no dashes)")

            facility_id, dataset_id = get_facility_dataset_id(
                baseurl, identifier=facility_id
            )

            client_cert, server_cert = self.get_client_and_server_certs(
                dataset_id,
                network_connection,
                user_id=user_id,
                facility_id=facility_id,
            )

            scopes = [client_cert.scope_definition_id, server_cert.scope_definition_id]

            if len(set(scopes)) != 2:
                raise SyncError(
                    "To do a single-user sync, one device must have a single-user certificate, and the other a full-facility certificate."
                )
        elif is_portal_sync(baseurl):  # do portal sync setup
            facility = self.get_facility(facility_id)

            # check for the certs we own for the specific facility
            client_cert = (
                facility.dataset.get_owned_certificates()
                .filter(scope_definition_id=ScopeDefinitions.FULL_FACILITY)
                .first()
            )
            if not client_cert:
                raise SyncError(
                    f"This device does not own a certificate for Facility: {facility.name}"
                )

            # get primary partition
            scope_params = json.loads(client_cert.scope_params)
            dataset_id = scope_params["dataset_id"]

            # check if the server already has a cert for this facility
            server_certs = network_connection.get_remote_certificates(
                dataset_id, scope_def_id=ScopeDefinitions.FULL_FACILITY
            )

            # if necessary, push a cert up to the server
            server_cert = (
                server_certs[0]
                if server_certs
                else network_connection.push_signed_client_certificate_chain(
                    local_parent_cert=client_cert,
                    scope_definition_id=ScopeDefinitions.FULL_FACILITY,
                    scope_params=scope_params,
                )
            )

        else:  # do P2P setup
            facility_id, dataset_id = self.get_facility_dataset_id(baseurl, facility_id)

            client_cert, server_cert = self.get_client_and_server_certs(
                dataset_id,
                network_connection,
                facility_id=facility_id,
            )

        return network_connection.create_sync_session(
            client_cert, server_cert, chunk_size=self.chunk_size
        )


class ResumeSyncManager(MorangoSyncManagerBase):
    def __init__(self, sync_session_id, chunk_size=500, **kwargs):
        super().__init__(chunk_size=chunk_size, **kwargs)
        self.sync_session_id = sync_session_id

    def create_sync_session_client(self, network_connection):
        return network_connection.resume_sync_session(
            self.sync_session_id, chunk_size=self.chunk_size
        )
