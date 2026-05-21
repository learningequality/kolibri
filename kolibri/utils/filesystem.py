import os


def get_path_permission(path):
    """
    Check if the path is writable by the current user.
    :param path: Path to check
    :return: True if the path is writable, False otherwise.
    """
    if not path:
        return False
    try:
        return os.access(os.path.realpath(path), os.W_OK)
    except OSError:
        return False


def check_is_directory(path):
    """
    Check if the path is a directory.
    :param path: Path to check
    :return: True if the path is a directory.
    """
    if not path:
        return False
    try:
        return os.path.isdir(os.path.realpath(path))
    except OSError:
        return False
