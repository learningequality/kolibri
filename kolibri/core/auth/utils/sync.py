import json

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection
from django.db.models import IntegerField
from django.db.models.expressions import Case
from django.db.models.expressions import When
from morango.models import ScopeDefinition
from morango.models import SyncSession
from morango.sync.controller import MorangoProfileController
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied

from kolibri.core.auth.constants.collection_kinds import ADHOCLEARNERSGROUP
from kolibri.core.auth.constants.collection_kinds import CLASSROOM
from kolibri.core.auth.constants.collection_kinds import LEARNERGROUP
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.management.utils import get_client_and_server_certs
from kolibri.core.auth.management.utils import get_facility_dataset_id
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure


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
        **filters
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
