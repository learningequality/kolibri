import logging
import ntpath
import os
import shutil

from django.conf import settings
from django.core.management import call_command
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ValidationError

from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.constants.morango_sync import State as FacilitySyncState
from kolibri.core.auth.constants.user_kinds import ADMIN
from kolibri.core.auth.constants.user_kinds import ASSIGNABLE_COACH
from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.auth.constants.user_kinds import SUPERUSER
from kolibri.core.auth.models import Facility
from kolibri.core.auth.utils.sync import find_soud_sync_sessions
from kolibri.core.auth.utils.sync import validate_and_create_sync_credentials
from kolibri.core.auth.utils.users import get_remote_users_info
from kolibri.core.device import soud
from kolibri.core.device.translation import get_device_language
from kolibri.core.device.translation import get_settings_language
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.core.error_constants import DEVICE_LIMITATIONS
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.job import JobStatus
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.permissions import IsAdminForJob
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.permissions import NotProvisioned
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.tasks.validation import JobValidator
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.filesystem import mkdirp
from kolibri.utils.time_utils import naive_utc_datetime
from kolibri.utils.translation import gettext as _


logger = logging.getLogger(__name__)
SOUD_SYNC_PROCESSING_JOB_ID = "50"


def status_fn(job):
    # Translators: A notification title shown to users when their Kolibri device is syncing data to another Kolibri instance
    data_syncing_in_progress = _("Data syncing in progress")

    # Translators: Notification text shown to users when their Kolibri device is syncing data to another Kolibri instance
    # to encourage them to stay connected to their network to ensure a successful sync.
    do_not_disconnect = _("Do not disconnect your device from the network.")
    return JobStatus(data_syncing_in_progress, do_not_disconnect)


class LocaleChoiceField(serializers.ChoiceField):
    """
    Because our default choices and values require initializing Django
    we wrap them in getters to avoid trying to initialize Django when
    this field is instantiated, which normally happens at time of module import.
    """

    def __init__(self, **kwargs):
        super(LocaleChoiceField, self).__init__([], **kwargs)
        self._choices_set = False

    @property
    def default(self):
        if not hasattr(self, "_default"):
            return get_device_language() or get_settings_language()
        return self._default

    @default.setter
    def default(self, value):
        self._default = value

    def _set_choices(self):
        if not self._choices_set:
            self._choices_set = True
            # Use the internal Choice field _set_choices setter method here
            super(LocaleChoiceField, self)._set_choices(settings.LANGUAGES)

    def to_internal_value(self, data):
        self._set_choices()
        return super(LocaleChoiceField, self).to_internal_value(data)

    def to_representation(self, value):
        self._set_choices()
        return super(LocaleChoiceField, self).to_representation(value)

    @property
    def choices(self):
        self._set_choices()
        return self._choices

    @choices.setter
    def choices(self, value):
        # Make this a no op, as we are only setting his in the getter above.
        pass


class ImportUsersFromCSVValidator(JobValidator):
    csvfile = serializers.FileField(required=False, use_url=False)
    csvfilename = serializers.CharField(required=False)
    dryrun = serializers.BooleanField(default=False)
    delete = serializers.BooleanField(default=False)
    locale = LocaleChoiceField()
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(), allow_null=True, default=None
    )

    def validate(self, data):
        if data.get("csvfile") and data.get("csvfilename"):
            raise serializers.ValidationError(
                "Only one of csvfile or csvfilename can be specified"
            )
        if not data.get("csvfile") and not data.get("csvfilename"):
            raise serializers.ValidationError(
                "One of csvfile or csvfilename must be specified"
            )
        facility = data.get("facility")
        if facility:
            facility_id = facility.id
        elif not facility and "user" in self.context:
            facility_id = self.context["user"].facility_id
        else:
            raise serializers.ValidationError("Facility must be specified")
        temp_dir = os.path.join(KOLIBRI_HOME, "temp")
        mkdirp(temp_dir, exist_ok=True)
        if "csvfile" in data:
            tmpfile = data["csvfile"].temporary_file_path()
            filename = ntpath.basename(tmpfile)
            filepath = os.path.join(temp_dir, filename)
            shutil.copyfile(tmpfile, filepath)
        else:
            filepath = os.path.join(temp_dir, data["csvfilename"])
            if not os.path.exists(filepath):
                raise serializers.ValidationError("Supplied csvfilename does not exist")
        args = [filepath]
        kwargs = {
            "locale": data.get("locale"),
            "facility": facility_id,
            "dryrun": data.get("dryrun", False),
            "delete": data.get("delete", False),
        }

        if "user" in self.context:
            kwargs["userid"] = self.context["user"].id
        return {
            "args": args,
            "kwargs": kwargs,
            "facility_id": facility_id,
        }


