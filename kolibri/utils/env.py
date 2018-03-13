import logging
import os
import sys
from distutils import util

logger = logging.getLogger(__name__)


def get_cext_path(dist_path):
    """
    Get the directory of dist/cext.
    """
    # Python version of current platform
    python_version = 'cp' + str(sys.version_info.major) + str(sys.version_info.minor)
    dirname = os.path.join(dist_path, 'cext/' + python_version)

    platform = util.get_platform()
    # For Linux system with cpython<3.3, there could be abi tags 'm' and 'mu'
    if 'linux' in platform and int(python_version[2:]) < 33:
        dirname = os.path.join(dirname, 'linux')
        # encode with ucs2
        if sys.maxunicode == 65535:
            dirname = os.path.join(dirname, python_version+'m')
        # encode with ucs4
        else:
            dirname = os.path.join(dirname, python_version+'mu')

    dirname = os.path.join(dirname, platform)
    sys.path = [os.path.realpath(str(dirname))] + sys.path


def set_env():
    """
    Sets the Kolibri environment for the CLI or other application worker
    manager.

    Do this before importing anything else, we need to add bundled requirements
    from the distributed version in case it exists before importing anything
    else.
    """
    from kolibri import dist as kolibri_dist  # noqa
    sys.path = [os.path.realpath(os.path.dirname(kolibri_dist.__file__))] + sys.path

    # Add path for c extensions to sys.path
    get_cext_path(os.path.realpath(os.path.dirname(kolibri_dist.__file__)))
    try:
        import cryptography  # noqa
    except ImportError:
        # Fallback
        logging.warning('No C Extensions available for this platform.\n')
        sys.path = sys.path[1:]

    # This was added in
    # https://github.com/learningequality/kolibri/pull/580
    # ...we need to (re)move it /benjaoming
    # Force python2 to interpret every string as unicode.
    if sys.version[0] == '2':
        reload(sys)  # noqa
        sys.setdefaultencoding('utf8')

        # Dynamically add the path of `py2only` to PYTHONPATH in Python 2 so that
        # we only import the `future` and `futures` packages from system packages when
        # running with Python 3. Please see `build_tools/py2only.py` for details.
        sys.path = sys.path + [os.path.join(
            os.path.realpath(os.path.dirname(kolibri_dist.__file__)), 'py2only')]

    try:
        from .build_config.default_settings import settings_path
    except ImportError:
        settings_path = "kolibri.deployment.default.settings.base"

    # Set default env
    os.environ.setdefault(
        "DJANGO_SETTINGS_MODULE", settings_path
    )
    os.environ.setdefault(
        "KOLIBRI_HOME", os.path.join(os.path.expanduser("~"), ".kolibri")
    )
    os.environ.setdefault("KOLIBRI_LISTEN_PORT", "8080")
