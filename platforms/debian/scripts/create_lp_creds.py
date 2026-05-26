#!/usr/bin/env python3
"""One-time Launchpad credential generation helper.

Usage:
  1. Install launchpadlib: pip install launchpadlib
  2. Run this script: python3 scripts/create_lp_creds.py
  3. Approve in the browser when prompted.
  4. Copy the content of the generated credentials file.
  5. In GitHub: repo → Settings → Secrets and variables → Actions → New repository secret:
     Name: LP_CREDENTIALS
     Value: <paste credentials file content>

The APP_NAME must match the one used in scripts/launchpad_copy.py.
"""

import os

from launchpadlib.launchpad import Launchpad

APP_NAME = "ppa-kolibri-source-copy-packages"

CREDS_FILE = os.environ.get("LP_CREDENTIALS_FILE", "launchpad.credentials")

if __name__ == "__main__":
    Launchpad.login_with(APP_NAME, "production", credentials_file=CREDS_FILE)
    print(f"Credentials saved to: {CREDS_FILE}")
