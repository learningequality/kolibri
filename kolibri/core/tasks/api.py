import logging
from functools import partial

import requests
from django.apps.registry import AppRegistryNotReady
from django.core.management import call_command
from django.core.management.base import CommandError
from django.http.response import Http404
from django.utils.translation import gettext_lazy as _
from morango.models import ScopeDefinition
from morango.sync.controller import MorangoProfileController
from requests.exceptions import HTTPError
from rest_framework import decorators
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.authentication import BasicAuthentication
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import APIException
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ParseError
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from six import string_types

from .permissions import FacilitySyncPermissions
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import State as FacilitySyncState
from kolibri.core.auth.management.utils import get_client_and_server_certs
from kolibri.core.auth.management.utils import get_facility_dataset_id
from kolibri.core.auth.models import Facility
from kolibri.core.content.permissions import CanExportLogs
from kolibri.core.content.permissions import CanImportUsers
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.content.utils.upgrade import diff_stats
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.permissions import NotProvisionedCanPost
from kolibri.core.device.permissions import NotProvisionedHasPermission
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import URLParseError
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import facility_queue
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.main import priority_queue
from kolibri.core.tasks.main import queue
from kolibri.utils import conf

try:
    from django.apps import apps

    apps.check_apps_ready()
except AppRegistryNotReady:
    import django

    django.setup()

logger = logging.getLogger(__name__)


NETWORK_ERROR_STRING = _("There was a network error.")

DISK_IO_ERROR_STRING = _("There was a disk access error.")

CATCHALL_SERVER_ERROR_STRING = _("There was an unknown error.")


