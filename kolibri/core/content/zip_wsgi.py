from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import codecs
import hashlib
import io
import json
import logging
import mimetypes
import os
import re
import zipfile
from collections import OrderedDict
from xml.etree.ElementTree import Element

import html5lib
from cheroot import wsgi
from django.conf import settings
from django.contrib.staticfiles.finders import find
from django.contrib.staticfiles.storage import staticfiles_storage
from django.core.handlers.wsgi import WSGIRequest
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from django.http.response import FileResponse
from django.template import loader
from django.utils.cache import get_conditional_response
from django.utils.cache import patch_cache_control
from django.utils.encoding import force_str
from django.utils.http import quote_etag
from django.utils.safestring import mark_safe

from .utils.paths import get_content_storage_file_path
from kolibri import __version__ as kolibri_version
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.utils.paths import get_hashi_path
from kolibri.core.content.utils.paths import get_zip_content_base_path


logger = logging.getLogger(__name__)


HASHI_FILENAME = None


def django_response_to_wsgi(response, environ, start_response):
    status = "%d %s" % (response.status_code, response.reason_phrase)
    response_headers = [(str(k), str(v)) for k, v in response.items()]
    for c in response.cookies.values():
        response_headers.append((str("Set-Cookie"), str(c.output(header=""))))
    start_response(force_str(status), response_headers)
    if getattr(response, "file_to_stream", None) is not None and environ.get(
        "wsgi.file_wrapper"
    ):
        response = environ["wsgi.file_wrapper"](response.file_to_stream)
    return response


hashi_template = """
<!DOCTYPE html>

<html>
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="google" content="notranslate">
    </head>
    <body>
        <script type="text/javascript">{}</script>
    </body>
</html>
"""


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


def hashi_view(environ, start_response):
    # Removes Byte Order Mark
    charset = "utf-8-sig"
    basename = "content/{filename}".format(filename=get_hashi_filename())

    filename = None
    # First try finding the file using the storage class.
    # This is skipped in DEVELOPER_MODE mode as files might be outdated
    # Or may not even be on disk.
    if not getattr(settings, "DEVELOPER_MODE", False):
        filename = staticfiles_storage.path(basename)
    else:
        filename = find(basename)

    with codecs.open(filename, "r", charset) as fd:
        content = fd.read()
    content_type = "text/html"
    response = HttpResponse(
        mark_safe(hashi_template.format(content)), content_type=content_type
    )
    response["Content-Length"] = len(response.content)
    return django_response_to_wsgi(response, environ, start_response)


def calculate_zip_content_etag():
    return quote_etag(
        hashlib.md5(
            kolibri_version.encode("utf-8") + get_hashi_filename().encode("utf-8")
        ).hexdigest()
    )


def load_json_from_zipfile(zf, filepath):
    with zf.open(filepath, "r") as f:
        return json.load(f)


def recursive_h5p_dependencies(zf, data, prefix=""):

    jsfiles = OrderedDict()
    cssfiles = OrderedDict()

    # load the dependencies, recursively, to extract their JS and CSS paths to include
    for dep in data.get("preloadedDependencies", []):
        packagepath = "{machineName}-{majorVersion}.{minorVersion}/".format(**dep)
        librarypath = packagepath + "library.json"
        content = load_json_from_zipfile(zf, librarypath)
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


def parse_html(content):
    try:
        document = html5lib.parse(content, namespaceHTMLElements=False)

        if not document:
            # Could not parse
            return content

        # Because html5lib parses like a browser, it will
        # always create head and body tags if they are missing.
        head = document.find("head")
        initialize_hashi_from_iframe = """
            if (window.parent && window.parent.hashi) {
                try {
                    window.parent.hashi.initializeIframe(window);
                } catch (e) {}
            }
        """

        script_tag = Element("script", attrib={"type": "text/javascript"})
        script_tag.text = initialize_hashi_from_iframe
        head.insert(0, script_tag)
        # Currently, html5lib strips the doctype, but it's important for correct rendering, so check the original
        # content for the doctype and, if found, prepend it to the content serialized by html5lib
        doctype = None
        try:
            # Now parse the content as a dom tree instead, so that we capture
            # any doctype node as a dom node that we can read.
            tree_builder_dom = html5lib.treebuilders.getTreeBuilder("dom")
            parser_dom = html5lib.HTMLParser(
                tree_builder_dom, namespaceHTMLElements=False
            )
            tree = parser_dom.parse(content)
            # By HTML Spec if doctype is included, it must be the first thing
            # in the document, so it has to be the first child node of the document
            doctype_node = tree.childNodes[0]

            # Check that this node is in fact a doctype node
            if doctype_node.nodeType == doctype_node.DOCUMENT_TYPE_NODE:
                # render to a string by calling the toxml method
                # toxml uses single quotes by default, replace with ""
                doctype = doctype_node.toxml().replace("'", '"')
        except Exception as e:
            logger.warn("Error in HTML5 parsing to determine doctype {}".format(e))

        html = html5lib.serialize(
            document,
            quote_attr_values="always",
            omit_optional_tags=False,
            minimize_boolean_attributes=False,
            use_trailing_solidus=True,
            space_before_trailing_solidus=False,
        )

        if doctype:
            html = doctype + html

        return html
    except html5lib.html5parser.ParseError:
        return content


