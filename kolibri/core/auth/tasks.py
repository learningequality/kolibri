import datetime
import hashlib
import logging
import random

import requests
from django.conf import settings
from django.core.management import call_command
from django.core.urlresolvers import reverse
from django.forms import FilePathField
from django.utils import timezone
from morango.errors import MorangoResumeSyncError
from morango.models import InstanceIDModel
from requests.exceptions import ConnectionError
from rest_framework import serializers
from rest_framework import status
from rest_framework.exceptions import ValidationError
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.constants.morango_sync import State as FacilitySyncState
from kolibri.core.auth.constants.user_kinds import ADMIN
from kolibri.core.auth.constants.user_kinds import ASSIGNABLE_COACH
from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.auth.constants.user_kinds import SUPERUSER
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.utils.sync import find_soud_sync_session_for_resume
from kolibri.core.auth.utils.sync import find_soud_sync_sessions
from kolibri.core.auth.utils.sync import validate_and_create_sync_credentials
from kolibri.core.auth.utils.users import get_remote_users_info
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.device.translation import get_device_language
from kolibri.core.device.translation import get_settings_language
from kolibri.core.device.utils import get_device_info
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.core.error_constants import DEVICE_LIMITATIONS
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import SYNC
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.permissions import IsAdminForJob
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.permissions import NotProvisioned
from kolibri.core.tasks.validation import JobValidator
from kolibri.utils.conf import OPTIONS


logger = logging.getLogger(__name__)


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

    @property
    def choices(self):
        if not self._choices_set:
            self._choices_set = True
            # Use the internal Choice field _set_choices setter method here
            self._set_choices(settings.LANGUAGES)
        return self._choices

    @choices.setter
    def choices(self, value):
        # Make this a no op, as we are only setting his in the getter above.
        pass


class TempUploadPathField(serializers.ChoiceField):
    def __init__(
        self,
        match=None,
        recursive=False,
        allow_files=True,
        allow_folders=False,
        required=None,
        **kwargs
    ):
        self.match = match
        self.recursive = recursive
        self.allow_files = allow_files
        self.allow_folders = allow_folders
        self.required = required
        super(TempUploadPathField, self).__init__([], **kwargs)

    @property
    def choices(self):
        if not hasattr(self, "_choices"):
            field = FilePathField(
                settings.FILE_UPLOAD_TEMP_DIR,
                match=self.match,
                recursive=self.recursive,
                allow_files=self.allow_files,
                allow_folders=self.allow_folders,
                required=self.required,
            )
            self._choices = field.choices
        return self._choices

    @choices.setter
    def choices(self, value):
        pass


