from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging
import mimetypes
import os
import re
import time
import zipfile

import html5lib
from cheroot import wsgi
from django.core.cache import cache
from django.core.handlers.wsgi import WSGIRequest
from django.http import HttpResponse
from django.http import HttpResponseNotAllowed
from django.http import HttpResponseNotFound
from django.http import HttpResponseNotModified
from django.http.response import FileResponse
from django.http.response import StreamingHttpResponse
from django.utils.cache import patch_response_headers
from django.utils.encoding import force_str
from django.utils.http import http_date

from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.core.content.utils.paths import get_zip_content_base_path


logger = logging.getLogger(__name__)


def add_security_headers(request, response):
    response["Access-Control-Allow-Origin"] = "*"
    response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    requested_headers = request.META.get("HTTP_ACCESS_CONTROL_REQUEST_HEADERS", "")
    if requested_headers:
        response["Access-Control-Allow-Headers"] = requested_headers
    # restrict CSP to only allow resources to be loaded from self, to prevent info leakage
    # (e.g. via passing user info out as GET parameters to an attacker's server), or inadvertent data usage
    response[
        "Content-Security-Policy"
    ] = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:"

    return response


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


allowed_methods = set(["GET", "OPTIONS"])

# This is also included in packages/hashi/src/h5p.html
# ideally, we should never ever update this code
# but if we do we should update it there.
INITIALIZE_HASHI_FROM_IFRAME = "if (window.parent && window.parent.hashi) {try {window.parent.hashi.initializeIframe(window);} catch (e) {}}"


def parse_html(content):
    try:
        document = html5lib.parse(content, namespaceHTMLElements=False)

        if not document:
            # Could not parse
            return content

        # Because html5lib parses like a browser, it will
        # always create head and body tags if they are missing.
        head = document.find("head")

        # Use the makeelement method of the head tag here to ensure that we use the same
        # Element class for both. Depending on the system and python version we are on,
        # we may be using the C implementation or the pure python and a mismatch will cause an error.
        script_tag = head.makeelement("script", {"type": "text/javascript"})
        script_tag.text = INITIALIZE_HASHI_FROM_IFRAME

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


def get_embedded_file(zipped_path, zipped_filename, embedded_filepath):
    with zipfile.ZipFile(zipped_path) as zf:
        # if no path, or a directory, is being referenced, look for an index.html file
        if not embedded_filepath or embedded_filepath.endswith("/"):
            embedded_filepath += "index.html"

        # get the details about the embedded file, and ensure it exists
        try:
            info = zf.getinfo(embedded_filepath)
        except KeyError:
            return HttpResponseNotFound(
                '"{}" does not exist inside "{}"'.format(
                    embedded_filepath, zipped_filename
                )
            )

        # file size
        file_size = 0

        # try to guess the MIME type of the embedded file being referenced
        content_type = (
            mimetypes.guess_type(embedded_filepath)[0] or "application/octet-stream"
        )
        if embedded_filepath.endswith("htm") or embedded_filepath.endswith("html"):
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

YEAR_IN_SECONDS = 60 * 60 * 24 * 365


def _zip_content_from_request(request):  # noqa: C901
    if request.method not in allowed_methods:
        return HttpResponseNotAllowed(allowed_methods)

    match = path_regex.match(request.path_info)
    if match is None:
        return HttpResponseNotFound("Path not found")

    if request.method == "OPTIONS":
        return HttpResponse()

    zipped_filename, embedded_filepath = match.groups()

    try:
        # calculate the local file path to the zip file
        zipped_path = get_content_storage_file_path(zipped_filename)
    except InvalidStorageFilenameError:
        return HttpResponseNotFound(
            '"%(filename)s" is not a valid file name' % {"filename": zipped_filename}
        )

    # if the zipfile does not exist on disk, return a 404
    if not os.path.exists(zipped_path):
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

    # if client has a cached version, use that (we can safely assume nothing has changed, due to MD5)
    if request.META.get("HTTP_IF_MODIFIED_SINCE"):
        return HttpResponseNotModified()

    CACHE_KEY = "ZIPCONTENT_VIEW_RESPONSE_{}/{}".format(
        zipped_filename, embedded_filepath
    )
    cached_response = cache.get(CACHE_KEY)
    if cached_response is not None:
        return cached_response

    response = get_embedded_file(zipped_path, zipped_filename, embedded_filepath)

    # ensure the browser knows not to try byte-range requests, as we don't support them here
    response["Accept-Ranges"] = "none"

    response["Last-Modified"] = http_date(time.time())

    patch_response_headers(response, cache_timeout=YEAR_IN_SECONDS)

    if not isinstance(response, StreamingHttpResponse):

        cache.set(CACHE_KEY, response, YEAR_IN_SECONDS)

    return response


def generate_zip_content_response(environ):
    request = WSGIRequest(environ)
    response = _zip_content_from_request(request)
    add_security_headers(request, response)
    return response


def zip_content_view(environ, start_response):
    """
    Handles GET requests and serves a static file from within the zip file.
    """
    response = generate_zip_content_response(environ)

    return django_response_to_wsgi(response, environ, start_response)


def get_application():
    path_map = {
        get_zip_content_base_path(): zip_content_view,
    }

    return wsgi.PathInfoDispatcher(path_map)
