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
        return os.access(path, os.W_OK)
    except (IOError, OSError):
        return False


def check_is_directory(path):
    """
    Check if the path is not a file.
    :param path: Path to check
    :return: True if the path is a directory.
    """
    try:
        return os.path.exists(path)
    except (IOError, OSError):
        return False
