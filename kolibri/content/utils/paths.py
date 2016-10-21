import os
import re

from django.conf import settings
from django.core.urlresolvers import reverse

try:
    from urlparse import urljoin
except ImportError:
    from urllib.parse import urljoin


# valid storage filenames consist of 32-char hex plus a file extension
VALID_STORAGE_FILENAME = re.compile("[0-9a-f]{32}(-data)?\.[0-9a-z]+")

# set of file extensions that should be considered zip files and allow access to internal files
POSSIBLE_ZIPPED_FILE_EXTENSIONS = set([".perseus", ".zip", ".epub", ".epub3"])


# DISK PATHS

def get_content_folder_path(datafolder):
    return os.path.join(
        datafolder,
        "content",
    )

def get_content_database_folder_path(datafolder=None):
    return os.path.join(
        get_content_folder_path(datafolder),
        "databases",
    ) if datafolder else settings.CONTENT_DATABASE_DIR

def get_content_database_file_path(channel_id, datafolder=None):
    return os.path.join(
        get_content_database_folder_path(datafolder),
        "{}.sqlite3".format(channel_id),
    )

def get_content_storage_folder_path(datafolder=None):
    return os.path.join(
        get_content_folder_path(datafolder),
        "storage",
    ) if datafolder else settings.CONTENT_STORAGE_DIR

def get_content_storage_file_path(filename, datafolder=None):
    assert VALID_STORAGE_FILENAME.match(filename), "'{}' is not a valid content storage filename".format(filename)
    return os.path.join(
        get_content_storage_folder_path(datafolder),
        filename[0],
        filename[1],
        filename,
    )


# URL PATHS

def get_content_url(baseurl=None):
    return urljoin(
        baseurl or settings.CENTRAL_CONTENT_DOWNLOAD_BASE_URL,
        "content/",
    )

def get_content_database_url(baseurl=None):
    return urljoin(
        get_content_url(baseurl),
        "databases/",
    )

def get_content_database_file_url(channel_id, baseurl=None):
    return urljoin(
        get_content_database_url(baseurl),
        "{}.sqlite3".format(channel_id),
    )

def get_content_storage_url(baseurl=None):
    return urljoin(
        get_content_url(baseurl),
        "storage/",
    )

def get_content_storage_remote_url(filename, baseurl=None):
    return "{}{}/{}/{}".format(get_content_storage_url(baseurl), filename[0], filename[1], filename)


def get_content_storage_file_url(filename, baseurl=None):
    """
    Return the URL at which the specified file can be accessed. For regular files, this is a link to the static
    file itself, under "/content/storage/". For "zip" files, this points to a dynamically generated view that
    allows the client-side to index into the files within the zip.
    """
    ext = os.path.splitext(filename)[1]
    if ext in POSSIBLE_ZIPPED_FILE_EXTENSIONS:
        return reverse("zipcontent", kwargs={"zipped_filename": filename, "embedded_filepath": ""})
    else:
        return "{}{}/{}/{}".format(get_content_storage_url(baseurl), filename[0], filename[1], filename)
