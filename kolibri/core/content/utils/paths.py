import io
import os
import re

from django.conf import settings
from django.utils.http import urlencode
from six.moves.urllib.parse import urljoin

from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.utils import conf
from kolibri.utils.server import get_zip_port


# valid storage filenames consist of 32-char hex plus a file extension
VALID_STORAGE_FILENAME = re.compile(r"[0-9a-f]{32}(-data)?\.[0-9a-z]+")


def _maybe_makedirs(path):
    if not os.path.isdir(path):
        try:
            os.makedirs(path)
        # When importing from USB etc, it does not need to create
        # directories under external drives that are not writable.
        except OSError:
            pass


def get_attribute(obj, key):
    """
    Get an attribute from an object, regardless of whether it is a dict or an object
    """
    if not isinstance(obj, dict):
        return getattr(obj, key)
    return obj[key]


def get_content_file_name(obj):
    return "{checksum}.{extension}".format(
        checksum=get_attribute(obj, "id"), extension=get_attribute(obj, "extension")
    )


def get_local_content_storage_file_url(obj):
    """
    Return a url for the client side to retrieve the content file.
    The same url will also be exposed by the file serializer.
    """
    if get_attribute(obj, "available"):
        filename = get_content_file_name(obj)
        return "/{}{}/{}/{}".format(
            get_content_storage_url(
                conf.OPTIONS["Deployment"]["URL_PATH_PREFIX"]
            ).lstrip("/"),
            filename[0],
            filename[1],
            filename,
        )
    return None


# DISK PATHS


def get_content_dir_path(datafolder=None, contentfolder=None):
    if contentfolder:
        return contentfolder
    if datafolder:
        return os.path.join(datafolder, "content")
    return conf.OPTIONS["Paths"]["CONTENT_DIR"]


def get_content_fallback_paths():
    paths = []
    fallback_dirs = conf.OPTIONS["Paths"]["CONTENT_FALLBACK_DIRS"]
    for path in fallback_dirs:
        path = path.strip()
        if not path:
            continue
        paths.append(path)
    return paths


def get_all_content_dir_paths():
    return [get_content_dir_path()] + get_content_fallback_paths()


def existing_file_path_in_content_fallback_dirs(subpath):
    # see whether the file exists in any of our content fallback directories
    for prefix in get_content_fallback_paths():
        path = os.path.join(prefix, subpath)
        if os.path.exists(path):
            return path
    # if not, return None
    return None


def get_content_database_dir_path(datafolder=None, contentfolder=None):
    """
    Returns the path to the content sqlite databases
    ($HOME/.kolibri/content/databases on POSIX systems, by default)
    """
    path = os.path.join(
        get_content_dir_path(datafolder=datafolder, contentfolder=contentfolder),
        "databases",
    )
    _maybe_makedirs(path)
    return path


def get_content_database_file_path(channel_id, datafolder=None, contentfolder=None):
    """
    Given a channel_id, returns the path to the sqlite3 file
    ($HOME/.kolibri/content/databases/<channel_id>.sqlite3 on POSIX systems, by default)
    """
    suffix = "{}.sqlite3".format(channel_id)
    primary_path = os.path.join(
        get_content_database_dir_path(
            datafolder=datafolder, contentfolder=contentfolder
        ),
        suffix,
    )
    # if the primary path already exists, or the datafolder/contentfolder is overridden, use the primary path
    if (
        os.path.exists(primary_path)
        or datafolder is not None
        or contentfolder is not None
    ):
        return primary_path
    backup_path = existing_file_path_in_content_fallback_dirs(
        os.path.join("databases", suffix)
    )
    # return backup path if one exists; otherwise, return primary path (even though it doesn't exist yet)
    return backup_path or primary_path


def get_upgrade_content_database_file_path(
    channel_id, datafolder=None, contentfolder=None
):
    return os.path.join(
        get_content_database_dir_path(
            datafolder=datafolder, contentfolder=contentfolder
        ),
        "{}-upgrade.sqlite3".format(channel_id),
    )


def get_annotated_content_database_file_path(
    channel_id, datafolder=None, contentfolder=None
):
    return os.path.join(
        get_content_database_dir_path(
            datafolder=datafolder, contentfolder=contentfolder
        ),
        "{}-annotated.sqlite3".format(channel_id),
    )


def get_content_storage_dir_path(datafolder=None, contentfolder=None):
    path = os.path.join(
        get_content_dir_path(datafolder=datafolder, contentfolder=contentfolder),
        "storage",
    )
    _maybe_makedirs(path)
    return path


