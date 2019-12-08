import os
import re

from django.core.urlresolvers import reverse
from django.utils.http import urlencode
from six.moves.urllib.parse import urljoin

from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.utils import conf


# valid storage filenames consist of 32-char hex plus a file extension
VALID_STORAGE_FILENAME = re.compile(r"[0-9a-f]{32}(-data)?\.[0-9a-z]+")

# set of file extensions that should be considered zip files and allow access to internal files
POSSIBLE_ZIPPED_FILE_EXTENSIONS = set([".perseus", ".zip", ".h5p"])
# TODO: add ".epub" and ".epub3" if epub-equivalent of ZipContentView implemented


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
        return get_content_storage_file_url(
            filename=get_content_file_name(obj),
            baseurl=conf.OPTIONS["Deployment"]["URL_PATH_PREFIX"],
        )
    else:
        return None


# DISK PATHS


def get_content_dir_path(datafolder=None):
    return (
        os.path.join(datafolder, "content")
        if datafolder
        else conf.OPTIONS["Paths"]["CONTENT_DIR"]
    )


def get_content_database_dir_path(datafolder=None):
    """
    Returns the path to the content sqlite databases
    ($HOME/.kolibri/content/databases on POSIX systems, by default)
    """
    path = os.path.join(get_content_dir_path(datafolder), "databases")
    if not os.path.isdir(path):
        try:
            os.makedirs(path)
        # When importing from USB, it does not need to create a database
        # directory under the external drives that are not writable.
        except OSError:
            pass
    return path


def get_content_database_file_path(channel_id, datafolder=None):
    """
    Given a channel_id, returns the path to the sqlite3 file
    ($HOME/.kolibri/content/databases/<channel_id>.sqlite3 on POSIX systems, by default)
    """
    return os.path.join(
        get_content_database_dir_path(datafolder), "{}.sqlite3".format(channel_id)
    )


def get_upgrade_content_database_file_path(channel_id, datafolder=None):
    return os.path.join(
        get_content_database_dir_path(datafolder),
        "{}-upgrade.sqlite3".format(channel_id),
    )


def get_annotated_content_database_file_path(channel_id, datafolder=None):
    return os.path.join(
        get_content_database_dir_path(datafolder),
        "{}-annotated.sqlite3".format(channel_id),
    )


def get_content_storage_dir_path(datafolder=None):
    path = os.path.join(get_content_dir_path(datafolder), "storage")
    if not os.path.isdir(path):
        os.makedirs(path)
    return path


def get_content_storage_file_path(filename, datafolder=None):
    if not VALID_STORAGE_FILENAME.match(filename):
        raise InvalidStorageFilenameError(
            "'{}' is not a valid content storage filename".format(filename)
        )
    return os.path.join(
        get_content_storage_dir_path(datafolder), filename[0], filename[1], filename
    )


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


def get_content_storage_file_url(filename, baseurl=None):
    """
    Return the URL at which the specified file can be accessed. For regular files, this is a link to the static
    file itself, under "/content/storage/". For "zip" files, this points to a dynamically generated view that
    allows the client-side to index into the files within the zip.
    """
    ext = os.path.splitext(filename)[1]
    if ext in POSSIBLE_ZIPPED_FILE_EXTENSIONS:
        return reverse(
            "kolibri:core:zipcontent",
            kwargs={"zipped_filename": filename, "embedded_filepath": ""},
        )
    else:
        return "/{}{}/{}/{}".format(
            get_content_storage_url(baseurl).lstrip("/"),
            filename[0],
            filename[1],
            filename,
        )
