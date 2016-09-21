import datetime
import mimetypes
import os
import zipfile

from django.http import Http404
from django.http.response import FileResponse, HttpResponseNotModified
from django.utils.http import http_date
from django.views.generic.base import View

from .utils.paths import get_content_storage_file_path


class ZipContentView(View):

    def get(self, request, zipped_filename, embedded_filepath):
        """
        Handles GET requests and serves a static file from within the zip file.
        """

        # calculate the local file path to the zip file
        zipped_path = get_content_storage_file_path(zipped_filename)

        # if the zipfile does not exist on disk, return a 404
        if not os.path.exists(zipped_path):
            raise Http404('"%(filename)s" does not exist locally' % {'filename': zipped_filename})

        # if client has a cached version, use that (we can safely assume nothing has changed, due to MD5)
        if request.META.get('HTTP_IF_MODIFIED_SINCE'):
            return HttpResponseNotModified()

        with zipfile.ZipFile(zipped_path) as zf:

            # get the details about the embedded file, and ensure it exists
            try:
                info = zf.getinfo(embedded_filepath)
            except KeyError:
                raise Http404('"{}" does not exist inside "{}"'.format(embedded_filepath, zipped_filename))

            # try to guess the MIME type of the embedded file being referenced
            content_type = mimetypes.guess_type(embedded_filepath)[0] or 'application/octet-stream'

            # generate a streaming response object, pulling data from within the zip  file
            response = FileResponse(zf.open(info), content_type=content_type)

        # set the last-modified header to the date marked on the embedded file
        if info.date_time:
            response["Last-Modified"] = http_date(float(datetime.datetime(*info.date_time).strftime("%s")))

        # cache these resources forever; this is safe due to the MD5-naming used on content files
        response["Expires"] = "Sun, 17-Jan-2038 19:14:07 GMT"

        # set the content-length header to the size of the embedded file
        if info.file_size:
            response["Content-Length"] = info.file_size

        # ensure the browser knows not to try byte-range requests, as we don't support them here
        response["Accept-Ranges"] = "none"

        return response


class DownloadContentView(View):

    def get(self, request, filename, new_filename):
        """
        Handles GET requests and serves a static file as an attachment.
        """

        # calculate the local file path of the file
        path = get_content_storage_file_path(filename)

        # if the file does not exist on disk, return a 404
        if not os.path.exists(path):
            raise Http404('"%(filename)s" does not exist locally' % {'filename': filename})

        # generate a file response
        response = FileResponse(open(path, 'rb'))

        # set the content-type by guessing from the filename
        response['Content-Type'] = mimetypes.guess_type(filename)[0]

        # set the content-disposition as attachment to force download
        response['Content-Disposition'] = 'attachment;'

        # set the content-length to the file size
        response['Content-Length'] = os.path.getsize(path)

        return response