def get_content_storage_file_path(filename, datafolder=None, contentfolder=None):
    if not VALID_STORAGE_FILENAME.match(filename):
        raise InvalidStorageFilenameError(
            "'{}' is not a valid content storage filename".format(filename)
        )
    suffix = os.path.join(filename[0], filename[1], filename)
    primary_path = os.path.join(
        get_content_storage_dir_path(
            datafolder=datafolder, contentfolder=contentfolder
        ),
        suffix,
    )
    # if the primary path already exists, or the datapath is overridden, use the primary path
    if (
        os.path.exists(primary_path)
        or datafolder is not None
        or contentfolder is not None
    ):
        return primary_path
    backup_path = existing_file_path_in_content_fallback_dirs(
        os.path.join("storage", suffix)
    )
    # return backup path if one exists; otherwise, return the primary path (even though it doesn't exist yet)
    return backup_path or primary_path


def using_remote_storage():
    return conf.OPTIONS["Deployment"]["REMOTE_CONTENT"]


# URL PATHS


def get_content_url(baseurl=None):
    return get_content_server_url("content/", baseurl=baseurl)


def get_content_database_url(baseurl=None):
    return urljoin(get_content_url(baseurl), "databases/")


def get_content_database_file_url(channel_id, baseurl=None):
    return urljoin(get_content_database_url(baseurl), "{}.sqlite3".format(channel_id))


def get_content_storage_url(baseurl=None):
    return urljoin(get_content_url(baseurl), "storage/")


def get_content_storage_remote_url(filename, baseurl=None):
    return "{}{}/{}/{}".format(
        get_content_storage_url(baseurl), filename[0], filename[1], filename
    )


def get_content_server_url(path, baseurl=None):
    if not baseurl:
        baseurl = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
    return urljoin(baseurl, path)


def get_info_url(baseurl=None):
    return get_content_server_url("/api/public/info", baseurl=baseurl)


def get_channel_lookup_url(
    version="1", identifier=None, baseurl=None, keyword=None, language=None
):
    content_server_path = "/api/public/v{}/channels".format(version)
    if identifier:
        content_server_path += "/lookup/{}".format(identifier)
    content_server_path += "?"
    query_params = {}
    if keyword:
        query_params["keyword"] = keyword
    if language:
        query_params["language"] = language
    content_server_path += urlencode(query_params)

    return get_content_server_url(content_server_path, baseurl=baseurl)


def get_file_checksums_url(channel_id, baseurl, version="1"):
    # This endpoint does not exist on Studio, so a baseurl is required.
    return get_content_server_url(
        "/api/public/v{version}/file_checksums/{channel_id}".format(
            version=version, channel_id=channel_id
        ),
        baseurl=baseurl,
    )


HASHI = "hashi/"

ZIPCONTENT = "zipcontent/"


def get_zip_content_config():
    zip_content_origin = conf.OPTIONS["Deployment"]["ZIP_CONTENT_ORIGIN"]
    if not zip_content_origin:
        zip_content_port = str(
            get_zip_port() or conf.OPTIONS["Deployment"]["ZIP_CONTENT_PORT"]
        )
    elif type(zip_content_origin) is int:
        zip_content_port = str(zip_content_origin)
        zip_content_origin = ""
    else:
        zip_content_port = ""
    return zip_content_origin, zip_content_port


def zip_content_path_prefix():
    path_prefix = conf.OPTIONS["Deployment"]["ZIP_CONTENT_URL_PATH_PREFIX"]

    if path_prefix != "/":
        path_prefix = "/" + path_prefix
    return path_prefix


def get_zip_content_base_path():
    return "{}{}".format(get_content_url(zip_content_path_prefix()), ZIPCONTENT)


HASHI_FILENAME = None


def get_hashi_html_filename():
    global HASHI_FILENAME
    if HASHI_FILENAME is None or getattr(settings, "DEVELOPER_MODE", None):
        with io.open(
            os.path.join(os.path.dirname(__file__), "../build/hashi_filename"),
            mode="r",
            encoding="utf-8",
        ) as f:
            HASHI_FILENAME = f.read().strip()
    return HASHI_FILENAME


def zip_content_static_root():
    return urljoin(get_content_url(zip_content_path_prefix()), "static/")


def get_hashi_path():
    return "{}{}{}".format(zip_content_static_root(), HASHI, get_hashi_html_filename())