def get_h5p(zf, embedded_filepath):
    file_size = 0
    if not embedded_filepath:
        # Get the h5p bootloader, and then run it through our hashi templating code.
        # return the H5P bootloader code
        try:
            h5pdata = load_json_from_zipfile(zf, "h5p.json")
            contentdata = load_json_from_zipfile(zf, "content/content.json")
        except KeyError:
            return HttpResponseNotFound("No valid h5p file was found at this location")
        jsfiles, cssfiles = recursive_h5p_dependencies(zf, h5pdata)
        jsfiles = jsfiles.keys()
        cssfiles = cssfiles.keys()
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
                "content": json.dumps(
                    json.dumps(contentdata, separators=(",", ":"), ensure_ascii=False)
                ),
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
        path = find("assets/h5p-standalone-" + embedded_filepath)
        if path is None:
            return HttpResponseNotFound("{} not found".format(embedded_filepath))
        # try to guess the MIME type of the embedded file being referenced
        content_type = (
            mimetypes.guess_type(embedded_filepath)[0] or "application/octet-stream"
        )
        response = FileResponse(open(path, "rb"), content_type=content_type)
        file_size = os.stat(path).st_size
    if file_size:
        response["Content-Length"] = file_size
    return response


def get_embedded_file(zf, zipped_filename, embedded_filepath):
    # if no path, or a directory, is being referenced, look for an index.html file
    if not embedded_filepath or embedded_filepath.endswith("/"):
        embedded_filepath += "index.html"

    # get the details about the embedded file, and ensure it exists
    try:
        info = zf.getinfo(embedded_filepath)
    except KeyError:
        return HttpResponseNotFound(
            '"{}" does not exist inside "{}"'.format(embedded_filepath, zipped_filename)
        )

    # file size
    file_size = 0

    # try to guess the MIME type of the embedded file being referenced
    content_type = (
        mimetypes.guess_type(embedded_filepath)[0] or "application/octet-stream"
    )
    if zipped_filename.endswith("zip") and (
        embedded_filepath.endswith("htm") or embedded_filepath.endswith("html")
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


path_regex = re.compile("/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)")


def get_zipped_file_path(zipped_filename):
    # calculate the local file path to the zip file
    zipped_path = get_content_storage_file_path(zipped_filename)
    # if the zipfile does not exist on disk, return a 404
    if not os.path.exists(zipped_path):
        raise InvalidStorageFilenameError()
    return zipped_path


YEAR_IN_SECONDS = 60 * 60 * 24 * 365


def generate_zip_content_response(environ):
    match = path_regex.match(environ["PATH_INFO"])
    if match is None:
        return HttpResponseNotFound("Path not found")

    zipped_filename, embedded_filepath = match.groups()

    try:
        zipped_path = get_zipped_file_path(zipped_filename)
    except InvalidStorageFilenameError:
        return HttpResponseNotFound(
            '"%(filename)s" is not a valid zip file' % {"filename": zipped_filename}
        )

    # Sometimes due to URL concatenation, we get URLs with double-slashes in them, like //path/to/file.html.
    # the zipped_filename and embedded_filepath are defined by the regex capturing groups in the URL defined
    # in urls.py in the same folder as this file:
    # r"^zipcontent/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)"
    # If the embedded_filepath contains a leading slash because of an input URL like:
    # /zipcontent/filename.zip//file.html
    # then the embedded_filepath will have a value of "/file.html"
    # we detect this leading slash in embedded_filepath and remove it.
    if embedded_filepath.startswith("/"):
        embedded_filepath = embedded_filepath[1:]
    # Any double-slashes later in the URL will be present as double-slashes, such as:
    # /zipcontent/filename.zip/path//file.html
    # giving an embedded_filepath value of "path//file.html"
    # Normalize the path by converting double-slashes occurring later in the path to a single slash.
    # This would change our example embedded_filepath to "path/file.html" which will resolve properly.
    embedded_filepath = embedded_filepath.replace("//", "/")

    request = WSGIRequest(environ)
    etag = calculate_zip_content_etag()
    # if client has a cached version, use that (we can safely assume nothing has changed, due to MD5)
    cached_response = get_conditional_response(request, etag=etag)

    if cached_response is not None:
        return cached_response

    with zipfile.ZipFile(zipped_path) as zf:

        # handle H5P files
        if zipped_path.endswith("h5p"):
            if not embedded_filepath or embedded_filepath.startswith("dist/"):
                response = get_h5p(zf, embedded_filepath)
            else:
                # Don't bother doing any hashi parsing of HTML content for h5p
                response = get_embedded_file(zf, zipped_filename, embedded_filepath)
        else:
            response = get_embedded_file(zf, zipped_filename, embedded_filepath)

    # ensure the browser knows not to try byte-range requests, as we don't support them here
    response["Accept-Ranges"] = "none"

    response["ETag"] = etag

    patch_cache_control(response, max_age=YEAR_IN_SECONDS)

    return response


def zip_content_view(environ, start_response):
    """
    Handles GET requests and serves a static file from within the zip file.
    """
    response = generate_zip_content_response(environ)

    return django_response_to_wsgi(response, environ, start_response)


def get_application():
    path_map = {
        get_hashi_path(): hashi_view,
        get_zip_content_base_path(): zip_content_view,
    }

    return wsgi.PathInfoDispatcher(path_map)