class BaseViewSet(viewsets.ViewSet):
    queues = []
    permission_classes = []

    # Adding auth classes explicitly until we find a fix for BasicAuth not
    # working on tasks API (in dev settings).
    authentication_classes = [SessionAuthentication, BasicAuthentication]

    def initial(self, request, *args, **kwargs):
        if len(self.permission_classes) == 0:
            self.permission_classes = self.default_permission_classes()
        if self.permission_classes is None:
            self.permission_classes = []
        return super(BaseViewSet, self).initial(request, *args, **kwargs)

    def check_registered_job_permissions(self, request, registered_job, job=None):
        """
        Checks whether the `request` is allowed to proceed.

        If the user is not a superuser we check whether the job's `facility_id` matches
        that of the user. If it doesn't match we raise `PermissionDenied`.

        Other raises `PermissionDenied` if `request.user` is not allowed to proceed based
        on registered_job's permissions.
        """
        job_facility_id = None
        if job:
            job_facility_id = getattr(job, "job_facility_id", None)

        try:
            if not request.user.is_superuser and request.user.is_facility_user:
                if job_facility_id and job_facility_id != request.user.facility_id:
                    raise PermissionDenied
        except AttributeError:
            pass

        for permission in registered_job.permissions:
            if not permission.has_permission(request, self):
                raise PermissionDenied

    def validate_create_req_data(self, request):
        """
        Validates the request data received on POST /api/tasks/tasks/.

        If `task` parameter is absent or not a string type then `ValidationError` is raised.

        If `request.user` is authorized to initiate the `task` function, this returns
        a list of `request.data` otherwise raises `PermissionDenied`.
        """
        if isinstance(request.data, list):
            request_data_list = request.data
        else:
            request_data_list = [request.data]

        for request_data in request_data_list:
            if "task" not in request_data:
                raise serializers.ValidationError("The 'task' field is required.")
            if not isinstance(request_data["task"], string_types):
                raise serializers.ValidationError("The 'task' value must be a string.")

            funcstr = request_data.get("task")

            # Make sure the task is registered
            try:
                registered_job = JobRegistry.REGISTERED_JOBS[funcstr]
            except KeyError:
                raise serializers.ValidationError(
                    "'{funcstr}' is not registered.".format(funcstr=funcstr)
                )

            # Check permissions
            self.check_registered_job_permissions(request, registered_job)

        return request_data_list

    def list(self, request):
        """
        Returns a list of jobs that `request.user` has permissions for.

        Accepts a query parameter named `queue` that filters jobs by `queue`.
        """
        queue = request.query_params.get("queue", None)

        all_jobs = job_storage.get_all_jobs(queue=queue)

        jobs_response = []
        for job in all_jobs:
            try:
                registered_job = JobRegistry.REGISTERED_JOBS[job.func]
                self.check_registered_job_permissions(request, registered_job, job)
                jobs_response.append(_job_to_response(job))
            except KeyError:
                # Note: Temporarily including unregistered tasks until we complete
                # our transition to to the new tasks API.
                # After completing transition to the new tasks API, we won't be
                # including unregistered tasks to the response list.
                jobs_response.append(_job_to_response(job))
            except PermissionDenied:
                # `request.user` do not have permission for this job hence
                # we we will NOT append this job to the list.
                pass

        return Response(jobs_response)

    def create(self, request):
        """
        Enqueues a registered task for async processing.

        If the registered task has a validator then that validator is run with the
        `request` object and the corresponding `request.data` as its arguments. The dict
        returned by the validator is passed as keyword arguments to the task function.

        If the registered task has no validator then `request.data` is passed as keyword
        arguments to the task function.

        API endpoint:
            POST /api/tasks/tasks/

        Request payload parameters:
            - `task` (required): a string representing the dotted path to task function.
            - Other key value pairs.

        Keep in mind:
            In the validator's returning dict we can add `extra_metadata` as a key value pair
            to set `extra_metadata` for the task.

            `extra_metadata` value must be of dict type.

            The `extra_metadata` dict is not passed to the `task` function.
        """
        request_data_list = self.validate_create_req_data(request)

        enqueued_jobs_response = []

        # Once we have validated all the tasks, we are good to go!
        for request_data in request_data_list:

            funcstr = request_data.pop("task")
            registered_job = JobRegistry.REGISTERED_JOBS[funcstr]

            # Run validator with `request` and `request_data` as its argument.
            if registered_job.validator is not None:
                try:
                    validator_result = registered_job.validator(request, request_data)
                except Exception as e:
                    raise e

                if not isinstance(validator_result, dict):
                    raise serializers.ValidationError("Validator must return a dict.")

                extra_metadata = validator_result.get("extra_metadata")
                if extra_metadata is not None and not isinstance(extra_metadata, dict):
                    raise serializers.ValidationError(
                        "In the dict returned by validator, 'extra_metadata' must be a dict."
                    )

                request_data = validator_result

            try:
                user_facility_id = request.user.facility_id
            except AttributeError:
                user_facility_id = None

            job_id = registered_job.enqueue(
                job_facility_id=user_facility_id, **request_data
            )
            enqueued_jobs_response.append(_job_to_response(job_storage.get_job(job_id)))

        if len(enqueued_jobs_response) == 1:
            enqueued_jobs_response = enqueued_jobs_response[0]

        return Response(enqueued_jobs_response)

    def retrieve(self, request, pk=None):
        """
        Retrieve a task by id only if `request.user` has permissions for it otherwise
        raises `PermissionDenied`.
        """
        try:
            job = job_storage.get_job(job_id=pk)
            registered_job = JobRegistry.REGISTERED_JOBS[job.func]
            self.check_registered_job_permissions(request, registered_job, job)
        except JobNotFound:
            raise Http404("Task with {pk} not found".format(pk=pk))
        except KeyError:
            # Note: Temporarily allowing unregistered tasks until we complete our transition to
            # to the new tasks API.
            # After completing our transition this should raise a ValidationError saying
            # the task is not registered.
            pass

        job_response = _job_to_response(job)
        return Response(job_response)

    @decorators.action(methods=["post"], detail=False)
    def restarttask(self, request):
        """
        Restarts a task with its task id given in the `task_id` parameter.
        """

        if "task_id" not in request.data:
            raise serializers.ValidationError("The 'task_id' field is required.")
        if not isinstance(request.data["task_id"], string_types):
            raise serializers.ValidationError("The 'task_id' should be a string.")

        job_to_restart_id = request.data.get("task_id")

        try:
            job_to_restart = job_storage.get_job(job_id=job_to_restart_id)
        except JobNotFound:
            raise Http404("Task with {pk} not found.".format(pk=job_to_restart_id))

        try:
            registered_job = JobRegistry.REGISTERED_JOBS[job_to_restart.func]
            self.check_registered_job_permissions(
                request, registered_job, job_to_restart
            )
        except KeyError:
            raise serializers.ValidationError(
                "'{funcstr}' is not registered.".format(funcstr=job_to_restart.func)
            )

        try:
            restarted_job_id = job_storage.restart_job(job_id=job_to_restart.job_id)
        except JobNotRestartable:
            raise serializers.ValidationError(
                "Cannot restart job with state={}".format(job_to_restart.state)
            )

        job_response = _job_to_response(job_storage.get_job(job_id=restarted_job_id))
        return Response(job_response)

    def destroy(self, request, pk=None):
        # unimplemented for now.
        pass

    @decorators.action(methods=["post"], detail=False)
    def canceltask(self, request):
        """
        Cancel a task with its task id given in the task_id parameter.
        """

        if "task_id" not in request.data:
            raise serializers.ValidationError("The 'task_id' field is required.")
        if not isinstance(request.data["task_id"], string_types):
            raise serializers.ValidationError("The 'task_id' should be a string.")

        for _queue in self.queues:
            try:
                _queue.cancel(request.data["task_id"])
                break
            except JobNotFound:
                continue

        return Response({})

    @decorators.action(methods=["post"], detail=False)
    def cleartasks(self, request):
        """
        Cancels all running tasks.
        """

        for _queue in self.queues:
            _queue.empty()

        return Response({})

    @decorators.action(methods=["post"], detail=False)
    def cleartask(self, request):
        # Given a single task ID, clear it from the queue
        task_id = request.data.get("task_id")
        if not task_id:
            return Response({})

        for _queue in self.queues:
            _queue.clear_job(task_id)

        return Response({"task_id": task_id})

    @decorators.action(methods=["post"], detail=False)
    def deletefinishedtasks(self, request):
        """
        Delete all tasks that have succeeded, failed, or been cancelled.
        """
        task_id = request.data.get("task_id")
        if task_id:
            for _queue in self.queues:
                _queue.clear_job(task_id)
        else:
            for _queue in self.queues:
                _queue.clear()
        return Response({})


