import os

from google.oauth2 import service_account
from googleapiclient.discovery import build


SCOPES = ["https://www.googleapis.com/auth/sqlservice.admin"]


def package_name():
    return os.environ.get("PACKAGE_NAME", "org.learningequality.Kolibri")


def _get_credentials():
    if "SERVICE_ACCOUNT_FILE" not in os.environ:
        raise RuntimeError("SERVICE_ACCOUNT_FILE environment variable not set.")

    SERVICE_ACCOUNT_FILE = os.path.expanduser(os.environ["SERVICE_ACCOUNT_FILE"])

    if "SERVICE_ACCOUNT_EMAIL" not in os.environ:
        raise RuntimeError("SERVICE_ACCOUNT_EMAIL environment variable not set.")

    SERVICE_ACCOUNT_EMAIL = os.environ["SERVICE_ACCOUNT_EMAIL"]
    return service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES, subject=SERVICE_ACCOUNT_EMAIL
    )


def _get_service():
    return build("androidpublisher", "v3", credentials=_get_credentials())


def _create_edit(service):
    return service.edits().insert(body={}, packageName=package_name()).execute()["id"]


def get_latest_version_code():
    service = _get_service()
    edit_id = _create_edit(service)
    tracks = (
        service.edits()
        .tracks()
        .list(editId=edit_id, packageName=package_name())
        .execute()["tracks"]
    )
    versionCode = 0
    for track in tracks:
        for release in track["releases"]:
            for vc in release.get("versionCodes", []):
                versionCode = max(versionCode, int(vc))
    # Clean up after ourselves!
    service.edits().delete(editId=edit_id, packageName=package_name()).execute()
    if versionCode == 0:
        raise RuntimeError(
            "No version code found - unless this app has never been released before, this is indicative of an error."
        )
    return versionCode
