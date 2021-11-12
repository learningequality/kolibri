from kolibri.utils.system import get_fd_limit


def test_get_fd_limit():
    limit = get_fd_limit()
    assert limit is not None
    assert limit > 0
