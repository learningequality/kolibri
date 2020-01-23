"""
# Requirements:
    * Generate access token in your Github account, then create environment variable GITHUB_ACCESS_TOKEN.
        - e.g export GITHUB_ACCESS_TOKEN=1ns3rt-my-t0k3n-h3re.

    * Generate a service account key for your Google API credentials, then create environment variable GOOGLE_APPLICATION_CREDENTIALS.
        - e.g export GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json.

# Environment Variable/s:
    * IS_KOLIBRI_RELEASE = Upload artifacts to the Google Cloud as a release candidate.
    * GITHUB_ACCESS_TOKEN = Personal access token used to authenticate in your Github account via API.
    * BUILDKITE_BUILD_NUMBER = Build identifier for each directory created.
    * BUILDKITE_PULL_REQUEST = Pull request issue or the value is false.
    * BUILDKITE_TAG = Tag identifier if this build was built from a tag.
    * BUILDKITE_COMMIT = Git commit hash that the build was made from.
    * GOOGLE_APPLICATION_CREDENTIALS = Your service account key.
    * GCS_UPLOAD_PATH_PREFIX = Prefix for uploads within the `le-buildkite` bucket. Set by the buildkite agent in a hook.
"""
import logging
import os
import sys

import requests
from google.cloud import storage
from github3 import login

logging.getLogger().setLevel(logging.INFO)

ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
REPO_OWNER = "learningequality"
REPO_NAME = "kolibri"
ISSUE_ID = os.getenv("BUILDKITE_PULL_REQUEST")
BUILD_ID = os.getenv("BUILDKITE_BUILD_NUMBER")
TAG = os.getenv("BUILDKITE_TAG")
COMMIT = os.getenv("BUILDKITE_COMMIT")
GCS_UPLOAD_PATH_PREFIX = os.getenv("LE_GCS_UPLOAD_PATH_PREFIX", "")

RELEASE_DIR = "release"
PROJECT_PATH = os.path.join(os.getcwd())

# Python packages artifact location
DIST_DIR = os.path.join(PROJECT_PATH, "dist")

headers = {"Authorization": "token %s" % ACCESS_TOKEN}

INSTALLER_CAT = "Installers"

PYTHON_PKG_CAT = "Python packages"

# Manifest of files, keyed by extension
file_manifest = {
    "deb": {
        "extension": "deb",
        "description": "Debian Package",
        "category": INSTALLER_CAT,
        "content_type": "application/vnd.debian.binary-package",
    },
    "zip": {
        "extension": "zip",
        "description": "Raspberry Pi Image",
        "category": INSTALLER_CAT,
        "content_type": "application/x-zip-compressed",
    },
    "dmg": {
        "extension": "dmg",
        "description": "Mac Package",
        "category": INSTALLER_CAT,
        "content_type": "application/x-apple-diskimage",
    },
    "unsigned-exe": {
        "extension": "exe",
        "description": "Unsigned Windows installer",
        "category": INSTALLER_CAT,
        "content_type": "application/x-ms-dos-executable",
    },
    "signed-exe": {
        "extension": "exe",
        "description": "Signed Windows installer",
        "category": INSTALLER_CAT,
        "content_type": "application/x-ms-dos-executable",
    },
    # 'apk': {
    #     'extension': 'apk',
    #     'description': 'Android Installer',
    #     'category': INSTALLER_CAT,
    #     'content_type': 'application/vnd.android.package-archive',
    # },
    "pex": {
        "extension": "pex",
        "description": "Pex file",
        "category": PYTHON_PKG_CAT,
        "content_type": "application/octet-stream",
    },
    "whl": {
        "extension": "whl",
        "description": "Whl file",
        "category": PYTHON_PKG_CAT,
        "content_type": "application/zip",
    },
    "gz": {
        "extension": "gz",
        "description": "Tar file",
        "category": PYTHON_PKG_CAT,
        "content_type": "application/gzip",
    },
}

gh = login(token=ACCESS_TOKEN)
repository = gh.repository(REPO_OWNER, REPO_NAME)


