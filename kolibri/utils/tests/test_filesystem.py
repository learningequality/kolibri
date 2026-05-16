import os
import tempfile

from kolibri.utils.filesystem import check_is_directory
from kolibri.utils.filesystem import get_path_permission


def test_get_path_permission_writable_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        assert get_path_permission(tmpdir) is True


def test_get_path_permission_nonexistent():
    assert get_path_permission("/nonexistent/path/xyz") is False


def test_get_path_permission_empty_string():
    # os.path.realpath("") returns cwd on Linux, so an explicit guard is needed.
    assert get_path_permission("") is False


def test_get_path_permission_tilde_not_expanded():
    # ~root/.ssh often exists on Linux, so use a nonexistent user to ensure
    # the path never resolves to a real writable directory.
    result = get_path_permission("~__no_such_user__/.ssh")
    assert result is False


def test_check_is_directory_real_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        assert check_is_directory(tmpdir) is True


def test_check_is_directory_nonexistent():
    assert check_is_directory("/nonexistent/path/xyz") is False


def test_check_is_directory_regular_file():
    with tempfile.NamedTemporaryFile() as f:
        assert check_is_directory(f.name) is False


def test_check_is_directory_empty_string():
    # os.path.realpath("") returns cwd on Linux, so an explicit guard is needed.
    assert check_is_directory("") is False


def test_check_is_directory_tilde_not_expanded():
    # ~root/.ssh often exists on Linux, so use a nonexistent user to ensure
    # the path is treated as a relative path that doesn't exist.
    result = check_is_directory("~__no_such_user__/.ssh")
    assert result is False


def test_check_is_directory_symlink_resolves_for_existence():
    with tempfile.TemporaryDirectory() as tmpdir:
        link = os.path.join(tmpdir, "link")
        target = os.path.join(tmpdir, "target")
        os.mkdir(target)
        os.symlink(target, link)
        assert check_is_directory(link) is True
