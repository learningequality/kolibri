import json
import re

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db.models import IntegerField
from django.db.models.expressions import Case
from django.db.models.expressions import When
from morango.management.commands.cleanupsyncs import Command as CleanupsyncCommand
from morango.models import Filter
from morango.models import ScopeDefinition
from morango.models import SyncSession
from morango.sync.controller import MorangoProfileController
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied

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
from kolibri.core.auth.management.utils import get_client_and_server_certs
from kolibri.core.auth.management.utils import get_facility
from kolibri.core.auth.management.utils import get_facility_dataset_id
from kolibri.core.auth.management.utils import get_network_connection
from kolibri.core.auth.management.utils import is_portal_sync
from kolibri.core.auth.management.utils import MorangoSyncCommand
from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import Membership
from kolibri.core.auth.models import Role
from kolibri.core.device.utils import device_provisioned
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.utils.retry import retry


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
            baseurl, identifier=facility_id, noninteractive=True
        )

        # username and password are not required for this to succeed unless there is no cert
        get_client_and_server_certs(
            username,
            password,
            dataset_id,
            network_connection,
            user_id=user_id,
            facility_id=facility_id,
            noninteractive=True,
        )
    except (CommandError, NetworkLocationResponseFailure) as e:
        if not username and not password:
            raise PermissionDenied(
                "Username and password required to validate sync credentials, and were not supplied"
            )
        else:
            raise AuthenticationFailed(e)


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
    resource_id_name = "{}_id".format(resource_name)
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
        raise CommandError("Kolibri is unprovisioned")
    CleanupsyncCommand().handle(
        ids=ids,
        sync_filter=sync_filter,
        client_instance_id=client_instance_id,
        server_instance_id=server_instance_id,
        push=push,
        pull=pull,
        expiration=expiration,
    )


def perform_sync(
    baseurl=DATA_PORTAL_SYNCING_BASE_URL,
    facility=None,
    chunk_size=200,
    username=None,
    password=None,
    user=None,
    noninteractive=False,
    no_push=False,
    no_pull=False,
    no_provision=False,
    keep_alive=False,
):
    facility_id = facility
    user_id = user

    # call this in case user directly syncs without migrating database
    if not ScopeDefinition.objects.filter():
        call_command("loaddata", "scopedefinitions")

    network_connection = get_network_connection(baseurl)
    baseurl = network_connection.base_url

    if user_id:  # it's a single-user sync
        if not facility_id:
            raise CommandError(
                "Facility ID must be specified in order to do single-user syncing"
            )
        if not re.match("[a-f0-9]{32}", user_id):
            raise CommandError("User ID must be a 32-character UUID (no dashes)")

        facility_id, dataset_id = get_facility_dataset_id(
            baseurl, identifier=facility_id, noninteractive=True
        )

        client_cert, server_cert, username = get_client_and_server_certs(
            username,
            password,
            dataset_id,
            network_connection,
            user_id=user_id,
            facility_id=facility_id,
            noninteractive=noninteractive,
        )

        scopes = [client_cert.scope_definition_id, server_cert.scope_definition_id]

        if len(set(scopes)) != 2:
            raise CommandError(
                "To do a single-user sync, one device must have a single-user certificate, and the other a full-facility certificate."
            )
    elif is_portal_sync(baseurl):  # do portal sync setup
        facility = get_facility(facility_id=facility_id, noninteractive=noninteractive)

        client_cert = (
            facility.dataset.get_owned_certificates()
            .filter(scope_definition_id=ScopeDefinitions.FULL_FACILITY)
            .first()
        )
        if not client_cert:
            raise CommandError(
                "This device does not own a certificate for Facility: {}".format(
                    facility.name
                )
            )

        scope_params = json.loads(client_cert.scope_params)
        dataset_id = scope_params["dataset_id"]

        server_certs = network_connection.get_remote_certificates(
            dataset_id, scope_def_id=ScopeDefinitions.FULL_FACILITY
        )

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
        facility_id, dataset_id = get_facility_dataset_id(
            baseurl, identifier=facility_id, noninteractive=noninteractive
        )

        client_cert, server_cert, username = get_client_and_server_certs(
            username,
            password,
            dataset_id,
            network_connection,
            facility_id=facility_id,
            noninteractive=noninteractive,
        )

    sync_session_client = network_connection.create_sync_session(
        client_cert, server_cert, chunk_size=chunk_size
    )

    MorangoSyncCommand()._sync(
        sync_session_client,
        no_push=no_push,
        no_pull=no_pull,
        noninteractive=noninteractive,
        no_provision=no_provision,
        keep_alive=keep_alive,
        user=user,
        username=username,
    )


def perform_resumesync(
    id,
    baseurl=DATA_PORTAL_SYNCING_BASE_URL,
    chunk_size=500,
    noninteractive=False,
    no_push=False,
    no_pull=False,
    no_provision=False,
    user=None,
    keep_alive=False,
):
    network_connection = get_network_connection(baseurl)
    sync_session_client = network_connection.resume_sync_session(
        id, chunk_size=chunk_size
    )

    MorangoSyncCommand()._sync(
        sync_session_client,
        no_push=no_push,
        no_pull=no_pull,
        noninteractive=noninteractive,
        no_provision=no_provision,
        keep_alive=keep_alive,
        user=user,
    )
