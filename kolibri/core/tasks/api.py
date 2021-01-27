import logging
import ntpath
import os
import shutil
from functools import partial
from tempfile import NamedTemporaryFile

import requests
from django.apps.registry import AppRegistryNotReady
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.files.uploadedfile import UploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.http.response import Http404
from django.http.response import HttpResponseBadRequest
from django.utils.translation import get_language_from_request
from django.utils.translation import gettext_lazy as _
from morango.models import ScopeDefinition
from morango.sync.controller import MorangoProfileController
from requests.exceptions import HTTPError
from rest_framework import decorators
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.exceptions import APIException
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ParseError
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from six import string_types

from .permissions import FacilitySyncPermissions
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import State as FacilitySyncState
from kolibri.core.auth.management.utils import get_client_and_server_certs
from kolibri.core.auth.management.utils import get_dataset_id
from kolibri.core.auth.models import Facility
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.permissions import CanExportLogs
from kolibri.core.content.permissions import CanImportUsers
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import get_mounted_drives_with_channel_info
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.content.utils.upgrade import diff_stats
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.permissions import NotProvisionedCanPost
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import URLParseError
from kolibri.core.logger.csv_export import CSV_EXPORT_FILENAMES
from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import facility_queue
from kolibri.core.tasks.main import priority_queue
from kolibri.core.tasks.main import queue
from kolibri.core.tasks.utils import get_current_job
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


def get_channel_name(channel_id, require_channel=False):
    try:
        channel = ChannelMetadata.objects.get(id=channel_id)
        channel_name = channel.name
    except ChannelMetadata.DoesNotExist:
        if require_channel:
            raise serializers.ValidationError("This channel does not exist")
        channel_name = ""

    return channel_name


def validate_content_task(request, task_description, require_channel=False):
    try:
        channel_id = task_description["channel_id"]
    except KeyError:
        raise serializers.ValidationError("The channel_id field is required.")

    channel_name = task_description.get(
        "channel_name", get_channel_name(channel_id, require_channel)
    )

    node_ids = task_description.get("node_ids", None)
    exclude_node_ids = task_description.get("exclude_node_ids", None)

    if node_ids and not isinstance(node_ids, list):
        raise serializers.ValidationError("node_ids must be a list.")

    if exclude_node_ids and not isinstance(exclude_node_ids, list):
        raise serializers.ValidationError("exclude_node_ids must be a list.")

    return {
        "channel_id": channel_id,
        "channel_name": channel_name,
        "exclude_node_ids": exclude_node_ids,
        "node_ids": node_ids,
        "started_by": request.user.pk,
        "started_by_username": request.user.username,
    }


def validate_remote_import_task(request, task_description):
    import_task = validate_content_task(request, task_description)
    try:
        peer_id = task_description["peer_id"]
        baseurl = NetworkLocation.objects.values_list("base_url", flat=True).get(
            id=peer_id
        )
    except NetworkLocation.DoesNotExist:
        raise serializers.ValidationError(
            "Peer with id {} does not exist".format(peer_id)
        )
    except KeyError:
        baseurl = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        peer_id = None

    import_task.update({"baseurl": baseurl, "peer_id": peer_id})
    return import_task


def _add_drive_info(import_task, task_description):
    try:
        drive_id = task_description["drive_id"]
    except KeyError:
        raise serializers.ValidationError("The drive_id field is required.")

    try:
        drive = get_mounted_drive_by_id(drive_id)
    except KeyError:
        raise serializers.ValidationError(
            "That drive_id was not found in the list of drives."
        )

    import_task.update({"drive_id": drive_id, "datafolder": drive.datafolder})

    return import_task


def validate_local_import_task(request, task_description):
    task = validate_content_task(request, task_description)
    task = _add_drive_info(task, task_description)
    return task


def validate_local_export_task(request, task_description):
    task = validate_content_task(request, task_description, require_channel=True)
    task = _add_drive_info(task, task_description)
    return task


def validate_deletion_task(request, task_description):
    task = validate_content_task(request, task_description, require_channel=True)
    task["force_delete"] = bool(task_description.get("force_delete"))
    return task


