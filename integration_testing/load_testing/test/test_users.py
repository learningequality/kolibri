import pytest
from users import user_number


@pytest.mark.parametrize(("workers", "users"), [(1, 5), (2, 6), (4, 48)])
def test_each_account_gets_exactly_one_session(workers, users):
    numbers = [
        user_number(worker_index, workers, local_num, users)
        for worker_index in range(workers)
        for local_num in range(users // workers)
    ]
    assert sorted(numbers) == list(range(1, users + 1))
