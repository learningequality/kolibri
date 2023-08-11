import glob
import json
import os
import sys
import time

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


SCOPES = ["https://www.googleapis.com/auth/sqlservice.admin"]


def package_name():
    return os.environ.get("PACKAGE_NAME", "org.learningequality.Kolibri")


def _get_credentials():
    if "SERVICE_ACCOUNT_JSON" not in os.environ:
        raise RuntimeError("SERVICE_ACCOUNT_JSON environment variable not set.")

    try:
        SERVICE_ACCOUNT_JSON = json.loads(os.environ["SERVICE_ACCOUNT_JSON"])
    except ValueError:
        raise RuntimeError(
            "SERVICE_ACCOUNT_JSON environment variable is not valid JSON."
        )

    return service_account.Credentials.from_service_account_info(
        SERVICE_ACCOUNT_JSON, scopes=SCOPES
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


def upload_dist_aab():
    from version import apk_version

    service = _get_service()
    edit_id = _create_edit(service)
    aabs = glob.glob(
        os.path.join(
            os.path.dirname(__file__),
            "../dist/*.aab",
        )
    )
    if len(aabs) != 1:
        raise RuntimeError(
            "Expected exactly one aab file in dist, found {}".format(len(aabs))
        )
    aab_path = aabs[0]
    bundle_upload = (
        service.edits()
        .bundles()
        .upload(editId=edit_id, packageName=package_name(), media_body=aab_path)
        .execute()
    )

    versionCode = bundle_upload["versionCode"]

    print("AAB with version code: {} successfully uploaded".format(versionCode))

    # Assign APK to closed testing track.
    track_response = (
        service.edits()
        .tracks()
        .update(
            editId=edit_id,
            track="internal",
            packageName=package_name(),
            body={
                "releases": [
                    {
                        "name": apk_version(),
                        "versionCodes": [versionCode],
                        "status": "completed",
                    }
                ]
            },
        )
        .execute()
    )

    print(
        "Track {} is set with releases: {}".format(
            track_response["track"], str(track_response["releases"])
        )
    )

    # Commit changes for edit.
    commit_request = (
        service.edits().commit(editId=edit_id, packageName=package_name()).execute()
    )

    print("Edit id {} has been committed".format(commit_request["id"]))

    universal_apk_id = None
    while universal_apk_id is None:
        try:
            generated_apk_response = (
                service.generatedapks()
                .list(packageName=package_name(), versionCode=versionCode)
                .execute()
            )

            universal_apk_id = generated_apk_response["generatedApks"][0][
                "generatedUniversalApk"
            ]["downloadId"]
        except (HttpError, IndexError, KeyError):
            print("Waiting for universal APK to be generated...")
            time.sleep(15)
            continue

    print("Universal APK generated with download ID: {}".format(universal_apk_id))

    # Download the universal APK.
    download = (
        service.generatedapks()
        .download(
            packageName=package_name(),
            versionCode=versionCode,
            downloadId=universal_apk_id,
        )
        .execute()
    )

    filename = "kolibri-{}-release-universal.apk".format(apk_version())

    filepath = os.path.join(os.path.dirname(__file__), "../dist", filename)

    with open(filepath, "wb") as f:
        f.write(download)

    print("Universal APK downloaded to {}".format(filepath))


if __name__ == "__main__":
    if sys.argv[1] == "upload":
        upload_dist_aab()
    else:
        raise RuntimeError("Unknown command {}".format(sys.argv[1]))
