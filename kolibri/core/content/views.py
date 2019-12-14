from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import hashlib
import io
import json
import mimetypes
import os
import zipfile
from collections import OrderedDict
from xml.etree.ElementTree import SubElement

import html5lib
from django.conf import settings
from django.contrib.staticfiles import finders
from django.http import Http404
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.http.response import FileResponse
from django.http.response import HttpResponseNotModified
from django.template import loader
from django.templatetags.static import static
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.http import etag
from django.views.generic.base import View

from .api import cache_forever
from .decorators import add_security_headers
from .models import ContentNode
from .utils.paths import get_content_storage_file_path
from kolibri import __version__ as kolibri_version
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.hooks import ContentNodeDisplayHook

# Do this to prevent import of broken Windows filetype registry that makes guesstype not work.
# https://www.thecodingforums.com/threads/mimetypes-guess_type-broken-in-windows-on-py2-7-and-python-3-x.952693/
mimetypes.init([os.path.join(os.path.dirname(__file__), "constants", "mime.types")])

HASHI_FILENAME = None


def get_hashi_filename():
    global HASHI_FILENAME
    if HASHI_FILENAME is None or getattr(settings, "DEVELOPER_MODE", None):
        with io.open(
            os.path.join(os.path.dirname(__file__), "./build/hashi_filename"),
            mode="r",
            encoding="utf-8",
        ) as f:
            HASHI_FILENAME = f.read().strip()
    return HASHI_FILENAME


def calculate_zip_content_etag(request, *args, **kwargs):
    return hashlib.md5(
        kolibri_version.encode("utf-8") + get_hashi_filename().encode("utf-8")
    ).hexdigest()


def get_path_or_404(zipped_filename):
    try:
        # calculate the local file path to the zip file
        zipped_path = get_content_storage_file_path(zipped_filename)
        # if the zipfile does not exist on disk, return a 404
        if not os.path.exists(zipped_path):
            raise InvalidStorageFilenameError()
        return zipped_path
    except InvalidStorageFilenameError:
        raise Http404(
            '"%(filename)s" is not a valid zip file' % {"filename": zipped_filename}
        )


def recursive_h5p_dependencies(zf, data, prefix=""):

    jsfiles = OrderedDict()
    cssfiles = OrderedDict()

    # load the dependencies, recursively, to extract their JS and CSS paths to include
    for dep in data.get("preloadedDependencies", []):
        packagepath = "{machineName}-{majorVersion}.{minorVersion}/".format(**dep)
        librarypath = packagepath + "library.json"
        info = zf.getinfo(librarypath)
        content = json.loads(zf.open(info).read())
        newjs, newcss = recursive_h5p_dependencies(zf, content, packagepath)
        cssfiles.update(newcss)
        jsfiles.update(newjs)

    # load the JS required for the current package
    for js in data.get("preloadedJs", []):
        path = prefix + js["path"]
        jsfiles[path] = True

    # load the CSS required for the current package
    for css in data.get("preloadedCss", []):
        path = prefix + css["path"]
        cssfiles[path] = True

    return jsfiles, cssfiles


def replace_script(parent, script):
    parent.remove(script)
    template = SubElement(parent, "template", attrib={"hashi-script": "true"})
    if script.get("async") is not None:
        template.set("async", "true")
    template.append(script)


def parse_html(content):
    try:
        document = html5lib.parse(content, namespaceHTMLElements=False)
        if not document:
            # Could not parse
            return content

        for parent in document.findall(".//script/.."):
            for script in parent.findall("script"):
                replace_script(parent, script)
        # Because html5lib parses like a browser, it will
        # always create head and body tags if they are missing.
        head = document.find("head")
        SubElement(
            head,
            "script",
            attrib={
                "src": static(
                    "content/{filename}".format(filename=get_hashi_filename())
                )
            },
        )
        return html5lib.serialize(
            document,
            quote_attr_values="always",
            omit_optional_tags=False,
            minimize_boolean_attributes=False,
            use_trailing_solidus=True,
            space_before_trailing_solidus=False,
        )
    except html5lib.html5parser.ParseError:
        return content


def get_h5p(zf, embedded_filepath):
    file_size = 0
    if not embedded_filepath:
        # Get the h5p bootloader, and then run it through our hashi templating code.
        # return the H5P bootloader code
        h5pdata = json.loads(zf.open(zf.getinfo("h5p.json")).read())
        jsfiles, cssfiles = recursive_h5p_dependencies(zf, h5pdata)
        jsfiles = jsfiles.keys()
        cssfiles = cssfiles.keys()
        contentdata = zf.open(zf.getinfo("content/content.json")).read()
        path_includes_version = (
            "true"
            if "-" in [name for name in zf.namelist() if "/" in name][0]
            else "false"
        )
        template = loader.get_template("content/h5p.html")
        main_library_data = [
            lib
            for lib in h5pdata["preloadedDependencies"]
            if lib["machineName"] == h5pdata["mainLibrary"]
        ][0]
        bootstrap_content = template.render(
            {
                "jsfiles": jsfiles,
                "cssfiles": cssfiles,
                "content": contentdata,
                "library": "{machineName} {majorVersion}.{minorVersion}".format(
                    **main_library_data
                ),
                "path_includes_version": path_includes_version,
            },
            None,
        )
        content = parse_html(bootstrap_content)
        content_type = "text/html"
        response = HttpResponse(content, content_type=content_type)
        file_size = len(response.content)
    elif embedded_filepath.startswith("dist/"):
        # return static H5P dist resources
        path = finders.find("assets/h5p-standalone-" + embedded_filepath)
        # try to guess the MIME type of the embedded file being referenced
        content_type = (
            mimetypes.guess_type(embedded_filepath)[0] or "application/octet-stream"
        )
        response = FileResponse(open(path, "rb"), content_type=content_type)
        file_size = os.stat(path).st_size
    if file_size:
        response["Content-Length"] = file_size
    return response


