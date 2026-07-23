from unittest import mock

import taskworker


def test_execute_job_claims_ownership_with_request_id():
    with mock.patch.object(taskworker, "kolibri_execute_job") as kej:
        taskworker.execute_job("job-1", "req-9")
    _, kwargs = kej.call_args
    assert kwargs["supervisor_id"] == "req-9"


def test_execute_job_returns_true_on_success():
    with mock.patch.object(taskworker, "kolibri_execute_job"):
        assert taskworker.execute_job("job-1", "req-9") is True


def test_execute_job_returns_false_on_error():
    with mock.patch.object(
        taskworker, "kolibri_execute_job", side_effect=RuntimeError("boom")
    ):
        assert taskworker.execute_job("job-1", "req-9") is False
