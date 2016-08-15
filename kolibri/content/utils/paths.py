import os

from django.conf import settings

try:
    from urlparse import urljoin
except ImportError:
    from urllib.parse import urljoin


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

def get_content_storage_file_url(filename, baseurl=None):
    return "{}{}/{}/{}".format(get_content_storage_url(baseurl), filename[0], filename[1], filename)