class TasksViewSet(BaseViewSet):
    @property
    def queues(self):
        return [queue, priority_queue]

    def default_permission_classes(self):
        # Permission for /api/tasks/tasks/ endpoints.
        if self.action in ["list", "retrieve", "create", "restarttask"]:
            return [IsAuthenticated | NotProvisionedHasPermission]
        elif self.action in ["deletefinishedtasks"]:
            return [CanManageContent | CanExportLogs]
        elif self.action == "startexportlogcsv":
            return [CanExportLogs]
        elif self.action in ["importusersfromcsv", "exportuserstocsv"]:
            return [CanImportUsers]

        # For all other task endpoints.
        return [CanManageContent]

    @decorators.action(methods=["post"], detail=False)
    def startremotebulkimport(self, request):
        if not isinstance(request.data, list):
            raise serializers.ValidationError(
                "POST data must be a list of task descriptions"
            )

        tasks = map(partial(validate_remote_import_task, request), request.data)

        job_ids = []

        for task in tasks:
            task.update({"type": "REMOTEIMPORT", "database_ready": False})
            import_job_id = queue.enqueue(
                _remoteimport,
                task["channel_id"],
                task["baseurl"],
                peer_id=task["peer_id"],
                extra_metadata=task,
                cancellable=True,
                track_progress=True,
            )
            job_ids.append(import_job_id)

        resp = [_job_to_response(queue.fetch_job(job_id)) for job_id in job_ids]

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startdiskbulkimport(self, request):
        if not isinstance(request.data, list):
            raise serializers.ValidationError(
                "POST data must be a list of task descriptions"
            )

        tasks = map(partial(validate_local_import_task, request), request.data)

        job_ids = []

        for task in tasks:
            task.update({"type": "DISKIMPORT", "database_ready": False})
            import_job_id = queue.enqueue(
                _diskimport,
                task["channel_id"],
                task["datafolder"],
                drive_id=task["drive_id"],
                extra_metadata=task,
                track_progress=True,
                cancellable=True,
            )
            job_ids.append(import_job_id)

        resp = [_job_to_response(queue.fetch_job(job_id)) for job_id in job_ids]

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startdiskchannelimport(self, request):
        task = validate_local_import_task(request, request.data)

        task.update({"type": "DISKCHANNELIMPORT"})

        job_id = priority_queue.enqueue(
            call_command,
            "importchannel",
            "disk",
            task["channel_id"],
            task["datafolder"],
            drive_id=task["drive_id"],
            extra_metadata=task,
            cancellable=True,
        )

        resp = _job_to_response(priority_queue.fetch_job(job_id))
        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startdiskcontentimport(self, request):
        task = validate_local_import_task(request, request.data)

        task.update({"type": "DISKCONTENTIMPORT"})

        job_id = queue.enqueue(
            call_command,
            "importcontent",
            "disk",
            task["channel_id"],
            task["datafolder"],
            drive_id=task["drive_id"],
            node_ids=task["node_ids"],
            exclude_node_ids=task["exclude_node_ids"],
            extra_metadata=task,
            track_progress=True,
            cancellable=True,
        )

        resp = _job_to_response(queue.fetch_job(job_id))

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startbulkdelete(self, request):
        if not isinstance(request.data, list):
            raise serializers.ValidationError(
                "POST data must be a list of task descriptions"
            )

        tasks = map(partial(validate_deletion_task, request), request.data)

        job_ids = []

        for task in tasks:
            task.update({"type": "DELETECHANNEL"})
            if task["node_ids"] or task["exclude_node_ids"]:
                task["file_size"] = None
                task["total_resources"] = None
            delete_job_id = queue.enqueue(
                call_command,
                "deletecontent",
                task["channel_id"],
                track_progress=True,
                extra_metadata=task,
            )
            job_ids.append(delete_job_id)

        resp = [_job_to_response(queue.fetch_job(job_id)) for job_id in job_ids]

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startdeletechannel(self, request):
        """
        Delete a channel and all its associated content from the server
        """
        task = validate_deletion_task(request, request.data)

        task.update({"type": "DELETECONTENT"})

        if task["node_ids"] or task["exclude_node_ids"]:
            task["file_size"] = None
            task["total_resources"] = None

        task_id = queue.enqueue(
            call_command,
            "deletecontent",
            task["channel_id"],
            node_ids=task["node_ids"],
            exclude_node_ids=task["exclude_node_ids"],
            force_delete=task["force_delete"],
            track_progress=True,
            extra_metadata=task,
        )

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(queue.fetch_job(task_id))

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startdiskbulkexport(self, request):
        if not isinstance(request.data, list):
            raise serializers.ValidationError(
                "POST data must be a list of task descriptions"
            )

        tasks = map(partial(validate_local_export_task, request), request.data)

        job_ids = []

        for task in tasks:
            task.update({"type": "DISKEXPORT"})
            export_job_id = queue.enqueue(
                _localexport,
                task["channel_id"],
                task["drive_id"],
                track_progress=True,
                cancellable=True,
                extra_metadata=task,
            )
            job_ids.append(export_job_id)

        resp = [_job_to_response(queue.fetch_job(job_id)) for job_id in job_ids]

        return Response(resp)

    @decorators.action(methods=["get"], detail=False)
    def localdrive(self, request):
        drives = get_mounted_drives_with_channel_info()

        # make sure everything is a dict, before converting to JSON
        if not isinstance(drives, dict):
            raise AssertionError
        out = [mountdata._asdict() for mountdata in drives.values()]

        return Response(out)

    @decorators.action(methods=["post"], detail=False)
    def channeldiffstats(self, request):
        job_metadata = {}
        channel_id = request.data.get("channel_id")
        method = request.data.get("method")
        drive_id = request.data.get("drive_id")
        baseurl = request.data.get("baseurl")

        # request validation and job metadata info
        if not channel_id:
            raise serializers.ValidationError("The channel_id field is required.")
        if not method:
            raise serializers.ValidationError("The method field is required.")

        if method == "network":
            baseurl = baseurl or conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
            job_metadata["baseurl"] = baseurl
            # get channel version metadata
            url = get_channel_lookup_url(baseurl=baseurl, identifier=channel_id)
            resp = requests.get(url)
            channel_metadata = resp.json()
            job_metadata["new_channel_version"] = channel_metadata[0]["version"]
        elif method == "disk":
            if not drive_id:
                raise serializers.ValidationError(
                    "The drive_id field is required when using 'disk' method."
                )
            job_metadata = _add_drive_info(job_metadata, request.data)
            # get channel version metadata
            drive = get_mounted_drive_by_id(drive_id)
            channel_metadata = read_channel_metadata_from_db_file(
                get_content_database_file_path(channel_id, drive.datafolder)
            )
            job_metadata["new_channel_version"] = channel_metadata["version"]
        else:
            raise serializers.ValidationError(
                "'method' field should either be 'network' or 'disk'."
            )

        job_metadata.update(
            {
                "type": "CHANNELDIFFSTATS",
                "started_by": request.user.pk,
                "channel_id": channel_id,
            }
        )

        job_id = priority_queue.enqueue(
            diff_stats,
            channel_id,
            method,
            drive_id=drive_id,
            baseurl=baseurl,
            extra_metadata=job_metadata,
            track_progress=False,
            cancellable=True,
        )

        resp = _job_to_response(priority_queue.fetch_job(job_id))

        return Response(resp)


