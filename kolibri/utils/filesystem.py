import os

try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError


def get_path_permission(path):
    """
    Check if the path is writable by the current user.
    :param path: Path to check
    :return: True if the path is writable, False otherwise.
    """
    try:
        return os.access(resolve_path(path), os.W_OK)
    except (IOError, OSError):
        return False


def check_is_directory(path):
    """
    Check if the path is not a file.
    :param path: Path to check
    :return: True if the path is a directory.
    """
    try:
        return os.path.exists(resolve_path(path))
    except (IOError, OSError):
        return False


def resolve_path(path):
    """
    Expand and resolve the path.
    :param path: Path to expand and resolve
    :return: The resolved path.
    """
    try:
        return os.path.realpath(os.path.expanduser(path))
    except (IOError, OSError):
        return None
