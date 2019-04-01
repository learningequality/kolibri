import os
import shutil
import sys

dest = "py2only"
futures_dirname = "concurrent"
DIST_DIR = os.path.join(
    os.path.dirname(os.path.realpath(os.path.dirname(__file__))), "kolibri", "dist"
)


def hide_py2_modules():
    """
    Move the directory of 'futures' and python2-only modules of 'future'
    inside the directory 'py2only'
    """

    # Move the directory of 'futures' inside the directory 'py2only'
    _move_modules_to_py2only(futures_dirname)

    # Future's submodules are not downloaded in Python 3 but only in Python 2
    if sys.version_info[0] == 2:
        from future.standard_library import TOP_LEVEL_MODULES

        for module in TOP_LEVEL_MODULES:
            if module == "test":
                continue

            # Move the directory of submodules of 'future' inside 'py2only'
            _move_modules_to_py2only(module)


def _move_modules_to_py2only(module_name):
    module_src_path = os.path.join(DIST_DIR, module_name)
    module_dst_path = os.path.join(DIST_DIR, dest, module_name)
    shutil.move(module_src_path, module_dst_path)


if __name__ == "__main__":
    # Temporarily add `kolibri/dist` to PYTHONPATH to import future
    sys.path.append(DIST_DIR)

    try:
        os.makedirs(os.path.join(DIST_DIR, dest))
    except OSError:
        raise

    hide_py2_modules()

    # Remove `kolibri/dist` from PYTHONPATH
    sys.path = sys.path[:-1]