class FacilityTasksViewSet(BaseViewSet):
    @property
    def queues(self):
        return [facility_queue]

    def default_permission_classes(self):
        if self.action in ["list", "retrieve"]:
            return [FacilitySyncPermissions]

    @decorators.action(
        methods=["post"], detail=False, permission_classes=[FacilitySyncPermissions]
    )
    def startdataportalsync(self, request):
        """
        Initiate a PUSH sync with Kolibri Data Portal.
        """
        facility_id = validate_facility(request)
        sync_args = validate_sync_task(request)
        job_data = prepare_sync_job(
            facility=facility_id,
            extra_metadata=prepare_sync_task(*sync_args, type="SYNCDATAPORTAL"),
        )
        job_id = facility_queue.enqueue(call_command, "sync", **job_data)

        resp = _job_to_response(facility_queue.fetch_job(job_id))
        return Response(resp)

    @decorators.action(methods=["post"], detail=False, permission_classes=[IsSuperuser])
    def startdataportalbulksync(self, request):
        """
        Initiate a PUSH sync with Kolibri Data Portal for ALL registered facilities.
        """
        responses = []
        facilities = Facility.objects.filter(dataset__registered=True).values_list(
            "id", "name"
        )

        for id, name in facilities:
            request.data.update(facility=id, facility_name=name)
            responses.append(self.startdataportalsync(request).data)

        return Response(responses)

    # Method needs to be available in Setup Wizard as well
    @decorators.action(
        methods=["post"],
        detail=False,
        permission_classes=[IsSuperuser | NotProvisionedCanPost],
    )
    def startpeerfacilityimport(self, request):
        """
        Initiate a PULL of a specific facility from another device.
        """

        baseurl, facility_id, username, password = validate_peer_sync_job(request)
        validate_and_create_sync_credentials(baseurl, facility_id, username, password)
        sync_args = validate_sync_task(request)
        job_data = prepare_peer_sync_job(
            baseurl,
            facility_id,
            no_push=True,
            no_provision=True,
            extra_metadata=prepare_sync_task(*sync_args, type="SYNCPEER/PULL"),
        )

        job_id = facility_queue.enqueue(call_command, "sync", **job_data)

        resp = _job_to_response(facility_queue.fetch_job(job_id))
        return Response(resp)

    @decorators.action(
        methods=["post"], detail=False, permission_classes=[FacilitySyncPermissions]
    )
    def startpeerfacilitysync(self, request):
        """
        Initiate a SYNC (PULL + PUSH) of a specific facility from another device.
        """
        baseurl, facility_id, username, password = validate_peer_sync_job(request)
        validate_and_create_sync_credentials(baseurl, facility_id, username, password)
        sync_args = validate_sync_task(request)
        job_data = prepare_peer_sync_job(
            baseurl,
            facility_id,
            extra_metadata=prepare_sync_task(*sync_args, type="SYNCPEER/FULL"),
        )
        job_id = facility_queue.enqueue(call_command, "sync", **job_data)

        resp = _job_to_response(facility_queue.fetch_job(job_id))
        return Response(resp)

    @decorators.action(methods=["post"], detail=False, permission_classes=[IsSuperuser])
    def startdeletefacility(self, request):
        """
        Initiate a task to delete a facility
        """
        try:
            facility_id = request.data.get("facility")
            if not facility_id:
                raise KeyError()
        except KeyError:
            raise ParseError(
                dict(code="INVALID_FACILITY", message="Missing `facility` parameter")
            )

        if not Facility.objects.filter(id=facility_id).exists():
            raise ValidationError(
                dict(code="INVALID_FACILITY", message="Facility doesn't exist")
            )

        if not Facility.objects.exclude(id=facility_id).exists():
            raise ValidationError(
                dict(
                    code="SOLE_FACILITY",
                    message="Cannot delete the sole facility on the device",
                )
            )

        if request.user.is_facility_user and request.user.facility_id == facility_id:
            raise ValidationError(
                dict(code="FACILITY_MEMBER", message="User is member of facility")
            )

        facility_name = Facility.objects.get(id=facility_id).name
        job_id = facility_queue.enqueue(
            call_command,
            "deletefacility",
            facility=facility_id,
            track_progress=True,
            noninteractive=True,
            cancellable=False,
            extra_metadata=dict(
                facility=facility_id,
                facility_name=facility_name,
                started_by=request.user.pk,
                started_by_username=request.user.username,
                type="DELETEFACILITY",
            ),
        )

        resp = _job_to_response(facility_queue.fetch_job(job_id))
        return Response(resp)


