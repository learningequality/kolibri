"""
# Requirements:
    * Generate access token in your Github account, then create environment variable GITHUB_ACCESS_TOKEN.
        - e.g export GITHUB_ACCESS_TOKEN=1ns3rt-my-t0k3n-h3re.


# Environment Variable/s:
    * GITHUB_ACCESS_TOKEN = Personal access token used to authenticate in your Github account via API.
"""
import logging
import os
from os import listdir

import requests
from github3 import login

logging.getLogger().setLevel(logging.INFO)

ACCESS_TOKEN = os.getenv("GITHUB_ACCESS_TOKEN")
REPO_OWNER = "learningequality"
REPO_NAME = "kolibri"
TAG = os.getenv("BUILDKITE_TAG")

PROJECT_PATH = os.path.join(os.getcwd())

# Python packages artifact location
DIST_DIR = os.path.join(PROJECT_PATH, "dist")

# Manifest of files, keyed by extension
file_manifest = {
    "deb": {
        "extension": "deb",
        "description": "Debian Package",
        "content_type": "application/vnd.debian.binary-package",
    },
    "dmg": {
        "extension": "dmg",
        "description": "Mac Package",
        "content_type": "application/x-apple-diskimage",
    },
    "unsigned-exe": {
        "extension": "exe",
        "description": "Unsigned Windows installer",
        "content_type": "application/x-ms-dos-executable",
    },
    "signed-exe": {
        "extension": "exe",
        "description": "Signed Windows installer",
        "content_type": "application/x-ms-dos-executable",
    },
    "pex": {
        "extension": "pex",
        "description": "Pex file",
        "content_type": "application/octet-stream",
    },
    "whl": {
        "extension": "whl",
        "description": "Whl file",
        "content_type": "application/zip",
    },
    "gz": {
        "extension": "gz",
        "description": "Tar file",
        "content_type": "application/gzip",
    },
    "zip": {
        "extension": "zip",
        "description": "Raspberry Pi Image",
        "content_type": "application/x-zip-compressed",
    },
}

gh = login(token=ACCESS_TOKEN)
repository = gh.repository(REPO_OWNER, REPO_NAME)


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

    for artifact in listdir(DIST_DIR):
        filename, file_extension = os.path.splitext(artifact)
        # Remove leading '.'
        file_extension = file_extension[1:]
        data = {"name": artifact, "file_location": "%s/%s" % (DIST_DIR, artifact)}
        if file_extension == "exe":
            create_exe_data(filename, data)

        if file_extension in file_manifest:
            data.update(file_manifest[file_extension])
            logging.info("Collect file data: (%s)" % data)
            artifacts_dict[file_extension] = data

    # basically the manifest dict, with extra fields
    return artifacts_dict


def upload_gh_release_artifacts(artifacts={}):
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
        for ext, artifact in artifacts.items():
            logging.info("Uploading release asset: %s" % (artifact.get("name")))

            logging.info("Uploading to github")
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
    if TAG:
        artifacts = collect_local_artifacts()
        # Building from a tag, this is probably a release!
        upload_gh_release_artifacts(artifacts)


if __name__ == "__main__":
    main()
