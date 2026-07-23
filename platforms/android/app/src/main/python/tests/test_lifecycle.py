"""
End-to-end: a dashed request id must drive a job to COMPLETED against real
storage, exercising the ownership fence the unit tests can't reach (see
task_identity for why normalization is load-bearing).
"""

from django.test import TestCase
from task_identity import supervisor_id_from_request

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage

# Captured mid-execution to prove the job is owned while RUNNING, not just
# that ownership is cleared afterwards.
_observed = {}


def _observe_ownership_task(**kwargs):
    orm_job = job_storage.get_orm_job(_observed["job_id"])
    _observed["state"] = orm_job.state
    _observed["supervisor_id"] = orm_job.supervisor_id
    return "ok"


class TaskWorkerLifecycleTest(TestCase):
    databases = "__all__"

    def test_execute_via_request_id_reaches_completed(self):
        import taskworker

        job = Job(_observe_ownership_task)
        job_id = job_storage.enqueue_job(job)
        _observed.clear()
        _observed["job_id"] = job_id

        # A canonical (dashed) java.util.UUID.toString() request id.
        request_id = "3f2504e0-4f89-41d3-9a0c-0305e82c3301"
        taskworker.execute_job(job_id, request_id)

        # Mid-execution: the job was RUNNING and owned by the normalized id.
        self.assertEqual(_observed["state"], State.RUNNING)
        self.assertEqual(
            _observed["supervisor_id"],
            supervisor_id_from_request(request_id),
        )

        orm_job = job_storage.get_orm_job(job_id)
        self.assertEqual(orm_job.state, State.COMPLETED)
        # Ownership is cleared on a terminal transition.
        self.assertIsNone(orm_job.supervisor_id)