class ResourceGoneError(APIException):
    """
    API error for when a peer no longer is online
    """

    status_code = status.HTTP_410_GONE
    default_detail = "Unable to connect"


def prepare_sync_task(
    facility_id,
    user_id,
    username,
    facility_name,
    device_name,
    device_id,
    baseurl,
    **kwargs
):
    task_data = dict(
        facility=facility_id,
        started_by=user_id,
        started_by_username=username,
        sync_state=FacilitySyncState.PENDING,
        bytes_sent=0,
        bytes_received=0,
    )

    task_type = kwargs.get("type")
    if task_type in ["SYNCPEER/PULL", "SYNCPEER/FULL"]:
        # Extra metadata that can be passed from the client
        extra_task_data = dict(
            facility_name=facility_name,
            device_name=device_name,
            device_id=device_id,
            baseurl=baseurl,
        )
        task_data.update(extra_task_data)
    elif task_type == "SYNCDATAPORTAL":
        # Extra metadata that can be passed from the client
        extra_task_data = dict(facility_name=facility_name)
        task_data.update(extra_task_data)

    task_data.update(kwargs)
    return task_data


def validate_facility(request):
    # ensure we have the facility
    try:
        facility_id = request.data.get("facility")
        if not facility_id:
            raise KeyError()
    except KeyError:
        raise ParseError("Missing `facility` parameter")

    return facility_id