class ImportUsersFromCSVValidator(JobValidator):
    csvfile = serializers.FileField(required=False, use_url=False)
    csvfilename = serializers.CharField(required=False)
    dryrun = serializers.BooleanField(default=False)
    delete = serializers.BooleanField(default=False)
    locale = LocaleChoiceField()
    facility_id = serializers.PrimaryKeyRelatedField(
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
        filepath = data.get("csvfile") or data.get("csvfilename")
        args = [filepath]
        if data.get("dryrun"):
            args.append("--dryrun")
        if data.get("delete"):
            args.append("--delete")
        kwargs = {"locale": data.get("locale"), "facility": data.get("facility_id")}
        if "user" in self.context:
            kwargs["userid"] = self.context["user"].id
        return {
            "args": args,
            "kwargs": kwargs,
            "facility_id": data.get("facility_id"),
        }


@register_task(
    validator=ImportUsersFromCSVValidator,
    track_progress=True,
    permission_classes=[IsAdminForJob],
)
def importusersfromcsv(job_args=None, facility=None, userid=None, locale=None):
    """
    Import users, classes, roles and roles assignemnts from a csv file.
    :param: FILE: file dictionary with the file object
    :param: csvfile: filename of the file stored in kolibri temp folder
    :param: dryrun: validate the data but don't modify the database
    :param: delete: Users not in the csv will be deleted from the facility, and classes cleared
    :returns: An object with the job information
    """

    call_command(
        "bulkimportusers", *job_args, facility=facility, userid=userid, locale=locale
    )


class ExportUsersToCSVValidator(JobValidator):
    locale = LocaleChoiceField()
    facility_id = serializers.PrimaryKeyRelatedField(
        queryset=Facility.objects.all(), allow_null=True, default=None
    )

    def validate(self, data):
        facility = data.get("facility_id")
        if not facility and "user" in self.context:
            facility = self.context["user"].facility_id
        else:
            raise serializers.ValidationError("Facility must be specified")
        return {
            "kwargs": {"locale": data.get("locale"), "facility": facility},
            "facility_id": facility,
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
            facility_name = ""
        return {
            "extra_metadata": dict(
                facility_id=facility_id,
                facility_name=facility_name,
                sync_state=FacilitySyncState.PENDING,
                bytes_sent=0,
                bytes_received=0,
            ),
            "facility_id": facility_id,
            "kwargs": dict(
                chunk_size=200,
                noninteractive=True,
                facility=facility_id,
                sync_session_id=data.get("sync_session_id"),
            ),
            "args": [data["command"]],
        }


@register_task(
    validator=SyncJobValidator,
    permission_classes=[IsAdminForJob],
    track_progress=True,
    cancellable=False,
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
            address = data["baseurl"]
            baseurl = NetworkClient(address=address).base_url
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
    username = serializers.CharField()
    password = serializers.CharField(default=NOT_SPECIFIED, required=False)

    def validate(self, data):
        job_data = super(PeerFacilitySyncJobValidator, self).validate(data)
        validate_and_create_sync_credentials(
            job_data["kwargs"]["baseurl"],
            job_data["facility_id"],
            data["username"],
            data["password"],
        )
        return job_data


@register_task(
    validator=PeerFacilitySyncJobValidator,
    permission_classes=[IsAdminForJob],
    track_progress=True,
    cancellable=False,
)
def peerfacilitysync(command, **kwargs):
    """
    Initiate a SYNC (PULL + PUSH) of a specific facility from another device.
    """
    call_command(command, **kwargs)


class PeerFacilityImportJobValidator(PeerFacilitySyncJobValidator):
    facility = HexOnlyUUIDField()

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


class PeerRepeatingSingleSyncJobValidator(PeerSyncJobValidator):
    resync_interval = serializers.IntegerField(default=None, allow_null=True)
    user_id = HexOnlyUUIDField()

    def validate(self, data):
        job_data = super(PeerRepeatingSingleSyncJobValidator, self).validate(data)
        job_data["job_id"] = hashlib.md5(
            "{}::{}".format(job_data["kwargs"]["baseurl"], data["user_id"]).encode()
        ).hexdigest()
        job_data["kwargs"]["resync_interval"] = (
            data["resync_interval"] or OPTIONS["Deployment"]["SYNC_INTERVAL"]
        )
        return job_data


@register_task(
    validator=PeerRepeatingSingleSyncJobValidator,
)
def peerusersync(command, **kwargs):
    cleanup = False
    resync_interval = kwargs["resync_interval"]
    kwargs["keep_alive"] = True
    try:
        call_command(command, **kwargs)
    except Exception as e:
        cleanup = True
        if isinstance(e, MorangoResumeSyncError):
            # override to reschedule a sync sooner in this case
            resync_interval = 5
            logger.warning(
                "Failed to resume sync session for user {} to server {}; queuing its cleanup".format(
                    kwargs["user"], kwargs["baseurl"]
                )
            )
        else:
            logger.error(
                "Error syncing user {} to server {}".format(
                    kwargs["user"], kwargs["baseurl"]
                )
            )
            raise
    finally:
        # cleanup session on error if we tried to resume it
        if cleanup and command == "resumesync":
            # for resume we should have id kwarg
            queue_soud_sync_cleanup(kwargs["id"])
        if resync_interval:
            # schedule a new sync
            schedule_new_sync(
                kwargs["baseurl"], kwargs["user"], interval=resync_interval
            )


def startpeerusersync(
    server, user_id, resync_interval=OPTIONS["Deployment"]["SYNC_INTERVAL"]
):
    """
    Initiate a SYNC (PULL + PUSH) of a specific user from another device.
    """

    user = FacilityUser.objects.get(pk=user_id)
    facility_id = user.facility.id

    # attempt to resume an existing session
    sync_session = find_soud_sync_session_for_resume(user, server)

    job = peerusersync.validate_job_data(
        user,
        {
            "baseurl": server,
            "user_id": user_id,
            "resync_interval": resync_interval,
            "facility": facility_id,
            "sync_session_id": sync_session.id if sync_session else None,
            "command": "resumesync" if sync_session else "sync",
        },
    )

    job_id = peerusersync.enqueue(job=job)
    return job_id


def stoppeerusersync(server, user_id):
    """
    Close the sync session with a server
    """
    logger.debug(
        "Stopping SoUD syncs for user {} against server {}".format(user_id, server)
    )

    user = FacilityUser.objects.get(pk=user_id)
    sync_session = find_soud_sync_session_for_resume(user, server)

    # clear jobs with matching ID
    job_id = hashlib.md5("{}::{}".format(server, user_id).encode()).hexdigest()
    job_storage.clear(job_id=job_id)
    job_storage.cancel(job_id)

    # skip if we couldn't find one for resume
    if sync_session is None:
        return

    logger.debug("Enqueuing cleanup of SoUD sync session {}".format(sync_session.id))
    return queue_soud_sync_cleanup(sync_session.id)


def begin_request_soud_sync(server, user):
    """
    Enqueue a task to request this SoUD to be
    synced with a server
    """
    info = get_device_info()
    if not info["subset_of_users_device"]:
        # this does not make sense unless this is a SoUD
        logger.warning("Only Subsets of Users Devices can do automated SoUD syncing.")
        return
    users = UserSyncStatus.objects.filter(user_id=user).values(
        "queued", "sync_session__last_activity_timestamp"
    )
    if users:
        SYNC_INTERVAL = OPTIONS["Deployment"]["SYNC_INTERVAL"]
        dt = datetime.timedelta(seconds=SYNC_INTERVAL)
        if timezone.now() - users[0]["sync_session__last_activity_timestamp"] < dt:
            schedule_new_sync(server, user)
            return

        if users[0]["queued"]:
            all_jobs = job_storage.get_all_jobs()
            failed_jobs = [
                j
                for j in all_jobs
                if j.state == State.FAILED
                and j.extra_metadata.get("started_by", None) == user
                and j.extra_metadata.get("type", None) == "SYNCPEER/SINGLE"
            ]
            queued_jobs = [
                j
                for j in all_jobs
                if j.state == State.QUEUED
                and j.extra_metadata.get("started_by", None) == user
                and j.extra_metadata.get("type", None) == "SYNCPEER/SINGLE"
            ]
            if failed_jobs:
                for j in failed_jobs:
                    job_storage.clear(job_id=j.job_id)
                # if previous sync jobs have failed, unblock UserSyncStatus to try again:
                UserSyncStatus.objects.update_or_create(
                    user_id=user, defaults={"queued": False}
                )
            elif queued_jobs:
                return  # If there are pending and not failed jobs, don't enqueue a new one

    logger.info(
        "Queuing SoUD syncing request against server {} for user {}".format(
            server, user
        )
    )
    request_soud_sync.enqueue(args=(server, user))


def stop_request_soud_sync(server, user):
    """
    Cleanup steps to stop SoUD syncing
    """
    info = get_device_info()
    if not info["subset_of_users_device"]:
        # this does not make sense unless this is a SoUD
        logger.warning("Only Subsets of Users Devices can do this")
        return

    # close active sync session
    stoppeerusersync(server, user)


@register_task
def request_soud_sync(server, user, queue_id=None, ttl=4):
    """
    Make a request to the serverurl endpoint to sync this SoUD (Subset of Users Device)
        - If the server says "sync now" immediately queue a sync task for the server
        - If the server responds with an identifier and interval, schedule itself to run
        again in the future with that identifier as an argument, at the interval specified
    """

    if queue_id is None:
        endpoint = reverse("kolibri:core:syncqueue-list")
    else:
        endpoint = reverse("kolibri:core:syncqueue-detail", kwargs={"pk": queue_id})

    server_url = urljoin(server, endpoint)

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]

    logger.debug("Requesting SoUD sync for user {} and server {}".format(user, server))
    try:
        data = {"user": user, "instance": instance_model.id}
        if queue_id is None:
            # Set connection timeout to slightly larger than a multiple of 3, as per:
            # https://docs.python-requests.org/en/master/user/advanced/#timeouts
            # Use a relatively short connection timeout so that we don't block
            # waiting for servers that have dropped off the network.
            response = requests.post(server_url, json=data, timeout=(6.05, 30))
        else:
            # Use a blanket 30 second timeout for PUT requests, as we have already
            # got a place in the queue to sync with this server, so we can be
            # more sure that the server is actually available.
            response = requests.put(server_url, json=data, timeout=30)
        if response.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
            raise ConnectionError()
    except ConnectionError:
        # Algorithm to try several times if the server is not responding
        # Randomly it can be trying it up to 1560 seconds (26 minutes)
        # before desisting
        ttl -= 1
        if ttl == 0:
            logger.error(
                "Give up trying to connect to the server {} for user {}".format(
                    server, user
                )
            )
            return
        interval = random.randint(1, 30 * (10 - ttl))
        dt = datetime.timedelta(seconds=interval)
        request_soud_sync.enqueue_in(dt, args=(server, user, queue_id, ttl))
        if queue_id:
            logger.warning(
                "Connection error connecting to server {} for user {}, for queue id {}. Trying to connect in {} seconds".format(
                    server, user, queue_id, interval
                )
            )
        else:
            logger.warning(
                "Connection error connecting to server {} for user {}. Trying to connect in {} seconds".format(
                    server, user, interval
                )
            )
        return

    if response.status_code == status.HTTP_404_NOT_FOUND:
        logger.debug(
            "User {} was not found requesting SoUD sync from server {}".format(
                user, server
            )
        )
        return  # Request done to a server not owning this user's data

    if response.status_code == status.HTTP_200_OK:
        handle_server_sync_response(response, server, user)
    else:
        logger.warning(
            "{} response for user {} SoUD sync request to server {} | {}".format(
                response.status_code, user, server, response.content
            )
        )


def handle_server_sync_response(response, server, user):
    # In either case, we set the sync status for this user as queued
    # Once the sync starts, then this should get cleared and the SyncSession
    # set on the status, so that more info can be garnered.
    JOB_ID = hashlib.md5("{}::{}".format(server, user).encode()).hexdigest()
    server_response = response.json()

    UserSyncStatus.objects.update_or_create(user_id=user, defaults={"queued": True})

    if server_response["action"] == SYNC:
        server_sync_interval = server_response.get(
            "sync_interval", str(OPTIONS["Deployment"]["SYNC_INTERVAL"])
        )
        job_id = startpeerusersync(server, user, server_sync_interval)
        logger.info(
            "Enqueuing a sync task for user {} with server {} in job {}".format(
                user, server, job_id
            )
        )

    elif server_response["action"] == QUEUED:
        pk = server_response["id"]
        time_alive = server_response["keep_alive"]
        dt = datetime.timedelta(seconds=int(time_alive))
        request_soud_sync.enqueue_in(
            dt, args=(server, user, pk, time_alive), kwargs=dict(job_id=JOB_ID)
        )
        logger.info(
            "Server {} busy for user {}, will try again in {} seconds with pk={}".format(
                server, user, time_alive, pk
            )
        )


def schedule_new_sync(server, user, interval=OPTIONS["Deployment"]["SYNC_INTERVAL"]):
    # reschedule the process for a new sync
    logging.info(
        "Requeueing to sync with server {} for user {} in {} seconds".format(
            server, user, interval
        )
    )
    dt = datetime.timedelta(seconds=interval)
    JOB_ID = hashlib.md5("{}:{}".format(server, user).encode()).hexdigest()
    request_soud_sync.enqueue_in(dt, args=(server, user), kwargs=dict(job_id=JOB_ID))


@register_task
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
    return soud_sync_cleanup.enqueue(kwargs=dict(pk__in=sync_session_ids))


def queue_soud_server_sync_cleanup(client_ip):
    """
    A server oriented cleanup of active SoUD sessions

    :param client_ip: The IP address of the client
    """
    return soud_sync_cleanup.enqueue(kwargs=dict(client_ip=client_ip, is_server=True))


class PeerImportSingleSyncJobValidator(PeerSyncJobValidator):
    username = serializers.CharField()
    password = serializers.CharField(default=NOT_SPECIFIED, required=False)
    user_id = HexOnlyUUIDField(required=False)
    facility = HexOnlyUUIDField()

    def validate(self, data):
        job_data = super(PeerImportSingleSyncJobValidator, self).validate(data)
        user_id = data.get("user_id", None)
        # Use pre-validated base URL
        baseurl = job_data["kwargs"]["baseurl"]
        facility_id = data["facility"]
        username = data["username"]
        password = data["password"]
        facility_info = get_remote_users_info(baseurl, facility_id, username, password)
        user_info = facility_info["user"]
        full_name = user_info["full_name"]
        roles = user_info["roles"]

        # syncing as a normal user, not using an admin account:
        if user_id is None:
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
        job_data["kwargs"]["user"] = user_id

        return job_data


@register_task(
    validator=PeerImportSingleSyncJobValidator,
    cancellable=True,
    track_progress=True,
    queue="soud",
    permission_classes=[IsSuperAdmin() | NotProvisioned()],
)
def peeruserimport(**kwargs):
    call_command("sync", **kwargs)


@register_task(
    validator=DeleteFacilityValidator,
    permission_classes=[IsSuperAdmin],
    track_progress=True,
    cancellable=False,
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
