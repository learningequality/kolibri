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

from kolibri.core.auth.models import Facility
from kolibri.core.content.permissions import CanImportUsers
from kolibri.core.tasks.decorators import register_task
from kolibri.utils import conf


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
def importusersfromcsv(job_args, facility, userid, locale):
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
def exportuserstocsv(facility, locale):
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
