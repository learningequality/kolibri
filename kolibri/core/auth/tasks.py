import ntpath
import os
import shutil
from tempfile import mkstemp

from django.core.files.uploadedfile import InMemoryUploadedFile
from django.core.files.uploadedfile import UploadedFile
from django.core.management import call_command
from django.http.response import HttpResponseBadRequest
from django.utils.translation import get_language_from_request
from rest_framework import serializers
from rest_framework.exceptions import ParseError
from rest_framework.permissions import BasePermission

from kolibri.core.auth.models import Facility
from kolibri.core.auth.permissions.general import _user_is_admin_for_own_facility
from kolibri.core.auth.tasks_utils import prepare_peer_sync_job
from kolibri.core.auth.tasks_utils import prepare_sync_job
from kolibri.core.auth.tasks_utils import prepare_sync_task
from kolibri.core.auth.tasks_utils import validate_and_create_sync_credentials
from kolibri.core.auth.tasks_utils import validate_facility
from kolibri.core.auth.tasks_utils import validate_peer_sync_job
from kolibri.core.auth.tasks_utils import validate_sync_task
from kolibri.core.content.permissions import CanImportUsers
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.permissions import NotProvisionedCanPost
from kolibri.core.tasks.decorators import register_task
from kolibri.utils import conf


class FacilitySyncPermissions(BasePermission):
    """
    A user can sync a facility with a peer or KDP if they are an admin in their
    own facility or a superuser
    """

    def has_permission(self, request, view):
        return request.user.is_superuser or _user_is_admin_for_own_facility(
            request.user
        )

    def has_object_permission(self, request, view):
        return request.user.is_superuser or _user_is_admin_for_own_facility(
            request.user
        )


def manage_fileobject(request, temp_dir):
    upload = UploadedFile(request.FILES["csvfile"])
    # Django uses InMemoryUploadedFile for files less than 2.5Mb
    # and TemporaryUploadedFile for bigger files:
    if type(upload.file) == InMemoryUploadedFile:
        _, filepath = mkstemp(dir=temp_dir, suffix=".upload")
        with open(filepath, "w+b") as dest:
            filepath = dest.name
            for chunk in upload.file.chunks():
                dest.write(chunk)
    else:
        tmpfile = upload.file.temporary_file_path()
        filename = ntpath.basename(tmpfile)
        filepath = os.path.join(temp_dir, filename)
        shutil.copy(tmpfile, filepath)
    return filepath


def validate_importusersfromcsv(request, request_data):
    temp_dir = os.path.join(conf.KOLIBRI_HOME, "temp")
    if not os.path.isdir(temp_dir):
        os.mkdir(temp_dir)

    locale = get_language_from_request(request)
    # the request must contain either an object file
    # or the filename of the csv stored in Kolibri temp folder
    # Validation will provide the file object, while
    # Importing will provide the filename, previously validated
    if not request.FILES:
        filename = request_data.get("csvfile", None)
        if filename:
            filepath = os.path.join(temp_dir, filename)
        else:
            return HttpResponseBadRequest("The request must contain a file object")
    else:
        if "csvfile" not in request.FILES:
            return HttpResponseBadRequest("Wrong file object")
        filepath = manage_fileobject(request, temp_dir)

    userid = request.user.pk
    facility_id = request_data.get("facility_id", None)

    job_metadata = {
        "type": "IMPORTUSERSFROMCSV",
        "started_by": userid,
        "facility": facility_id,
    }

    job_args = []
    if request_data.get("dryrun") is not None:
        job_args.append("--dryrun")
    if request_data.get("delete") is not None:
        job_args.append("--delete")
    job_args.append(filepath)

    return {
        "job_args": job_args,
        "facility": facility_id,
        "userid": userid,
        "locale": locale,
        "extra_metadata": job_metadata,
    }


