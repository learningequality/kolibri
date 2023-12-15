import logging
import os
import platform
import sys

from kolibri.utils.compat import monkey_patch_collections
from kolibri.utils.compat import monkey_patch_translation


def settings_module():
    from .build_config.default_settings import settings_path

    return settings_path


# Enumerate all the environment variables that are used in Kolibri, and describe
# their usage. Optionally provide a default value as a callback function, to set as
# a default if the environment variable is not set.
ENVIRONMENT_VARIABLES = {
    "DJANGO_SETTINGS_MODULE": {
        "default": settings_module,
        "description": "The Django settings module to use.",
    },
    "KOLIBRI_HOME": {
        "default": lambda: os.path.join(os.path.expanduser("~"), ".kolibri"),
        "description": "The base directory for the Kolibri installation.",
    },
    "KOLIBRI_NO_FILE_BASED_LOGGING": {
        "description": "Disable file-based logging.",
    },
    "KOLIBRI_APK_VERSION_NAME": {
        "description": "Version name for the Kolibri APK (Android Installer)",
    },
    "LISTEN_PID": {
        "description": """
            The PID of the process to listen for signals from -
            used to detect whether running under socket activation under Debian.
        """,
    },
    "KOLIBRI_DISABLE_REQUEST_LOGGING": {
        "description": """
            Disable request logging. Set the variable to True/False to turn off/on
            cherrypy.access logs.
        """,
    },
    "NOTIFY_SOCKET": {
        "description": """
            Path to a socket provided by systemd for sending it notifications
            about daemon state, particularly for startup and shutdown. If
            Kolibri is not running under systemd this should be unset.
            See the sd_notify(3) man page for more details.
        """,
    },
}


def prepend_cext_path(dist_path):
    """
    Calculate the directory of C extensions and add it to sys.path if exists.
    Return True if C extensions are available for this platform.
    Return False if no C extensions are available for this platform.
    """

    python_version = "cp" + str(sys.version_info.major) + str(sys.version_info.minor)
    system_name = platform.system()
    machine_name = platform.machine()
    dirname = os.path.join(dist_path, "cext", python_version, system_name)
    abi3_dirname = os.path.join(dist_path, "cext", "abi3", system_name, machine_name)

    dirname = os.path.join(dirname, machine_name)
    noarch_dir = os.path.join(dist_path, "cext")
    if os.path.exists(abi3_dirname):
        sys.path = [str(abi3_dirname)] + sys.path

    if os.path.exists(dirname):
        # If the directory of platform-specific cextensions (cryptography) exists,
        # add it + the matching noarch (OpenSSL) modules to sys.path
        sys.path = [str(dirname), str(noarch_dir)] + sys.path
    else:
        logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
        logging.StreamHandler(sys.stdout)
        logger = logging.getLogger("env")
        logger.debug("No C extensions are available for this platform")


def set_env():
    """
    Sets the Kolibri environment for the CLI or other application worker
    manager.

    Do this before importing anything else, we need to add bundled requirements
    from the distributed version in case it exists before importing anything
    else.
    """
    from kolibri import dist as kolibri_dist  # noqa

    monkey_patch_collections()

    monkey_patch_translation()

    sys.path = [os.path.realpath(os.path.dirname(kolibri_dist.__file__))] + sys.path

    # Add path for c extensions to sys.path
    prepend_cext_path(os.path.realpath(os.path.dirname(kolibri_dist.__file__)))

    # Set default env
    for key, value in ENVIRONMENT_VARIABLES.items():
        if "default" in value:
            os.environ.setdefault(key, value["default"]())