def get_embedded_file(
    request, zf, zipped_filename, embedded_filepath, skip_hashi=False
):
    # if no path, or a directory, is being referenced, look for an index.html file
    if not embedded_filepath or embedded_filepath.endswith("/"):
        embedded_filepath += "index.html"

    skip_hashi = skip_hashi or request.GET.get("SKIP_HASHI")

    # get the details about the embedded file, and ensure it exists
    try:
        info = zf.getinfo(embedded_filepath)
    except KeyError:
        raise Http404(
            '"{}" does not exist inside "{}"'.format(embedded_filepath, zipped_filename)
        )

    # file size
    file_size = 0

    # try to guess the MIME type of the embedded file being referenced
    content_type = (
        mimetypes.guess_type(embedded_filepath)[0] or "application/octet-stream"
    )
    if (
        zipped_filename.endswith("zip")
        and (embedded_filepath.endswith("htm") or embedded_filepath.endswith("html"))
        and not skip_hashi
    ):
        content = zf.open(info).read()
        html = parse_html(content)
        response = HttpResponse(html, content_type=content_type)
        file_size = len(response.content)
    else:
        # generate a streaming response object, pulling data from within the zip file
        response = FileResponse(zf.open(info), content_type=content_type)
        file_size = info.file_size

    # set the content-length header to the size of the embedded file
    if file_size:
        response["Content-Length"] = file_size
    return response


class ZipContentView(View):
    @xframe_options_exempt
    @add_security_headers
    def options(self, request, *args, **kwargs):
        """
        Handles OPTIONS requests which may be sent as "preflight CORS" requests to check permissions.
        """
        return HttpResponse()

    @method_decorator(etag(calculate_zip_content_etag))
    @cache_forever
    @xframe_options_exempt
    @add_security_headers
    def get(self, request, zipped_filename, embedded_filepath):
        """
        Handles GET requests and serves a static file from within the zip file.
        """
        zipped_path = get_path_or_404(zipped_filename)

        # if client has a cached version, use that (we can safely assume nothing has changed, due to MD5)
        if request.META.get("HTTP_IF_MODIFIED_SINCE"):
            return HttpResponseNotModified()

        with zipfile.ZipFile(zipped_path) as zf:

            # handle H5P files
            if zipped_path.endswith("h5p"):
                if not embedded_filepath or embedded_filepath.startswith("dist/"):
                    response = get_h5p(zf, embedded_filepath)
                else:
                    # Don't bother doing any hashi parsing of HTML content for h5p
                    response = get_embedded_file(
                        request, zf, zipped_filename, embedded_filepath, skip_hashi=True
                    )
            else:
                response = get_embedded_file(
                    request, zf, zipped_filename, embedded_filepath
                )

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
            raise Http404(
                '"%(filename)s" does not exist locally' % {"filename": filename}
            )

        # generate a file response
        response = FileResponse(open(path, "rb"))

        # set the content-type by guessing from the filename
        response["Content-Type"] = mimetypes.guess_type(filename)[0]

        # set the content-disposition as attachment to force download
        response["Content-Disposition"] = "attachment;"

        # set the content-length to the file size
        response["Content-Length"] = os.path.getsize(path)

        return response


def get_by_node_id(node_id):
    """
    Function to return a content node based on a node id
    """
    if node_id:
        try:
            return ContentNode.objects.get(id=node_id)
        except (ContentNode.DoesNotExist, ValueError):
            # not found, or the id is invalid
            pass


def get_by_channel_id_and_content_id(channel_id, content_id):
    """
    Function to return a content node based on a channel_id and content_id
    """
    if channel_id and content_id:
        try:
            return ContentNode.objects.filter(
                channel_id=channel_id, content_id=content_id
            ).first()
        except ValueError:
            # Raised if a malformed UUID is passed
            pass


def get_by_content_id(content_id):
    """
    Function to return a content node based on a content_id
    """
    if content_id:
        try:
            return ContentNode.objects.filter(content_id=content_id).first()
        except ValueError:
            # Raised if a malformed UUID is passed
            pass


class ContentPermalinkRedirect(View):
    def get(self, request, *args, **kwargs):

        # extract the GET parameters
        channel_id = request.GET.get("channel_id")
        node_id = request.GET.get("node_id")
        content_id = request.GET.get("content_id")

        # first, try to get the node by the unique node_id
        node = get_by_node_id(node_id)

        # fall back to looking for the content_id in the channel if None
        node = node or get_by_channel_id_and_content_id(channel_id, content_id)

        # if it's still not found, see if we can find anything with the content_id across any channel
        node = node or get_by_content_id(content_id)

        # build up the target topic/content page URL
        if node:
            url = None
            for hook in ContentNodeDisplayHook.registered_hooks:
                url = hook.node_url(node)
            if url:
                return HttpResponseRedirect(url)

        raise Http404
