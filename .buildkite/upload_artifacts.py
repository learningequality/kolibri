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
"""
import logging
import os
import sys
from os import listdir

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
    "zip": {
        "extension": "zip",
        "description": "Raspberry Pi Image",
        "category": INSTALLER_CAT,
        "content_type": "application/x-zip-compressed",
    },
    # 'apk': {
    #     'extension': 'apk',
    #     'description': 'Android Installer',
    #     'category': INSTALLER_CAT,
    #     'content_type': 'application/vnd.android.package-archive',
    # },
}

file_order = [
    "deb",
    "zip",
    # "dmg",
    "unsigned-exe",
    "signed-exe",
    # 'apk',
    "pex",
    "whl",
    "gz",
]

gh = login(token=ACCESS_TOKEN)
repository = gh.repository(REPO_OWNER, REPO_NAME)


def create_status_report_html(artifacts):
    """
    Create html page to list build artifacts for linking from github status.
    """
    html = "<html>\n<body>\n<h1>Build Artifacts</h1>\n"
    current_heading = None
    for ext in file_order:
        if ext in artifacts:
            artifact = artifacts[ext]
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

    artifacts_dict = {}

    def create_exe_data(filename, data):
        data_name = "-unsigned"
        if "-signed" in filename:
            data_name = "-signed"
        data_name_exe = data_name[1:] + "-exe"
        data.update(file_manifest[data_name_exe])
        artifacts_dict[data_name_exe] = data

    def create_artifact_data(artifact_dir):
        for artifact in listdir(artifact_dir):
            filename, file_extension = os.path.splitext(artifact)
            # Remove leading '.'
            # print("...>", artifact, "<......")
            file_extension = file_extension[1:]
            data = {
                "name": artifact,
                "file_location": "%s/%s" % (artifact_dir, artifact),
            }
            if file_extension == "exe":
                create_exe_data(filename, data)

            if file_extension in file_manifest:
                data.update(file_manifest[file_extension])
                logging.info("Collect file data: (%s)" % data)
                artifacts_dict[file_extension] = data

    create_artifact_data(DIST_DIR)
    return artifacts_dict


def upload_artifacts():
    """
    Upload the artifacts on the Google Cloud Storage.
    Create a comment on the pull requester with artifact media link.
    """
    client = storage.Client()
    bucket = client.bucket("le-downloads")
    artifacts = collect_local_artifacts()
    is_release = os.getenv("IS_KOLIBRI_RELEASE")
    for file_data in artifacts.values():
        logging.info("Uploading file (%s)" % (file_data.get("name")))
        if is_release:
            blob = bucket.blob(
                "kolibri-%s-%s-%s" % (RELEASE_DIR, BUILD_ID, file_data.get("name"))
            )
        else:
            blob = bucket.blob(
                "kolibri-buildkite-build-%s-%s-%s"
                % (ISSUE_ID, BUILD_ID, file_data.get("name"))
            )
        blob.upload_from_filename(filename=file_data.get("file_location"))
        blob.make_public()
        file_data.update(
            {
                "size_mb": os.path.getsize(file_data.get("file_location")) / 1048576.0,
                "media_url": blob.media_link,
            }
        )

    html = create_status_report_html(artifacts)

    # add count to report html to avoid duplicate.
    report_count = BUILD_ID + "-first"
    if "signed-exe" in artifacts:
        report_count = BUILD_ID + "-second"

    blob = bucket.blob("kolibri-%s-%s-report.html" % (RELEASE_DIR, report_count))

    blob.upload_from_string(html, content_type="text/html")

    blob.make_public()

    create_github_status(blob.public_url)

    if TAG:
        # Building from a tag, this is probably a release!
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
            for file_extension in file_order:
                if file_extension in artifacts:
                    artifact = artifacts[file_extension]
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
                            "Successfully uploaded release asset: %s"
                            % (artifact.get("name"))
                        )
                    else:
                        logging.error(
                            "Error uploading release asset: %s" % (artifact.get("name"))
                        )


def main():
    upload_artifacts()


if __name__ == "__main__":
    main()
