import logging
import os
import platform
import sys


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
    "KOLIBRI_NO_C_EXTENSIONS": {
        "description": "Disable C extensions.",
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
    "KOLIBRI_PLUGIN_APPLY": {
        "description": """
            A comma-separated list of plugins to apply. If this variable is set,
            only the specified plugins will be applied.
        """,
    },
    "KOLIBRI_PLUGIN_ENABLE": {
        "description": """
            A comma-separated list of plugins to enable. If this variable is set,
            the specified plugins will be enabled, overriding plugins disabled via the CLI.
        """,
    },
    "KOLIBRI_PLUGIN_DISABLE": {
        "description": """
            A comma-separated list of plugins to disable. If this variable is set,
            the specified plugins will be disabled, overriding plugins enabled via the CLI.
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

    arch_dirname = os.path.join(dirname, machine_name)
    noarch_dir = os.path.join(dist_path, "cext")
    abi3_dir_exists = os.path.exists(abi3_dirname)
    arch_dir_exists = os.path.exists(arch_dirname)
    # If either the abi3 or arch directory exists, add the noarch directory to sys.path
    if abi3_dir_exists or arch_dir_exists:
        # Add the noarch (OpenSSL) modules to sys.path
        sys.path = [str(noarch_dir)] + sys.path

    if abi3_dir_exists:
        sys.path = [str(abi3_dirname)] + sys.path
    if arch_dir_exists:
        # If the directory of platform-specific cextensions (cryptography) exists,
        sys.path = [str(arch_dirname)] + sys.path
    else:
        logging.basicConfig(format="%(levelname)s: %(message)s", level=logging.INFO)
        logging.StreamHandler(sys.stdout)
        logger = logging.getLogger("env")
        logger.debug("No C extensions are available for this platform")


def monkey_patch_markdown():
    """
    Monkey patch markdown module into module cache to set to None.
    This is to avoid a bug caused by newer versions of markdown that causes
    a crash during the attempted optional import of markdown in DRF.
    """
    # TODO: rtibbles remove this once we upgrade to a newer version of Django REST Framework
    # that doesn't have this issue.
    sys.modules["markdown"] = None


def monkey_patch_distutils():
    """
    Monkey patch distutils module which has been removed in Python 3.12, but is still relied
    upon by the version of redis we are using, this points to a dummy module that exposes the
    single import from distutils.version that is used by redis.
    """
    if sys.version_info >= (3, 12):
        from importlib import import_module

        module = import_module("kolibri.utils.dummy_distutils_version")
        sys.modules["distutils.version"] = module


def forward_port_cgi_module():
    """
    Forward ports the required parts of the removed cgi module.
    This can be removed when we upgrade to a version of Django that is Python 3.13 compatible.
    """
    if sys.version_info < (3, 13):
        return
    from importlib import import_module

    module = import_module("kolibri.utils.compat_cgi")
    sys.modules["cgi"] = module


def set_env():
    """
    Sets the Kolibri environment for the CLI or other application worker
    manager.

    Do this before importing anything else, we need to add bundled requirements
    from the distributed version in case it exists before importing anything
    else.
    """

    monkey_patch_markdown()
    monkey_patch_distutils()

    from kolibri import dist as kolibri_dist  # noqa

    sys.path = [os.path.realpath(os.path.dirname(kolibri_dist.__file__))] + sys.path

    if not os.environ.get("KOLIBRI_NO_C_EXTENSIONS", False):
        # Add path for c extensions to sys.path
        prepend_cext_path(os.path.realpath(os.path.dirname(kolibri_dist.__file__)))

    # Depends on Django, so we need to wait until our dist has been registered.
    forward_port_cgi_module()

    # Set default env
    for key, value in ENVIRONMENT_VARIABLES.items():
        if "default" in value:
            os.environ.setdefault(key, value["default"]())