def validate_sync_task(request):
    facility_id = validate_facility(request)
    user_id = request.user.pk
    username = request.user.username
    facility_name = request.data.get("facility_name", "")
    device_name = request.data.get("device_name", "")
    device_id = request.data.get("device_id", "")
    baseurl = request.data.get("baseurl", "")
    return (
        facility_id,
        user_id,
        username,
        facility_name,
        device_name,
        device_id,
        baseurl,
    )


def prepare_sync_job(**kwargs):
    job_data = dict(
        chunk_size=200,
        noninteractive=True,
        extra_metadata={},
        track_progress=True,
        cancellable=False,
    )

    job_data.update(kwargs)
    return job_data


def validate_peer_sync_job(request):
    # validate the baseurl
    try:
        address = request.data.get("baseurl")
        if not address:
            raise KeyError()

        baseurl = NetworkClient(address=address).base_url
    except KeyError:
        raise ParseError("Missing `baseurl` parameter")
    except URLParseError:
        raise ParseError("Invalid URL")
    except NetworkLocationNotFound:
        raise ResourceGoneError()

    facility_id = validate_facility(request)

    username = request.data.get("username", None)
    password = request.data.get("password", None)

    return (baseurl, facility_id, username, password)


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
    except (CommandError, HTTPError) as e:
        if not username and not password:
            raise PermissionDenied()
        else:
            raise AuthenticationFailed(e)


def prepare_peer_sync_job(baseurl, facility_id, **kwargs):
    """
    Initializes and validates connection to peer with username and password for the sync command. If
    already initialized, the username and password do not need to be supplied
    """
    return prepare_sync_job(facility=facility_id, baseurl=baseurl, **kwargs)


def prepare_soud_sync_job(baseurl, facility_id, user_id, **kwargs):
    """
    A SoUD sync requires that the device is already "registered" with the server, so there
    shouldn't be a need for username/password and the verification of those. This eliminates the
    validation to keep overhead low for automated single-user syncing. To initialize with a peer
    for a SoUD, use `prepare_peer_sync_job` with `user` keyword argument
    """
    return prepare_sync_job(
        baseurl=baseurl, facility=facility_id, user=user_id, **kwargs
    )


def prepare_soud_resume_sync_job(baseurl, sync_session_id, user_id, **kwargs):
    """
    Resuming a SoUD sync requires that a normal sync has occurred and the `SyncSession` is still
    active
    """
    return prepare_sync_job(baseurl=baseurl, id=sync_session_id, user=user_id, **kwargs)


def _job_to_response(job):
    if not job:
        return {
            "type": None,
            "started_by": None,
            "status": State.SCHEDULED,
            "percentage": 0,
            "progress": [],
            "id": None,
            "cancellable": False,
            "clearable": False,
        }
    output = {
        "status": job.state,
        "exception": str(job.exception),
        "traceback": str(job.traceback),
        "percentage": job.percentage_progress,
        "id": job.job_id,
        "cancellable": job.cancellable,
        "clearable": job.state in [State.FAILED, State.CANCELED, State.COMPLETED],
    }
    output.update(job.extra_metadata)
    return output