@register_task(
    validator=ImportUsersFromCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def importusersfromcsv(
    filepath, facility=None, userid=None, locale=None, dryrun=False, delete=False
):
    """
    Import users, classes, roles and roles assignemnts from a csv file.
    :param: FILE: file dictionary with the file object
    :param: csvfile: filename of the file stored in kolibri temp folder
    :param: dryrun: validate the data but don't modify the database
    :param: delete: Users not in the csv will be deleted from the facility, and classes cleared
    :returns: An object with the job information
    """

    call_command(
        "bulkimportusers",
        filepath,
        facility=facility,
        userid=userid,
        locale=locale,
        dryrun=dryrun,
        delete=delete,
    )


class ExportUsersToCSVValidator(JobValidator):
    locale = LocaleChoiceField()
    facility = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(), allow_null=True, default=None
    )

    def validate(self, data):
        facility = data.get("facility")
        if facility:
            facility_id = facility.id
        elif not facility and "user" in self.context:
            facility_id = self.context["user"].facility_id
        else:
            raise serializers.ValidationError("Facility must be specified")
        return {
            "kwargs": {"locale": data.get("locale"), "facility": facility_id},
            "facility_id": facility_id,
        }


@register_task(
    validator=ExportUsersToCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def exportuserstocsv(facility=None, locale=None):
    """
    Export users, classes, roles and roles assignemnts to a csv file.

    :param: facility_id
    :returns: An object with the job information
    """

    call_command(
        "bulkexportusers",
        facility=facility,
        locale=locale,
        overwrite="true",
    )


class SyncJobValidator(JobValidator):
    facility = serializers.PrimaryKeyRelatedField(queryset=Facility.objects.all())
    facility_name = serializers.CharField(required=False)
    command = serializers.ChoiceField(choices=["sync", "resumesync"], default="sync")
    sync_session_id = HexOnlyUUIDField(format="hex", required=False, allow_null=True)

    def validate(self, data):
        if not data.get("sync_session_id") and data["command"] == "resumesync":
            raise serializers.ValidationError(
                "sync_session_id must be specified for resumesync"
            )
        facility = data["facility"]
        if isinstance(facility, Facility):
            facility_id = facility.id
            facility_name = facility.name
        else:
            facility_id = facility
            facility_name = data["facility_name"]
        kwargs = dict(
            chunk_size=200,
            noninteractive=True,
        )
        if data["command"] == "resumesync":
            # Selectively add in the sync_session_id if resuming
            # as the sync command will reject the id parameter.
            kwargs["id"] = data["sync_session_id"]
        else:
            kwargs["facility"] = facility_id
        return {
            "extra_metadata": dict(
                facility_id=facility_id,
                facility_name=facility_name,
                sync_state=FacilitySyncState.PENDING,
                bytes_sent=0,
                bytes_received=0,
            ),
            "facility_id": facility_id,
            "kwargs": kwargs,
            "args": [data["command"]],
        }


facility_task_queue = "facility_task"


@register_task(
    validator=SyncJobValidator,
    permission_classes=[IsAdminForJob],
    track_progress=True,
    cancellable=False,
    queue=facility_task_queue,
    long_running=True,
    status_fn=status_fn,
)
def dataportalsync(command, **kwargs):
    """
    Initiate a PUSH sync with Kolibri Data Portal.
    """
    call_command(command, **kwargs)


class PeerSyncJobValidator(SyncJobValidator):
    baseurl = serializers.URLField(required=False)
    device_id = serializers.PrimaryKeyRelatedField(
        queryset=NetworkLocation.objects.all(), required=False
    )

    def validate(self, data):
        job_data = super(PeerSyncJobValidator, self).validate(data)
        if "baseurl" not in data and "device_id" not in data:
            raise serializers.ValidationError(
                "Either baseurl or device_id must be specified"
            )
        if data.get("device_id", None) is not None:
            if not data["device_id"].base_url:
                raise serializers.ValidationError("Device has no base url")
            data["baseurl"] = data["device_id"].base_url
        else:
            try:
                data["device_id"] = NetworkLocation.objects.filter(
                    base_url=data["baseurl"]
                ).first()
            except NetworkLocation.DoesNotExist:
                pass
        try:
            baseurl = NetworkClient.build_for_address(data["baseurl"]).base_url
        except NetworkLocationNotFound:
            raise ResourceGoneError()

        if data.get("device_id", None) is not None:
            device_name = data["device_id"].nickname or data["device_id"].device_name
            device_id = data["device_id"].id
        else:
            device_name = ""
            device_id = ""

        job_data["extra_metadata"].update(
            dict(
                device_name=device_name,
                device_id=device_id,
                baseurl=baseurl,
            )
        )
        job_data["kwargs"].update(dict(baseurl=baseurl))
        return job_data


class PeerFacilitySyncJobValidator(PeerSyncJobValidator):
    def validate(self, data):
        job_data = super(PeerFacilitySyncJobValidator, self).validate(data)
        validate_and_create_sync_credentials(
            job_data["kwargs"]["baseurl"],
            job_data["facility_id"],
            data.get("username"),
            data.get("password"),
        )
        return job_data


@register_task(
    validator=PeerFacilitySyncJobValidator,
    permission_classes=[IsAdminForJob],
    track_progress=True,
    cancellable=False,
    queue=facility_task_queue,
    long_running=True,
    status_fn=status_fn,
)
def peerfacilitysync(command, **kwargs):
    """
    Initiate a SYNC (PULL + PUSH) of a specific facility from another device.
    """
    call_command(command, **kwargs)


class PeerFacilityImportJobValidator(PeerFacilitySyncJobValidator):
    facility = HexOnlyUUIDField()
    facility_name = serializers.CharField(default="")
    username = serializers.CharField()
    password = serializers.CharField(default=NOT_SPECIFIED, required=False)

    def validate(self, data):
        job_data = super(PeerFacilityImportJobValidator, self).validate(data)
        job_data["kwargs"].update(
            dict(
                no_push=True,
                no_provision=True,
            )
        )
        return job_data


@register_task(
    validator=PeerFacilityImportJobValidator,
    permission_classes=[IsSuperAdmin() | NotProvisioned()],
    track_progress=True,
    cancellable=False,
    queue=facility_task_queue,
    long_running=True,
    status_fn=status_fn,
)
def peerfacilityimport(command, **kwargs):
    """
    Initiate a PULL of a specific facility from another device.
    """
    call_command(command, **kwargs)


class DeleteFacilityValidator(JobValidator):
    facility = serializers.PrimaryKeyRelatedField(queryset=Facility.objects.all())

    def validate_facility(self, facility):
        if "user" in self.context:
            # Because all users are facility users, this also acts as a check against
            # deleting the only facility on a device, as the only user who could do
            # that must also be a member of that facility.
            user = self.context["user"]
            if user.is_facility_user and user.facility_id == facility.id:
                raise serializers.ValidationError("User is member of facility")
        return facility

    def validate(self, data):
        facility = data["facility"]
        return {
            "args": (facility.id,),
            "facility_id": facility.id,
            "extra_metadata": dict(
                facility=facility.id,
                facility_name=facility.name,
            ),
        }


soud_sync_queue = "soud_sync"


@register_task(
    job_id=SOUD_SYNC_PROCESSING_JOB_ID,
    queue=soud_sync_queue,
    priority=Priority.HIGH,
    status_fn=status_fn,
    long_running=True,
)
def soud_sync_processing():
    # run processing
    soud.execute_syncs()
    # schedule next run
    next_run = soud.get_time_to_next_attempt()
    if next_run is not None:
        job = get_current_job()
        job.retry_in(next_run)
    else:
        logger.info("Skipping enqueue of SoUD sync processing: no attempts remaining")


def enqueue_soud_sync_processing():
    """
    Enqueue a task to process SoUD syncs, if necessary
    """
    next_run = soud.get_time_to_next_attempt()
    if next_run is None:
        # No need to enqueue, as there is no next run
        logger.info("Skipping enqueue of SoUD sync processing: no eligible syncs")
        return

    # Check if there is already an enqueued job
    try:
        converted_next_run = naive_utc_datetime(timezone.now() + next_run)
        orm_job = job_storage.get_orm_job(SOUD_SYNC_PROCESSING_JOB_ID)
        if (
            orm_job.state not in (State.COMPLETED, State.FAILED, State.CANCELED)
            and orm_job.scheduled_time <= converted_next_run
        ):
            # Already queued sooner or at the same time as the next run
            logger.info("Skipping enqueue of SoUD sync processing: scheduled sooner")
            return
    except JobNotFound:
        pass

    logger.info("Enqueuing SoUD sync processing in {}".format(next_run))
    try:
        soud_sync_processing.enqueue_in(next_run)
    except JobRunning:
        logger.info("Skipping enqueue of SoUD sync processing: already running")


@register_task(
    queue=soud_sync_queue,
)
def soud_sync_cleanup(**filters):
    """
    Targeted cleanup of active SoUD sessions

    :param filters: A dict of queryset filters for SyncSession model
    """
    logger.debug("Running SoUD sync cleanup | {}".format(filters))
    sync_sessions = find_soud_sync_sessions(**filters)
    clean_up_ids = sync_sessions.values_list("id", flat=True)

    if clean_up_ids:
        call_command("cleanupsyncs", ids=clean_up_ids, expiration=0)


def queue_soud_sync_cleanup(*sync_session_ids):
    """
    Queue targeted cleanup of active SoUD sessions

    :param sync_session_ids: ID's of sync sessions we should cleanup
    """
    logger.info(
        "Enqueueing cleanup of sync sessions: {}".format(", ".join(sync_session_ids))
    )
    return soud_sync_cleanup.enqueue(kwargs=dict(pk__in=sync_session_ids))


def queue_soud_server_sync_cleanup(client_instance_id):
    """
    A server oriented cleanup of active SoUD sessions

    :param client_instance_id: The Kolibri instance ID of the client
    """
    return soud_sync_cleanup.enqueue(
        kwargs=dict(client_instance_id=client_instance_id, is_server=True)
    )


class PeerImportSingleSyncJobValidator(PeerSyncJobValidator):
    username = serializers.CharField()
    password = serializers.CharField(default=NOT_SPECIFIED, required=False)
    user_id = HexOnlyUUIDField(required=False)
    facility = HexOnlyUUIDField()
    using_admin = serializers.BooleanField(default=False, required=False)
    force_non_learner_import = serializers.BooleanField(default=False, required=False)

    def validate(self, data):
        """
        In case an admin account credentials are provided, to sync a non-admin user,
        the user_id of this non-admin user must be provided.
        """
        job_data = super(PeerImportSingleSyncJobValidator, self).validate(data)
        user_id = data.get("user_id", None)
        using_admin = data.get("using_admin", False)
        force_non_learner_import = data.get("force_non_learner_import", False)
        # Use pre-validated base URL
        baseurl = job_data["kwargs"]["baseurl"]
        facility_id = data["facility"]
        username = data["username"]
        password = data["password"]
        try:
            facility_info = get_remote_users_info(
                baseurl, facility_id, username, password
            )
        except AuthenticationFailed as e:
            raise ValidationError(detail=str(e.detail), code=e.detail.code)
        user_info = facility_info["user"]

        # syncing using an admin account (username & password belong to the admin):
        if using_admin:
            user_info = next(
                user for user in facility_info["users"] if user["id"] == user_id
            )

        full_name = user_info["full_name"]
        roles = user_info["roles"]

        # only learners can be synced unless user has confirmed intention to sync a non-learner:
        if not force_non_learner_import:
            not_syncable = (SUPERUSER, COACH, ASSIGNABLE_COACH, ADMIN)
            if any(role in roles for role in not_syncable):
                raise ValidationError(
                    detail={
                        "id": DEVICE_LIMITATIONS,
                        "full_name": full_name,
                        "roles": ", ".join(roles),
                    }
                )

        user_id = user_info["id"]

        validate_and_create_sync_credentials(
            baseurl, facility_id, username, password, user_id=user_id
        )
        job_data["extra_metadata"]["user_id"] = user_id
        job_data["extra_metadata"]["username"] = user_info["username"]

        job_data["kwargs"]["user"] = user_id

        job_data["kwargs"].update(
            dict(
                no_push=True,
                no_provision=True,
            )
        )
        return job_data


@register_task(
    validator=PeerImportSingleSyncJobValidator,
    cancellable=False,
    track_progress=True,
    queue=soud_sync_queue,
    permission_classes=[IsSuperAdmin() | NotProvisioned()],
    status_fn=status_fn,
    long_running=True,
)
def peeruserimport(command, **kwargs):
    call_command(command, **kwargs)


@register_task(
    validator=DeleteFacilityValidator,
    permission_classes=[IsSuperAdmin],
    track_progress=True,
    cancellable=False,
    queue=facility_task_queue,
)
def deletefacility(facility):
    """
    Initiate a task to delete a facility
    """
    call_command(
        "deletefacility",
        facility=facility,
        noninteractive=True,
    )


class CleanUpSyncsValidator(JobValidator):
    pull = serializers.BooleanField(required=False)
    push = serializers.BooleanField(required=False)
    sync_filter = serializers.CharField(required=True)
    client_instance_id = HexOnlyUUIDField(required=False)
    server_instance_id = HexOnlyUUIDField(required=False)

    def validate(self, data):
        if data.get("pull") is None and data.get("push") is None:
            raise serializers.ValidationError("Either pull or push must be specified")
        elif data.get("pull") is data.get("push"):
            raise serializers.ValidationError(
                "Only one of pull or push needs to be specified"
            )

        if (
            data.get("client_instance_id") is None
            and data.get("server_instance_id") is None
        ):
            raise serializers.ValidationError(
                "Either client_instance_id or server_instance_id must be specified"
            )
        elif (
            data.get("client_instance_id") is not None
            and data.get("server_instance_id") is not None
        ):
            raise serializers.ValidationError(
                "Only one of client_instance_id or server_instance_id can be specified"
            )

        return {
            "kwargs": data,
        }


@register_task(
    validator=CleanUpSyncsValidator,
    track_progress=False,
    cancellable=False,
    long_running=True,
    status_fn=status_fn,
)
def cleanupsync(**kwargs):
    # ensure arguments are valid, even outside of task API
    validator = CleanUpSyncsValidator(data=dict(type=cleanupsync.__name__, **kwargs))
    validator.is_valid(raise_exception=True)

    sync_filter = kwargs.pop("sync_filter")
    call_command("cleanupsyncs", sync_filter=str(sync_filter), expiration=1, **kwargs)
