import json
import requests
import os
import sys
import logging

from os import listdir
from gcloud import storage
import subprocess

logging.getLogger().setLevel(logging.INFO)

USERNAME = os.getenv("GITHUB_USERNAME")
PASSWORD = os.getenv('GITHUB_PASSWORD')
REPO_OWNER = "learningequality"
REPO_NAME = "kolibri"
ISSUE_ID = os.getenv("BUILDKITE_PULL_REQUEST")

RELEASE_DIR = 'release'
PROJECT_PATH = os.path.join(os.getcwd())

# Python packages artifact location
DIST_DIR = os.path.join(PROJECT_PATH, "dist")

# Installer artifact location
INSTALLER_DIR = os.path.join(PROJECT_PATH, "installer")


def create_github_comment(artifacts):
    """Create an comment on github.com using the given dict."""
    url = 'https://api.github.com/repos/%s/%s/issues/%s/comments' % (REPO_OWNER, REPO_NAME, ISSUE_ID)
    session = requests.Session()
    exe_file, exe_url = None, None
    pex_file, pex_url = None, None
    whl_file, whl_url = None, None
    zip_file, zip_url = None, None
    tar_gz_file, tar_gz_url = None, None
    for file_data in artifacts:
        if file_data.get("name").endswith(".exe"):
            exe_file = file_data.get("name")
            exe_url = file_data.get("media_url")
        if file_data.get("name").endswith(".pex"):
            pex_file = file_data.get("name")
            pex_url = file_data.get("media_url")
        if file_data.get("name").endswith(".whl"):
            whl_file = file_data.get("name")
            whl_url = file_data.get("media_url")
        if file_data.get("name").endswith(".zip"):
            zip_file = file_data.get("name")
            zip_url = file_data.get("media_url")
        if file_data.get("name").endswith(".tar.gz"):
            tar_gz_file = file_data.get("name")
            tar_gz_url = file_data.get("media_url")
    comment_message = {'body':
                           "## Build Artifacts\r\n"
                           "**Kolibri Installers**\r\n"
                           "Windows Installer: [%s](%s)\r\n\r\n"
                           # "Mac Installer: Mac.dmg\r\n"
                           # "Debian Installer: Debian.deb\r\n\r\n"
        
                           "**Python packages**\r\n"
                           "Pex: [%s](%s)\r\n"
                           "Whl file: [%s](%s)\r\n"
                           "Zip file: [%s](%s)\r\n"
                           "Tar file: [%s](%s)\r\n"
                           % (exe_file, exe_url, pex_file, pex_url, whl_file, whl_url, zip_file, zip_url,
                              tar_gz_file, tar_gz_url)}
    
    r = session.post(url, json.dumps(comment_message), auth=(REPO_OWNER, PASSWORD))
    if r.status_code == 201:
        logging.info('Successfully created Github comment(%s).' % url)
    else:
        logging.info('Could not create Github comment. Now exiting!')
        sys.exit(1)


def collect_local_artifacts():
    """
    Create a dict of the artifact name and the location.
    """
    artifacts_dict = []
    def create_artifact_data(artifact_dir):
        for artifact in listdir(artifact_dir):
            data = {"name": artifact,
                    "file_location": "%s/%s" % (artifact_dir, artifact)}
            logging.info("Collect file data: (%s)" % data)
            artifacts_dict.append(data)
    create_artifact_data(DIST_DIR)   
    create_artifact_data(INSTALLER_DIR)     
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
    build_id = os.getenv("BUILDKITE_BUILD_NUMBER")
    if os.getenv("BUILDKITE_PULL_REQUEST") != "false":
        build_id = ISSUE_ID
    for file_data in artifacts:
        logging.info("Uploading file (%s)" % (file_data.get("name")))
        if is_release:
            blob = bucket.blob('kolibri/%s/%s' % (RELEASE_DIR, file_data.get("name")))
        else:
            blob = bucket.blob('kolibri/buildkite/build-%s/%s' % (build_id, file_data.get("name")))
        blob.upload_from_filename(filename=file_data.get("file_location"))
        blob.make_public()
        file_data.update({'media_url': blob.media_link})
    
    if os.getenv("BUILDKITE_PULL_REQUEST") != "false":
        create_github_comment(artifacts)


def main():
    upload_artifacts()


if __name__ == "__main__":
    main()

