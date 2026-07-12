import os

from launchpadlib.launchpad import Launchpad

# 1) One-time: generate credentials locally
# Install launchpadlib:
# pip install launchpadlib
# Run this script to generate credentials
# Approve in the browser. Confirm the file is written at CREDS_FILE.

# 2) Save the credentials in GitHub Actions
# Open the credentials file and copy its full content.
# GitHub → repo → Settings → Secrets and variables → Actions → New repository secret:
# Name: LP_CREDENTIALS
# Paste the credentials file content.


# Exact APP name should be passed in build workflow
# Launchpad.login_with(application_name="APP_NAME", ...)
APP_NAME = "ppa-kolibri-server-jammy-package"


CREDS_FILE = os.environ.get("LP_CREDENTIALS_FILE", "launchpad.credentials")


Launchpad.login_with(APP_NAME, "production", credentials_file=CREDS_FILE)
print(f"Credentials saved to: {CREDS_FILE}")
