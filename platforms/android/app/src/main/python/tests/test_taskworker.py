from unittest import mock

import taskworker

# A canonical (dashed) java.util.UUID.toString() request id and its dashless
# hex form, which is what Kolibri stores and compares as the supervisor_id.
REQUEST_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
SUPERVISOR_ID = "3f2504e04f8941d39a0c0305e82c3301"


def test_execute_job_claims_ownership_with_request_id():
    with mock.patch.object(taskworker, "kolibri_execute_job") as kej:
        taskworker.execute_job("job-1", REQUEST_ID)
    _, kwargs = kej.call_args
    assert kwargs["supervisor_id"] == SUPERVISOR_ID


def test_execute_job_returns_true_on_success():
    with mock.patch.object(taskworker, "kolibri_execute_job"):
        assert taskworker.execute_job("job-1", REQUEST_ID) is True


def test_execute_job_returns_false_on_error():
    with mock.patch.object(
        taskworker, "kolibri_execute_job", side_effect=RuntimeError("boom")
    ):
        assert taskworker.execute_job("job-1", REQUEST_ID) is False