class BaseViewSet(viewsets.ViewSet):
    queues = []
    permission_classes = []

    def initial(self, request, *args, **kwargs):
        if len(self.permission_classes) == 0:
            self.permission_classes = self.default_permission_classes()
        return super(BaseViewSet, self).initial(request, *args, **kwargs)

    def default_permission_classes(self):
        # task permissions shared between facility management and device management
        if self.action in ["list", "deletefinishedtasks"]:
            return [CanManageContent | CanExportLogs]
        elif self.action == "startexportlogcsv":
            return [CanExportLogs]
        elif self.action in ["importusersfromcsv", "exportuserstocsv"]:
            return [CanImportUsers]

        # this was the default before, so leave as is for any other endpoints
        return [CanManageContent]

    def list(self, request):
        jobs_response = [
            _job_to_response(j) for _queue in self.queues for j in _queue.jobs
        ]

        return Response(jobs_response)

    def create(self, request):
        # unimplemented. Call out to the task-specific APIs for now.
        pass

    def retrieve(self, request, pk=None):
        for _queue in self.queues:
            try:
                task = _job_to_response(_queue.fetch_job(pk))
                break
            except JobNotFound:
                continue
        else:
            raise Http404("Task with {pk} not found".format(pk=pk))

        return Response(task)

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
    queues = [queue, priority_queue]

    def default_permission_classes(self):
        # exclusive permission for facility management
        if self.action == "startexportlogcsv":
            return [CanExportLogs]

        return super(TasksViewSet, self).permission_classes

    @decorators.action(methods=["post"], detail=False)
    def startchannelupdate(self, request):

        sourcetype = request.data.get("sourcetype", None)
        new_version = request.data.get("new_version", None)

        if sourcetype == "remote":
            task = validate_remote_import_task(request, request.data)
            task.update({"type": "UPDATECHANNEL", "new_version": new_version})
            job_id = queue.enqueue(
                _remoteimport,
                task["channel_id"],
                task["baseurl"],
                peer_id=task["peer_id"],
                node_ids=task["node_ids"],
                is_updating=True,
                extra_metadata=task,
                track_progress=True,
                cancellable=True,
            )
        elif sourcetype == "local":
            task = validate_local_import_task(request, request.data)
            task.update({"type": "UPDATECHANNEL", "new_version": new_version})
            job_id = queue.enqueue(
                _diskimport,
                task["channel_id"],
                task["datafolder"],
                drive_id=task["drive_id"],
                node_ids=task["node_ids"],
                is_updating=True,
                extra_metadata=task,
                track_progress=True,
                cancellable=True,
            )
        else:
            raise serializers.ValidationError("sourcetype must be 'remote' or 'local'")

        resp = _job_to_response(queue.fetch_job(job_id))

        return Response(resp)

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
    def startremotechannelimport(self, request):

        task = validate_remote_import_task(request, request.data)

        task.update({"type": "REMOTECHANNELIMPORT"})

        job_id = priority_queue.enqueue(
            call_command,
            "importchannel",
            "network",
            task["channel_id"],
            baseurl=task["baseurl"],
            peer_id=task["peer_id"],
            extra_metadata=task,
            cancellable=True,
        )
        resp = _job_to_response(priority_queue.fetch_job(job_id))

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startremotecontentimport(self, request):

        task = validate_remote_import_task(request, request.data)
        task.update({"type": "REMOTECONTENTIMPORT"})

        job_id = queue.enqueue(
            call_command,
            "importcontent",
            "network",
            task["channel_id"],
            baseurl=task["baseurl"],
            peer_id=task["peer_id"],
            node_ids=task["node_ids"],
            exclude_node_ids=task["exclude_node_ids"],
            extra_metadata=task,
            track_progress=True,
            cancellable=True,
        )

        resp = _job_to_response(queue.fetch_job(job_id))

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

    @decorators.action(methods=["post"], detail=False)
    def startdiskexport(self, request):
        """
        Export a channel to a local drive, and copy content to the drive.
        """

        task = validate_local_export_task(request, request.data)

        task.update({"type": "DISKCONTENTEXPORT"})

        task_id = queue.enqueue(
            _localexport,
            task["channel_id"],
            task["drive_id"],
            track_progress=True,
            cancellable=True,
            node_ids=task["node_ids"],
            exclude_node_ids=task["exclude_node_ids"],
            extra_metadata=task,
        )

        # attempt to get the created Task, otherwise return pending status
        resp = _job_to_response(queue.fetch_job(task_id))

        return Response(resp)

    @decorators.action(methods=["get"], detail=False)
    def localdrive(self, request):
        drives = get_mounted_drives_with_channel_info()

        # make sure everything is a dict, before converting to JSON
        assert isinstance(drives, dict)
        out = [mountdata._asdict() for mountdata in drives.values()]

        return Response(out)

    @decorators.action(methods=["post"], detail=False)
    def importusersfromcsv(self, request):
        """
        Import users, classes, roles and roles assignemnts from a csv file.
        :param: FILE: file dictionary with the file object
        :param: csvfile: filename of the file stored in kolibri temp folder
        :param: dryrun: validate the data but don't modify the database
        :param: delete: Users not in the csv will be deleted from the facility, and classes cleared
        :returns: An object with the job information
        """

        def manage_fileobject(request, temp_dir):
            upload = UploadedFile(request.FILES["csvfile"])
            # Django uses InMemoryUploadedFile for files less than 2.5Mb
            # and TemporaryUploadedFile for bigger files:
            if type(upload.file) == InMemoryUploadedFile:
                with NamedTemporaryFile(
                    dir=temp_dir, suffix=".upload", delete=False
                ) as dest:
                    filepath = dest.name
                    for chunk in upload.file.chunks():
                        dest.write(chunk)
            else:
                tmpfile = upload.file.temporary_file_path()
                filename = ntpath.basename(tmpfile)
                filepath = os.path.join(temp_dir, filename)
                shutil.copy(tmpfile, filepath)
            return filepath

        temp_dir = os.path.join(conf.KOLIBRI_HOME, "temp")
        if not os.path.isdir(temp_dir):
            os.mkdir(temp_dir)

        locale = get_language_from_request(request)
        # the request must contain either an object file
        # or the filename of the csv stored in Kolibri temp folder
        # Validation will provide the file object, while
        # Importing will provide the filename, previously validated
        if not request.FILES:
            filename = request.data.get("csvfile", None)
            if filename:
                filepath = os.path.join(temp_dir, filename)
            else:
                return HttpResponseBadRequest("The request must contain a file object")
        else:
            if "csvfile" not in request.FILES:
                return HttpResponseBadRequest("Wrong file object")
            filepath = manage_fileobject(request, temp_dir)

        delete = request.data.get("delete", None)
        dryrun = request.data.get("dryrun", None)
        userid = request.user.pk
        facility_id = request.data.get("facility_id", None)
        job_type = "IMPORTUSERSFROMCSV"
        job_metadata = {"type": job_type, "started_by": userid, "facility": facility_id}
        job_args = ["bulkimportusers"]
        if dryrun:
            job_args.append("--dryrun")
        if delete:
            job_args.append("--delete")
        job_args.append(filepath)

        job_kwd_args = {
            "facility": facility_id,
            "userid": userid,
            "locale": locale,
            "extra_metadata": job_metadata,
            "track_progress": True,
        }

        job_id = priority_queue.enqueue(call_command, *job_args, **job_kwd_args)

        resp = _job_to_response(priority_queue.fetch_job(job_id))

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def exportuserstocsv(self, request):
        """
        Export users, classes, roles and roles assignemnts to a csv file.

        :param: facility_id
        :returns: An object with the job information

        """
        facility_id = request.data.get("facility_id", None)

        try:
            if facility_id:
                facility = Facility.objects.get(pk=facility_id).id
            else:
                facility = request.user.facility
        except Facility.DoesNotExist:
            raise serializers.ValidationError(
                "Facility with ID {} does not exist".format(facility_id)
            )

        job_type = "EXPORTUSERSTOCSV"
        job_metadata = {
            "type": job_type,
            "started_by": request.user.pk,
            "facility": facility,
        }
        locale = get_language_from_request(request)

        job_id = priority_queue.enqueue(
            call_command,
            "bulkexportusers",
            facility=facility,
            locale=locale,
            overwrite="true",
            extra_metadata=job_metadata,
            track_progress=True,
        )

        resp = _job_to_response(priority_queue.fetch_job(job_id))

        return Response(resp)

    @decorators.action(methods=["post"], detail=False)
    def startexportlogcsv(self, request):
        """
        Dumps in csv format the required logs.
        By default it will be dump contentsummarylog.

        :param: logtype: Kind of log to dump, summary or session
        :param: facility
        :returns: An object with the job information

        """
        facility_id = request.data.get("facility", None)
        if facility_id:
            facility = Facility.objects.get(pk=facility_id)
        else:
            facility = request.user.facility

        log_type = request.data.get("logtype", "summary")
        if log_type in CSV_EXPORT_FILENAMES.keys():
            logs_dir = os.path.join(conf.KOLIBRI_HOME, "log_export")
            filepath = os.path.join(
                logs_dir,
                CSV_EXPORT_FILENAMES[log_type].format(facility.name, facility_id[:4]),
            )
        else:
            raise Http404(
                "Impossible to create a csv export file for {}".format(log_type)
            )
        if not os.path.isdir(logs_dir):
            os.mkdir(logs_dir)

        job_type = (
            "EXPORTSUMMARYLOGCSV" if log_type == "summary" else "EXPORTSESSIONLOGCSV"
        )

        job_metadata = {
            "type": job_type,
            "started_by": request.user.pk,
            "facility": facility.id,
        }

        job_id = priority_queue.enqueue(
            call_command,
            "exportlogs",
            log_type=log_type,
            output_file=filepath,
            facility=facility.id,
            overwrite="true",
            extra_metadata=job_metadata,
            track_progress=True,
        )

        resp = _job_to_response(priority_queue.fetch_job(job_id))

        return Response(resp)

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
            job_metadata["new_channel_version"] = channel_metadata.version
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
    queues = [facility_queue]

    def default_permission_classes(self):
        permission_classes = super(FacilityTasksViewSet, self).permission_classes

        if self.action in ["list", "retrieve"]:
            return [p | FacilitySyncPermissions for p in permission_classes]

        # All other permissions are deferred to permission_classes decorator
        return []

    @decorators.action(
        methods=["post"], detail=False, permission_classes=[FacilitySyncPermissions]
    )
    def startdataportalsync(self, request):
        """
        Initiate a PUSH sync with Kolibri Data Portal.
        """
        job_data = validate_prepare_sync_job(
            request, extra_metadata=prepare_sync_task(request, type="SYNCDATAPORTAL")
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
        job_data = validate_and_prepare_peer_sync_job(
            request,
            no_push=True,
            no_provision=True,
            extra_metadata=prepare_sync_task(request, type="SYNCPEER/PULL"),
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
        job_data = validate_and_prepare_peer_sync_job(
            request, extra_metadata=prepare_sync_task(request, type="SYNCPEER/FULL")
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


def prepare_sync_task(request, **kwargs):
    facility_id = request.data.get("facility")
    task_data = dict(
        facility=facility_id,
        started_by=request.user.pk,
        started_by_username=request.user.username,
        sync_state=FacilitySyncState.PENDING,
        bytes_sent=0,
        bytes_received=0,
    )

    task_type = kwargs.get("type")
    if task_type in ["SYNCPEER/PULL", "SYNCPEER/FULL"]:
        # Extra metadata that can be passed from the client
        extra_task_data = dict(
            facility_name=request.data.get("facility_name", ""),
            device_name=request.data.get("device_name", ""),
            device_id=request.data.get("device_id", ""),
            baseurl=request.data.get("baseurl", ""),
        )
        task_data.update(extra_task_data)
    elif task_type == "SYNCDATAPORTAL":
        # Extra metadata that can be passed from the client
        extra_task_data = dict(facility_name=request.data.get("facility_name", ""))
        task_data.update(extra_task_data)

    task_data.update(kwargs)
    return task_data


def validate_prepare_sync_job(request, **kwargs):
    # ensure we have the facility
    try:
        facility_id = request.data.get("facility")
        if not facility_id:
            raise KeyError()
    except KeyError:
        raise ParseError("Missing `facility` parameter")

    job_data = dict(
        facility=facility_id,
        chunk_size=200,
        noninteractive=True,
        extra_metadata=dict(),
        track_progress=True,
        cancellable=False,
    )

    job_data.update(kwargs)
    return job_data


def validate_and_prepare_peer_sync_job(request, **kwargs):
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

    job_data = validate_prepare_sync_job(request, baseurl=baseurl, **kwargs)

    facility_id = job_data.get("facility")
    username = request.data.get("username", None)
    password = request.data.get("password", None)

    # call this in case user directly syncs without migrating database
    if not ScopeDefinition.objects.filter():
        call_command("loaddata", "scopedefinitions")

    controller = MorangoProfileController(PROFILE_FACILITY_DATA)
    network_connection = controller.create_network_connection(baseurl)

    # try to get the certificate, which will save it if successful
    try:
        # make sure we get the dataset ID
        dataset_id = get_dataset_id(
            baseurl, identifier=facility_id, noninteractive=True
        )

        # username and password are not required for this to succeed unless there is no cert
        get_client_and_server_certs(
            username, password, dataset_id, network_connection, noninteractive=True
        )
    except (CommandError, HTTPError) as e:
        if not username and not password:
            raise PermissionDenied()
        else:
            raise AuthenticationFailed(e)

    return job_data


def _remoteimport(
    channel_id,
    baseurl,
    peer_id=None,
    update_progress=None,
    check_for_cancel=None,
    node_ids=None,
    is_updating=False,
    exclude_node_ids=None,
    extra_metadata=None,
):

    call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )

    # Make some real-time updates to the metadata
    job = get_current_job()

    # Signal to UI that the DB-downloading step is done so it knows to display
    # progress correctly
    job.update_progress(0, 1.0)
    job.extra_metadata["database_ready"] = True

    # Add the channel name if it wasn't added initially
    if job and job.extra_metadata.get("channel_name", "") == "":
        job.extra_metadata["channel_name"] = get_channel_name(channel_id)

    job.save_meta()

    call_command(
        "importcontent",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        import_updates=is_updating,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )


def _diskimport(
    channel_id,
    directory,
    drive_id=None,
    update_progress=None,
    check_for_cancel=None,
    node_ids=None,
    is_updating=False,
    exclude_node_ids=None,
    extra_metadata=None,
):

    call_command(
        "importchannel",
        "disk",
        channel_id,
        directory,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )

    # Make some real-time updates to the metadata
    job = get_current_job()

    # Signal to UI that the DB-downloading step is done so it knows to display
    # progress correctly
    job.update_progress(0, 1.0)
    job.extra_metadata["database_ready"] = True

    # Add the channel name if it wasn't added initially
    if job and job.extra_metadata.get("channel_name", "") == "":
        job.extra_metadata["channel_name"] = get_channel_name(channel_id)

    job.save_meta()

    # Skip importcontent step if updating and no nodes have changed
    if is_updating and (node_ids is not None) and len(node_ids) == 0:
        pass
    else:
        call_command(
            "importcontent",
            "disk",
            channel_id,
            directory,
            drive_id=drive_id,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )


def _localexport(
    channel_id,
    drive_id,
    update_progress=None,
    check_for_cancel=None,
    node_ids=None,
    exclude_node_ids=None,
    extra_metadata=None,
):
    drive = get_mounted_drive_by_id(drive_id)

    call_command(
        "exportchannel",
        channel_id,
        drive.datafolder,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )
    try:
        call_command(
            "exportcontent",
            channel_id,
            drive.datafolder,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )
    except UserCancelledError:
        try:
            os.remove(
                get_content_database_file_path(channel_id, datafolder=drive.datafolder)
            )
        except OSError:
            pass
        raise


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
    else:
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