@register_task(
    validator=validate_importusersfromcsv,
    track_progress=True,
    permission_classes=[CanImportUsers],
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


def validate_exportuserstocsv(request, request_data):
    facility_id = request_data.get("facility_id")

    try:
        if facility_id:
            facility = Facility.objects.get(pk=facility_id).id
        else:
            facility = request.user.facility.id
    except Facility.DoesNotExist:
        raise serializers.ValidationError(
            "Facility with ID {} does not exist".format(facility_id)
        )

    job_metadata = {
        "type": "EXPORTUSERSTOCSV",
        "started_by": request.user.pk,
        "facility": facility,
    }

    return {
        "facility": facility,
        "locale": get_language_from_request(request),
        "extra_metadata": job_metadata,
    }


@register_task(
    validator=validate_exportuserstocsv,
    track_progress=True,
    permission_classes=[CanImportUsers],
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


def validate_startdataportalsync(request, request_data):
    facility_id = validate_facility(request)
    sync_args = validate_sync_task(request)
    job_data = prepare_sync_job(
        facility=facility_id,
    )

    extra_metadata = prepare_sync_task(*sync_args, type="SYNCDATAPORTAL")

    return {"job_data": job_data, "extra_metadata": extra_metadata}


@register_task(
    validator=validate_startdataportalsync,
    permission_classes=[FacilitySyncPermissions],
    track_progress=True,
    cancellable=False,
)
def startdataportalsync(job_data):
    """
    Initiate a PUSH sync with Kolibri Data Portal.
    """
    call_command("sync", **job_data)


def validate_startpeerfacilityimport(request, request_data):
    baseurl, facility_id, username, password = validate_peer_sync_job(request)
    validate_and_create_sync_credentials(baseurl, facility_id, username, password)
    sync_args = validate_sync_task(request)
    job_data = prepare_peer_sync_job(
        baseurl,
        facility_id,
        no_push=True,
        no_provision=True,
    )

    extra_metadata = prepare_sync_task(*sync_args, type="SYNCPEER/PULL")

    return {"job_data": job_data, "extra_metadata": extra_metadata}


@register_task(
    validator=validate_startpeerfacilityimport,
    permission_classes=[IsSuperuser | NotProvisionedCanPost],
    track_progress=True,
    cancellable=False,
)
def startpeerfacilityimport(job_data):
    """
    Initiate a PULL of a specific facility from another device.
    """
    call_command("sync", **job_data)


def validate_startpeerfacilitysync(request, request_data):
    baseurl, facility_id, username, password = validate_peer_sync_job(request)
    validate_and_create_sync_credentials(baseurl, facility_id, username, password)
    sync_args = validate_sync_task(request)
    job_data = prepare_peer_sync_job(
        baseurl,
        facility_id,
    )

    extra_metadata = prepare_sync_task(*sync_args, type="SYNCPEER/FULL")

    return {"job_data": job_data, "extra_metadata": extra_metadata}


@register_task(
    validator=validate_startpeerfacilitysync,
    permission_classes=[FacilitySyncPermissions],
    track_progress=True,
    cancellable=False,
)
def startpeerfacilitysync(job_data):
    """
    Initiate a SYNC (PULL + PUSH) of a specific facility from another device.
    """
    call_command("sync", **job_data)


def validate_startdeletefacility(request, request_data):
    try:
        facility_id = request_data.get("facility")
        if not facility_id:
            raise KeyError()
    except KeyError:
        raise ParseError(
            dict(code="INVALID_FACILITY", message="Missing `facility` parameter")
        )

    if not Facility.objects.filter(id=facility_id).exists():
        raise serializers.ValidationError(
            dict(code="INVALID_FACILITY", message="Facility doesn't exist")
        )

    if not Facility.objects.exclude(id=facility_id).exists():
        raise serializers.ValidationError(
            dict(
                code="SOLE_FACILITY",
                message="Cannot delete the sole facility on the device",
            )
        )

    if request.user.is_facility_user and request.user.facility_id == facility_id:
        raise serializers.ValidationError(
            dict(code="FACILITY_MEMBER", message="User is member of facility")
        )

    facility_name = Facility.objects.get(id=facility_id).name

    extra_metadata = dict(
        facility=facility_id,
        facility_name=facility_name,
        started_by=request.user.pk,
        started_by_username=request.user.username,
        type="DELETEFACILITY",
    )

    return {
        "facility_id": facility_id,
        "extra_metadata": extra_metadata,
    }


@register_task(
    validator=validate_startdeletefacility,
    permission_classes=[IsSuperuser],
    track_progress=True,
    cancellable=False,
)
def startdeletefacility(facility_id):
    """
    Initiate a task to delete a facility
    """
    call_command(
        "deletefacility",
        facility=facility_id,
        noninteractive=True,
    )