def create_status_report_html(artifacts):
    """
    Create html page to list build artifacts for linking from github status.
    """
    html = "<html>\n<body>\n<h1>Build Artifacts</h1>\n"
    current_heading = None
    for artifact in artifacts:
        if artifact["category"] != current_heading:
            current_heading = artifact["category"]
            html += "<h2>{heading}</h2>\n".format(heading=current_heading)
        html += "<p>{description}: <a href='{media_url}'>{name}</a> ({size_mb} MB)</p>\n".format(
            **artifact
        )
    html += "</body>\n</html>"
    return html


def create_github_status(report_url):
    """
    Create a github status with a link to the report URL,
    only do this once buildkite has been successful, so only report success here.
    """
    status = repository.create_status(
        COMMIT,
        "success",
        target_url=report_url,
        description="Kolibri Buildkite assets",
        context="buildkite/kolibri/assets",
    )
    if status:
        logging.info("Successfully created Github status for commit %s." % COMMIT)
    else:
        logging.info("Error encounter. Now exiting!")
        sys.exit(1)


def collect_local_artifacts():
    """
    Create a dict of the artifact name and the location.
    """
    # Making a copy for safety
    artifact_dict = file_manifest.copy()
    storage_bucket = storage.Client().bucket("le-buildkite")
    blobs = storage_bucket.list_blobs(None, None, GCS_UPLOAD_PATH_PREFIX)

    def manifest_id(file_name="", file_ext=""):
        filetype = file_ext[1:]
        if filetype == "exe":
            if "-signed" in file_name:
                return "signed-exe"
            return "unsigned-exe"
        return filetype

    # Blobs is an iterator
    for blob in blobs:
        file = os.path.split(blob.name)[1]
        file_id = manifest_id(*os.path.splitext(file))

        if file_id in file_manifest:
            # Add all fields in manifest to dict entry
            logging.info("Collect file data: (%s)" % data)

            artifact_dict.update({
                "name": file,
                "media_url": blob.public_url,
                "content_type": blob.content_type,
                "md5_hash": blob.md5_hash,
                "size_mb": blob.size / 1048576.0,
            })

    artifact_list = []
    for ext, artifact in artifact_dict:
        if artifact["media_url"]:
            artifact_list.append(artifact)

    return artifact_list


def upload_html(html="", artifacts={}):
    client = storage.Client()

    # Maybe upload this via the buildkite CLI tool instead
    bucket = client.bucket("le-downloads")

    # Rather than make 2, just overwrite the existing HTML page to include both
    # # add count to report html to avoid duplicate.
    # report_count = BUILD_ID + "-first"
    # if "signed-exe" in artifacts:
    #     report_count = BUILD_ID + "-second"

    blob = bucket.blob("kolibri-%s-report.html" % (RELEASE_DIR))

    blob.upload_from_string(html, content_type="text/html")

    blob.make_public()

    return blob.public_url


def upload_gh_release_artifacts(artifacts = []):
    # Have to do this with requests because github3 does not support this interface yet
    get_release_asset_url = requests.get(
        "https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}".format(
            owner=REPO_OWNER, repo=REPO_NAME, tag=TAG
        )
    )
    if get_release_asset_url.status_code == 200:
        # Definitely a release!
        release_id = get_release_asset_url.json()["id"]
        release_name = get_release_asset_url.json()["name"]
        release = repository.release(id=release_id)
        logging.info("Uploading built assets to Github Release: %s" % release_name)
        for artifact in artifacts):
            logging.info("Uploading release asset: %s" % (artifact.get("name")))
            # For some reason github3 does not let us set a label at initial upload
            asset = release.upload_asset(
                content_type=artifact["content_type"],
                name=artifact["name"],
                asset=open(artifact["file_location"], "rb"),
            )
            if asset:
                # So do it after the initial upload instead
                asset.edit(artifact["name"], label=artifact["description"])
                logging.info(
                    "Successfully uploaded release asset: %s" % (artifact.get("name"))
                )
            else:
                logging.error(
                    "Error uploading release asset: %s" % (artifact.get("name"))
                )


def main():
    artifacts = collect_local_artifacts()
    html = create_status_report_html(artifacts)
    html_url = upload_html(html)
    create_github_status(html_url)
    if TAG:
        # Building from a tag, this is probably a release!
        upload_gh_release_artifacts(artifacts)


if __name__ == "__main__":
    main()
