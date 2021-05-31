from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import json
import libzim.reader
import logging
import mimetypes
import os
import re
import time
import zipfile
from collections import OrderedDict

import html5lib
from cheroot import wsgi
from django.conf import settings
from django.core.cache import cache
from django.core.handlers.wsgi import WSGIRequest
from django.http import HttpResponse
from django.http import HttpResponseNotAllowed
from django.http import HttpResponseNotFound
from django.http import HttpResponseNotModified
from django.http import HttpResponsePermanentRedirect
from django.http.response import FileResponse
from django.http.response import StreamingHttpResponse
from django.template import Context
from django.template.engine import Engine
from django.utils.cache import patch_response_headers
from django.utils.encoding import force_str
from django.utils.http import http_date

from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.core.content.utils.paths import get_hashi_base_path
from kolibri.core.content.utils.paths import get_hashi_html_filename
from kolibri.core.content.utils.paths import get_hashi_js_filename
from kolibri.core.content.utils.paths import get_hashi_path
from kolibri.core.content.utils.paths import get_zim_content_base_path
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


template_engine = Engine(
    dirs=[os.path.join(os.path.dirname(__file__), "./templates/content")],
    libraries={"zipcontent": "kolibri.core.content.templatetags.zip_content_tags"},
)
h5p_template = template_engine.get_template("h5p.html")
hashi_template = template_engine.get_template("hashi.html")

allowed_methods = set(["GET", "OPTIONS"])


def _hashi_response_from_request(request):
    if request.method not in allowed_methods:
        return HttpResponseNotAllowed(allowed_methods)

    filename = request.path_info.lstrip("/")

    if filename.split(".")[-1] != "html":
        return HttpResponseNotFound()

    if filename != get_hashi_html_filename():
        return HttpResponsePermanentRedirect(get_hashi_path())

    if request.method == "OPTIONS":
        return HttpResponse()

    developer_mode = getattr(settings, "DEVELOPER_MODE", False)

    # if client has a cached version, use that we can safely assume nothing has changed
    # as we provide a unique path per compiled hashi JS file.
    if request.META.get("HTTP_IF_MODIFIED_SINCE") and not developer_mode:
        return HttpResponseNotModified()
    CACHE_KEY = "HASHI_VIEW_RESPONSE_{}".format(get_hashi_html_filename())
    cached_response = cache.get(CACHE_KEY)
    if cached_response is not None and not developer_mode:
        return cached_response

    content = hashi_template.render(
        Context(
            {
                "hashi_file_path": "content/{filename}".format(
                    filename=get_hashi_js_filename()
                )
            }
        )
    )

    response = HttpResponse(content, content_type="text/html")
    response["Content-Length"] = len(response.content)
    response["Last-Modified"] = http_date(time.time())
    patch_response_headers(response, cache_timeout=YEAR_IN_SECONDS)
    cache.set(CACHE_KEY, response, YEAR_IN_SECONDS)
    return response


def get_hashi_view_response(environ):
    request = WSGIRequest(environ)
    response = _hashi_response_from_request(request)
    add_security_headers(request, response)
    return response


def hashi_view(environ, start_response):
    response = get_hashi_view_response(environ)
    return django_response_to_wsgi(response, environ, start_response)


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


def get_h5p(zf):
    file_size = 0
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
        "true" if "-" in [name for name in zf.namelist() if "/" in name][0] else "false"
    )
    main_library_data = [
        lib
        for lib in h5pdata["preloadedDependencies"]
        if lib["machineName"] == h5pdata["mainLibrary"]
    ][0]
    bootstrap_content = h5p_template.render(
        Context(
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
            }
        ),
    )
    content = parse_html(bootstrap_content)
    content_type = "text/html"
    response = HttpResponse(content, content_type=content_type)
    file_size = len(response.content)
    if file_size:
        response["Content-Length"] = file_size
    return response


def get_embedded_file(zipped_path, zipped_filename, embedded_filepath):
    with zipfile.ZipFile(zipped_path) as zf:

        # handle H5P files
        if zipped_path.endswith("h5p") and not embedded_filepath:
            return get_h5p(zf)
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


zip_content_path_regex = re.compile("/(?P<zipped_filename>[^/]+)/(?P<embedded_filepath>.*)")


def get_zipped_file_path(zipped_filename):
    # calculate the local file path to the zip file
    zipped_path = get_content_storage_file_path(zipped_filename)
    # if the zipfile does not exist on disk, return a 404
    if not os.path.exists(zipped_path):
        raise InvalidStorageFilenameError()
    return zipped_path


YEAR_IN_SECONDS = 60 * 60 * 24 * 365


def _zip_content_from_request(request):
    if request.method not in allowed_methods:
        return HttpResponseNotAllowed(allowed_methods)

    match = zip_content_path_regex.match(request.path_info)
    if match is None:
        return HttpResponseNotFound("Path not found")

    if request.method == "OPTIONS":
        return HttpResponse()

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


zim_content_path_regex = re.compile("/(?P<zim_filename>[^/]+)/(?P<zim_path>.*)")


def get_zim_content_response(zim_filename, zim_path):
    zim_file = libzim.reader.File(zim_filename)
    zim_article = zim_file.get_article(zim_path)
    # TODO: It would be better to use StreamingHttpResponse or FileResponse
    #       here. We are copying the entire file for now for simplicity since
    #       we may use a different Zim implementation in the near future.
    response = HttpResponse()
    response.write(zim_article.content.tobytes())
    response["Content-Length"] = zim_article.content.nbytes
    return response


def _zim_content_from_request(request):
    if request.method not in allowed_methods:
        return HttpResponseNotAllowed(allowed_methods)

    match = zim_content_path_regex.match(request.path_info)
    if match is None:
        return HttpResponseNotFound("Path not found")

    if request.method == "OPTIONS":
        return HttpResponse()

    zim_filename, zim_path = match.groups()

    if request.META.get("HTTP_IF_MODIFIED_SINCE"):
        return HttpResponseNotModified()

    response = get_zim_content_response(zim_filename, zim_path)

    # ensure the browser knows not to try byte-range requests, as we don't support them here
    response["Accept-Ranges"] = "none"

    response["Last-Modified"] = http_date(time.time())

    patch_response_headers(response, cache_timeout=YEAR_IN_SECONDS)

    return response


def generate_zim_content_response(environ):
    request = WSGIRequest(environ)
    response = _zim_content_from_request(request)
    add_security_headers(request, response)
    return response


def zim_content_view(environ, start_response):
    """
    Handles GET requests and serves content from within the zim file.
    """
    response = generate_zim_content_response(environ)

    return django_response_to_wsgi(response, environ, start_response)


def get_application():
    path_map = {
        get_hashi_base_path(): hashi_view,
        get_zip_content_base_path(): zip_content_view,
        get_zim_content_base_path(): zim_content_view,
    }

    return wsgi.PathInfoDispatcher(path_map)
