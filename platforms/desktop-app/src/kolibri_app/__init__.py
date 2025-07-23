import os
import sys

from kolibri_app.constants import MAC
from kolibri_app.constants import WINDOWS

__version__ = "0.4.4"

os.environ["KOLIBRI_INSTALLER_VERSION"] = __version__

# If on Windows and KOLIBRI_HOME is not already set externally...
if WINDOWS and "KOLIBRI_HOME" not in os.environ:
    # Check if we are running in a PyInstaller bundle.
    is_frozen = getattr(sys, "frozen", False)

    if is_frozen:
        # PRODUCTION: In a packaged app, use the system-wide ProgramData folder.
        # This assumes an installer has set the correct permissions.
        program_data_dir = os.environ.get("PROGRAMDATA", "C:\\ProgramData")
        kolibri_home_path = os.path.join(program_data_dir, "kolibri")
        os.environ["KOLIBRI_HOME"] = kolibri_home_path
    else:
        # DEVELOPMENT: Running from source, use a local folder in the user's home directory.
        # This is always writable and avoids permission issues.
        user_home_dir = os.path.expanduser("~")
        kolibri_home_path = os.path.join(user_home_dir, ".kolibri")
        os.environ["KOLIBRI_HOME"] = kolibri_home_path

if MAC:
    os.environ["KOLIBRI_INSTALLATION_TYPE"] = "mac"

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.django_app_settings"
