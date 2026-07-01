import datetime
import threading
import time
import uuid

import mock
import pytest
from django.db import connections

from kolibri.core.tasks.hooks import JobHook
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.models import Job as ORMJob
from kolibri.core.tasks.models import Supervisor as ORMSupervisor
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.tasks.worker import execute_job
from kolibri.core.tasks.worker import WorkerSupervisor
from kolibri.utils.conf import OPTIONS
from kolibri.utils.time_utils import local_now

QUEUE = "pytest"


def _assert_running():
    job = get_current_job()
    if job.storage.get_job(job.job_id).state != State.RUNNING:
        raise AssertionError("Job was not marked RUNNING during execution")


def _assert_owner(expected_supervisor_id):
    job = get_current_job()
    if ORMJob.objects.get(id=job.job_id).supervisor_id != expected_supervisor_id:
        raise AssertionError("Job was not owned by the expected supervisor")


# Tokens recorded by job functions that ran past a point an ownership-fenced
# execution should never reach.
_executed_past_checkpoint = []


def _record_token(token):
    _executed_past_checkpoint.append(token)


def _simulate_peer_reclaim(new_supervisor_id):
    # Stand-in for a peer wrongly declaring this job's supervisor dead while
    # the job is still running: reconcile requeues the job, then the peer
    # claims it under its own id.
    job = get_current_job()
    job.storage.mark_job_as_queued(job.job_id)
    job.storage.mark_job_as_running(job.job_id, supervisor_id=new_supervisor_id)


def _reclaimed_mid_run(new_supervisor_id, token):
    _simulate_peer_reclaim(new_supervisor_id)
    get_current_job().check_for_cancel()
    _record_token(token)


@pytest.fixture
def defaultbackend():
    b = Storage()
    b.clear(force=True)
    ORMSupervisor.objects.all().delete()
    yield b
    b.clear(force=True)
    ORMSupervisor.objects.all().delete()


@pytest.fixture
def simplejob():
    return Job(id)


@pytest.mark.django_db(databases="__all__")
class TestSupervisorRegistry:
    def test_register_supervisor_creates_new_record(self, defaultbackend):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )

        assert supervisor_id is not None
        supervisor = ORMSupervisor.objects.get(id=supervisor_id)
        assert supervisor.host == "testhost"
        assert supervisor.process == "1234"
        assert supervisor.thread == "5678"
        assert supervisor.last_seen is not None

    def test_register_supervisor_issues_fresh_id_for_same_identity(
        self, defaultbackend
    ):
        # Identity is probe data, not a key - same-identity records
        # coexist under distinct ids.
        supervisor_id1 = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        supervisor_id2 = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )

        assert supervisor_id1 != supervisor_id2
        assert ORMSupervisor.objects.count() == 2

    def test_register_supervisor_creates_new_for_different_identity(
        self, defaultbackend
    ):
        supervisor_id1 = defaultbackend.register_supervisor(
            host="testhost1", process="1234", thread="5678"
        )
        supervisor_id2 = defaultbackend.register_supervisor(
            host="testhost2", process="1234", thread="5678"
        )

        assert supervisor_id1 != supervisor_id2
        assert ORMSupervisor.objects.count() == 2

    def test_unregister_supervisor_removes_record(self, defaultbackend):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        assert ORMSupervisor.objects.filter(id=supervisor_id).exists()

        defaultbackend.unregister_supervisor(supervisor_id)
        assert not ORMSupervisor.objects.filter(id=supervisor_id).exists()

    def test_heartbeat_supervisor_updates_last_seen(self, defaultbackend):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        stale_time = local_now() - datetime.timedelta(seconds=120)
        ORMSupervisor.objects.filter(id=supervisor_id).update(last_seen=stale_time)

        defaultbackend.heartbeat_supervisor(
            supervisor_id, host="testhost", process="1234", thread="5678"
        )

        supervisor = ORMSupervisor.objects.get(id=supervisor_id)
        assert supervisor.last_seen > stale_time

    def test_heartbeat_supervisor_recreates_missing_record(self, defaultbackend):
        # If another supervisor's reconcile wrongly declared us dead and
        # deleted our record, the heartbeat must re-register us, otherwise
        # every job we own is requeued while we are still running it.
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        ORMSupervisor.objects.filter(id=supervisor_id).delete()

        defaultbackend.heartbeat_supervisor(
            supervisor_id, host="testhost", process="1234", thread="5678"
        )

        supervisor = ORMSupervisor.objects.get(id=supervisor_id)
        assert supervisor.host == "testhost"
        assert supervisor.process == "1234"
        assert supervisor.thread == "5678"
        assert supervisor.last_seen is not None

    def test_heartbeat_supervisor_reregisters_alongside_same_identity_record(
        self, defaultbackend
    ):
        # A wrongly-deleted supervisor must be able to re-register even
        # while another record holds the same identity tuple (e.g. a
        # cross-namespace twin with colliding host/pid/thread).
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        twin_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        ORMSupervisor.objects.filter(id=supervisor_id).delete()

        defaultbackend.heartbeat_supervisor(
            supervisor_id, host="testhost", process="1234", thread="5678"
        )

        assert ORMSupervisor.objects.filter(id=supervisor_id).exists()
        assert ORMSupervisor.objects.filter(id=twin_id).exists()


@pytest.mark.django_db(databases="__all__")
class TestReconcileStalledJobs:
    def test_reconcile_requeues_jobs_from_stale_supervisors(
        self, defaultbackend, simplejob
    ):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)
        assert defaultbackend.get_job(job_id).state == State.RUNNING

        # Make the supervisor's heartbeat stale.
        ORMSupervisor.objects.filter(id=supervisor_id).update(
            last_seen=local_now() - datetime.timedelta(seconds=300)
        )

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        job = defaultbackend.get_job(job_id)
        assert job.state == State.QUEUED
        # supervisor_id is cleared and the inflated state stays consistent.
        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.supervisor_id is None
        assert orm_job.state == State.QUEUED
        # The dead supervisor record has been removed.
        assert not ORMSupervisor.objects.filter(id=supervisor_id).exists()

    def test_reconcile_cleans_up_stale_supervisors(self, defaultbackend):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        ORMSupervisor.objects.filter(id=supervisor_id).update(
            last_seen=local_now() - datetime.timedelta(seconds=300)
        )

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert ORMSupervisor.objects.count() == 0

    def test_reconcile_requeues_orphaned_jobs_with_no_supervisor_id(
        self, defaultbackend, simplejob
    ):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id)
        assert defaultbackend.get_job(job_id).state == State.RUNNING

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.QUEUED

    def test_reconcile_requeues_jobs_with_nonexistent_supervisor(
        self, defaultbackend, simplejob
    ):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=uuid.uuid4().hex)
        assert defaultbackend.get_job(job_id).state == State.RUNNING

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.QUEUED
        assert ORMJob.objects.get(id=job_id).supervisor_id is None

    def test_reconcile_requeues_selected_jobs_with_dead_supervisor(
        self, defaultbackend, simplejob
    ):
        # A supervisor can die between picking a job (SELECTED) and starting
        # it (RUNNING); reconciliation must requeue those jobs too.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.get_next_queued_job(supervisor_id=uuid.uuid4().hex)
        assert ORMJob.objects.get(id=job_id).state == State.SELECTED

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.QUEUED
        assert orm_job.supervisor_id is None

    def test_reconcile_requeues_orphaned_selected_jobs(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.get_next_queued_job()
        assert ORMJob.objects.get(id=job_id).state == State.SELECTED

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert ORMJob.objects.get(id=job_id).state == State.QUEUED

    def test_reconcile_finalizes_canceling_jobs_of_dead_supervisors(
        self, defaultbackend, simplejob
    ):
        # A dead supervisor can never finalize its CANCELING jobs, and live
        # peers skip CANCELING jobs they do not own, so reconciliation must
        # finalize them or they are stuck in CANCELING forever.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=uuid.uuid4().hex)
        defaultbackend.mark_job_as_canceling(job_id)

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.CANCELED

    def test_reconcile_finalizes_unowned_canceling_jobs(
        self, defaultbackend, simplejob
    ):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_canceling(job_id)

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.CANCELED

    def test_reconcile_does_not_finalize_live_supervisors_canceling_jobs(
        self, defaultbackend, simplejob
    ):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)
        defaultbackend.mark_job_as_canceling(job_id)

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.CANCELING

    def test_reconcile_with_explicit_live_set(self, defaultbackend):
        # An external liveness authority (e.g. WorkManager on Android) passes
        # the live set directly instead of relying on registry heartbeats.
        live_id = uuid.uuid4().hex
        dead_id = uuid.uuid4().hex
        live_job = defaultbackend.enqueue_job(Job(id), QUEUE)
        dead_job = defaultbackend.enqueue_job(Job(id), QUEUE)
        orphan_job = defaultbackend.enqueue_job(Job(id), QUEUE)
        defaultbackend.mark_job_as_running(live_job, supervisor_id=live_id)
        defaultbackend.mark_job_as_running(dead_job, supervisor_id=dead_id)
        defaultbackend.mark_job_as_running(orphan_job)
        registered_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )

        defaultbackend.reconcile_stalled_jobs(live_supervisor_ids=[live_id])

        assert defaultbackend.get_job(live_job).state == State.RUNNING
        assert defaultbackend.get_job(dead_job).state == State.QUEUED
        assert defaultbackend.get_job(orphan_job).state == State.QUEUED
        # The two modes are mutually exclusive per deployment, so any registry
        # record in this mode is stale cruft from a previous registry-mode
        # deployment and is deleted.
        assert not ORMSupervisor.objects.filter(id=registered_id).exists()

    def test_reconcile_with_empty_live_set_requeues_all(self, defaultbackend):
        job_id = defaultbackend.enqueue_job(Job(id), QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=uuid.uuid4().hex)

        defaultbackend.reconcile_stalled_jobs(live_supervisor_ids=[])

        assert defaultbackend.get_job(job_id).state == State.QUEUED

    def test_reconcile_requires_exactly_one_liveness_source(self, defaultbackend):
        with pytest.raises(ValueError):
            defaultbackend.reconcile_stalled_jobs()
        with pytest.raises(ValueError):
            defaultbackend.reconcile_stalled_jobs(
                supervisor_stale_threshold=60, live_supervisor_ids=[]
            )

    def test_reconcile_does_not_requeue_job_finished_during_reconcile(
        self, defaultbackend
    ):
        # A supervisor wrongly declared dead may finish its job between
        # reconcile reading its candidates and requeuing them. Simulate the
        # interleaving with a hook that completes the other candidate during
        # the first requeue - the finished job must not be resurrected.
        job1 = defaultbackend.enqueue_job(Job(id), QUEUE)
        job2 = defaultbackend.enqueue_job(Job(id), QUEUE)
        defaultbackend.mark_job_as_running(job1, supervisor_id=uuid.uuid4().hex)
        defaultbackend.mark_job_as_running(job2, supervisor_id=uuid.uuid4().hex)

        hook = mock.MagicMock()
        finished = {}

        with mock.patch.dict(JobHook._registered_hooks, {"test-hook": hook}):
            backend = Storage()

            def complete_other(job, orm_job, state=None, **kwargs):
                if state == State.QUEUED and not finished:
                    finished["job_id"] = job2 if job.job_id == job1 else job1
                    backend.complete_job(finished["job_id"])

            hook.update.side_effect = complete_other
            backend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        requeued = job1 if finished["job_id"] == job2 else job2
        assert defaultbackend.get_job(finished["job_id"]).state == State.COMPLETED
        assert defaultbackend.get_job(requeued).state == State.QUEUED

    def test_reconcile_does_not_cancel_canceling_job_finished_during_reconcile(
        self, defaultbackend
    ):
        # A supervisor wrongly declared dead may finish its CANCELING job
        # (the function ran to completion before noticing the cancel request)
        # between reconcile reading its candidates and finalizing them.
        # Simulate the interleaving with a hook that completes the other
        # candidate during the first finalization - the finished job's
        # terminal state must not be overwritten with CANCELED.
        job1 = defaultbackend.enqueue_job(Job(id), QUEUE)
        job2 = defaultbackend.enqueue_job(Job(id), QUEUE)
        defaultbackend.mark_job_as_running(job1, supervisor_id=uuid.uuid4().hex)
        defaultbackend.mark_job_as_running(job2, supervisor_id=uuid.uuid4().hex)
        defaultbackend.mark_job_as_canceling(job1)
        defaultbackend.mark_job_as_canceling(job2)

        hook = mock.MagicMock()
        finished = {}

        with mock.patch.dict(JobHook._registered_hooks, {"test-hook": hook}):
            backend = Storage()

            def complete_other(job, orm_job, state=None, **kwargs):
                if state == State.CANCELED and not finished:
                    finished["job_id"] = job2 if job.job_id == job1 else job1
                    backend.complete_job(finished["job_id"])

            hook.update.side_effect = complete_other
            backend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        canceled = job1 if finished["job_id"] == job2 else job2
        assert defaultbackend.get_job(finished["job_id"]).state == State.COMPLETED
        assert defaultbackend.get_job(canceled).state == State.CANCELED

    def test_reconcile_continues_past_failing_job_transition(self, defaultbackend):
        # A single job whose transition raises (e.g. a broken job hook) must
        # not abort the whole reconcile - the remaining orphans still get
        # requeued and the stale registry records still get cleaned up.
        # Otherwise one poison job blocks reconciliation forever, since each
        # heartbeat retries the candidates in the same id order.
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job1 = defaultbackend.enqueue_job(Job(id), QUEUE)
        job2 = defaultbackend.enqueue_job(Job(id), QUEUE)
        defaultbackend.mark_job_as_running(job1, supervisor_id=supervisor_id)
        defaultbackend.mark_job_as_running(job2, supervisor_id=supervisor_id)
        ORMSupervisor.objects.filter(id=supervisor_id).update(
            last_seen=local_now() - datetime.timedelta(seconds=300)
        )
        # Poison the job that is first in the id-ordered pass, so the test
        # proves the pass continues past a failure rather than merely
        # finishing before one.
        poison_job = min(job1, job2)
        healthy_job = job1 if poison_job == job2 else job2

        hook = mock.MagicMock()

        def raise_for_poison(job, orm_job, state=None, **kwargs):
            if job.job_id == poison_job:
                raise RuntimeError("boom")

        hook.update.side_effect = raise_for_poison

        with mock.patch.dict(JobHook._registered_hooks, {"test-hook": hook}):
            backend = Storage()
            backend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(healthy_job).state == State.QUEUED
        # The poisoned transition rolled back whole, leaving the job intact
        # for a later reconcile to retry.
        orm_job = ORMJob.objects.get(id=poison_job)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == supervisor_id
        assert not ORMSupervisor.objects.filter(id=supervisor_id).exists()

    def test_reconcile_ignores_local_clock_skew(self, defaultbackend, simplejob):
        # Liveness timestamps are written and compared using database time,
        # so a skewed local clock on the reconciling process must not
        # condemn a supervisor with a fresh heartbeat.
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        with mock.patch.object(
            Storage, "_now", return_value=local_now() + datetime.timedelta(hours=1)
        ):
            defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.RUNNING
        assert ORMSupervisor.objects.filter(id=supervisor_id).exists()

    def test_heartbeat_timestamp_ignores_local_clock_skew(
        self, defaultbackend, simplejob
    ):
        # The writer's local clock must not matter either - a heartbeat
        # written moments ago by a supervisor with a skewed clock is fresh.
        with mock.patch.object(
            Storage, "_now", return_value=local_now() - datetime.timedelta(hours=1)
        ):
            supervisor_id = defaultbackend.register_supervisor(
                host="testhost", process="1234", thread="5678"
            )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.RUNNING
        assert ORMSupervisor.objects.filter(id=supervisor_id).exists()

    def test_reconcile_does_not_affect_fresh_supervisor_jobs(
        self, defaultbackend, simplejob
    ):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        defaultbackend.reconcile_stalled_jobs(supervisor_stale_threshold=60)

        assert defaultbackend.get_job(job_id).state == State.RUNNING
        assert ORMSupervisor.objects.filter(id=supervisor_id).exists()


@pytest.mark.django_db(databases="__all__")
class TestJobSupervisorId:
    def test_get_next_queued_job_stamps_supervisor_id(self, defaultbackend, simplejob):
        # Ownership starts at SELECTED time, not RUNNING - otherwise a
        # supervisor dying between pick-up and start leaves the job unowned
        # in a non-QUEUED state.
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        job = defaultbackend.get_next_queued_job(supervisor_id=supervisor_id)

        assert job.job_id == job_id
        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.SELECTED
        assert orm_job.supervisor_id == supervisor_id

    def test_claimed_job_inflates_with_selected_state(self, defaultbackend, simplejob):
        # The claim updates only the state column, not saved_job; an inflated
        # job must still report SELECTED, since the column is the source of
        # truth for state.
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        claimed = defaultbackend.get_next_queued_job(supervisor_id=supervisor_id)

        assert claimed.state == State.SELECTED
        assert defaultbackend.get_job(job_id).state == State.SELECTED

    @pytest.mark.django_db(databases="__all__", transaction=True)
    def test_get_next_queued_job_claims_job_exactly_once_across_threads(
        self, defaultbackend
    ):
        # Two supervisors racing to pick up the same job must not both claim
        # it - the loser of the race gets nothing. The unsafe interleaving is
        # timing dependent, so repeat the race to give it a chance to occur.
        for _ in range(10):
            job_id = defaultbackend.enqueue_job(Job(id), QUEUE)
            barrier = threading.Barrier(2, timeout=10)
            results = {}

            def claim(supervisor_id):
                barrier.wait()
                try:
                    results[supervisor_id] = defaultbackend.get_next_queued_job(
                        supervisor_id=supervisor_id
                    )
                finally:
                    connections.close_all()

            supervisor_ids = [uuid.uuid4().hex, uuid.uuid4().hex]
            threads = [
                threading.Thread(target=claim, args=(supervisor_id,))
                for supervisor_id in supervisor_ids
            ]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            claimed = {
                supervisor_id: job
                for supervisor_id, job in results.items()
                if job is not None
            }
            assert len(claimed) == 1
            winner = next(iter(claimed))
            assert ORMJob.objects.get(id=job_id).supervisor_id == winner
            defaultbackend.clear(force=True)

    def test_get_next_queued_job_without_supervisor_id_leaves_unowned(
        self, defaultbackend, simplejob
    ):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        defaultbackend.get_next_queued_job()

        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.SELECTED
        assert orm_job.supervisor_id is None

    def test_mark_job_as_running_with_supervisor_id(self, defaultbackend, simplejob):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        assert ORMJob.objects.get(id=job_id).supervisor_id == supervisor_id

    def test_mark_job_as_running_without_supervisor_id(self, defaultbackend, simplejob):
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id)

        assert ORMJob.objects.get(id=job_id).supervisor_id is None

    def test_mark_job_as_running_again_preserves_supervisor_id(
        self, defaultbackend, simplejob
    ):
        # A bare re-mark (e.g. Job.execute in a non-supervisor worker context)
        # must not clear the owner set by the dispatching supervisor.
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)
        defaultbackend.mark_job_as_running(job_id)

        assert ORMJob.objects.get(id=job_id).supervisor_id == supervisor_id

    def test_mark_job_as_running_again_emits_single_hook_event(self, defaultbackend):
        # The dispatching supervisor marks RUNNING, then Job.execute re-marks
        # it (so external dispatchers like Android's WorkManager still get the
        # transition); the re-mark is idempotent and must not emit a second
        # hook event.
        hook = mock.MagicMock()
        with mock.patch.dict(JobHook._registered_hooks, {"test-hook": hook}):
            backend = Storage()
            supervisor_id = uuid.uuid4().hex
            job_id = backend.enqueue_job(Job(id), QUEUE)
            backend.mark_job_as_running(job_id, supervisor_id=supervisor_id)
            backend.mark_job_as_running(job_id)

        running_events = [
            c for c in hook.update.call_args_list if c[1].get("state") == State.RUNNING
        ]
        assert len(running_events) == 1

    @pytest.mark.django_db(databases="__all__", transaction=True)
    def test_concurrent_identical_re_marks_emit_single_hook_event(self, defaultbackend):
        # Two live peers may race to finalize the same unowned CANCELING job
        # (WorkerSupervisor.check_jobs finalizes unowned jobs on every pass);
        # the loser must observe the winner's write and no-op, so hooks see
        # exactly one CANCELED event per transition. The unsafe interleaving
        # is timing dependent, so repeat the race to give it a chance to occur.
        hook = mock.MagicMock()
        with mock.patch.dict(JobHook._registered_hooks, {"test-hook": hook}):
            backend = Storage()
            for _ in range(10):
                job_id = backend.enqueue_job(Job(id), QUEUE)
                backend.mark_job_as_canceling(job_id)
                hook.reset_mock()
                barrier = threading.Barrier(2, timeout=10)

                def finalize():
                    barrier.wait()
                    try:
                        backend.mark_job_as_canceled(job_id)
                    finally:
                        connections.close_all()

                threads = [threading.Thread(target=finalize) for _ in range(2)]
                for t in threads:
                    t.start()
                for t in threads:
                    t.join()

                canceled_events = [
                    c
                    for c in hook.update.call_args_list
                    if c[1].get("state") == State.CANCELED
                ]
                assert len(canceled_events) == 1
                backend.clear(force=True)

    def test_execute_marks_job_running_without_a_supervisor(self, defaultbackend):
        # Worker contexts that call execute() directly without a supervisor
        # (e.g. Android's WorkManager) rely on execute() itself transitioning
        # the job to RUNNING.
        job_id = defaultbackend.enqueue_job(Job(_assert_running), QUEUE)

        defaultbackend.get_job(job_id).execute()

        assert defaultbackend.get_job(job_id).state == State.COMPLETED

    @pytest.mark.django_db(databases="__all__", transaction=True)
    def test_execute_job_with_supervisor_id_stamps_owner(self, defaultbackend):
        # External dispatchers (e.g. Android's WorkManager) pass their own
        # identity so the job is owned for the duration of its execution.
        # transaction=True because execute_job closes the django connection
        # when it finishes - on postgres that is the same connection the test
        # runs on, which breaks the default test transaction wrapper.
        supervisor_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(
            Job(_assert_owner, args=(supervisor_id,)), QUEUE
        )

        execute_job(job_id, supervisor_id=supervisor_id)

        assert defaultbackend.get_job(job_id).state == State.COMPLETED

    @pytest.mark.parametrize(
        "leave_supervised_state",
        [
            lambda backend, job_id: backend.complete_job(job_id),
            lambda backend, job_id: backend.mark_job_as_failed(
                job_id, RuntimeError("boom"), "traceback"
            ),
            lambda backend, job_id: backend.mark_job_as_canceled(job_id),
            lambda backend, job_id: backend.mark_job_as_queued(job_id),
        ],
        ids=["complete", "failed", "canceled", "queued"],
    )
    def test_leaving_supervised_state_clears_supervisor_id(
        self, defaultbackend, simplejob, leave_supervised_state
    ):
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        leave_supervised_state(defaultbackend, job_id)

        assert ORMJob.objects.get(id=job_id).supervisor_id is None

    def test_schedule_clears_supervisor_id(self, defaultbackend, simplejob):
        # CANCELING keeps its owner and can be re-scheduled.
        supervisor_id = defaultbackend.register_supervisor(
            host="testhost", process="1234", thread="5678"
        )
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)
        defaultbackend.mark_job_as_canceling(job_id)
        assert ORMJob.objects.get(id=job_id).supervisor_id == supervisor_id

        job = defaultbackend.get_job(job_id)
        defaultbackend.schedule(local_now(), job, QUEUE)

        assert ORMJob.objects.get(id=job_id).supervisor_id is None

    def _reclaimed_job(self, backend, job, old_id, new_id):
        # A supervisor wrongly declared dead while still executing: reconcile
        # requeues its job, then a peer claims it under a new id.
        job_id = backend.enqueue_job(job, QUEUE)
        backend.mark_job_as_running(job_id, supervisor_id=old_id)
        backend.mark_job_as_queued(job_id)
        backend.mark_job_as_running(job_id, supervisor_id=new_id)
        return job_id

    def test_fenced_write_applied_when_owner_matches(self, defaultbackend, simplejob):
        supervisor_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        accepted = defaultbackend.complete_job(
            job_id, expected_supervisor_id=supervisor_id
        )

        assert accepted is True
        assert defaultbackend.get_job(job_id).state == State.COMPLETED

    def test_fenced_write_discarded_when_job_claimed_by_another_supervisor(
        self, defaultbackend, simplejob
    ):
        # The disowned executor's late terminal write must not clobber the
        # reclaiming peer's RUNNING state or its ownership.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        accepted = defaultbackend.complete_job(job_id, expected_supervisor_id=old_id)

        assert accepted is False
        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == new_id

    def test_fenced_write_discarded_when_job_requeued_and_unclaimed(
        self, defaultbackend, simplejob
    ):
        # The fence is an exact match, so a requeued-but-unclaimed (unowned)
        # job is off limits too - an unowned QUEUED job is indistinguishable
        # from one rescheduled after a peer already finished a duplicate run,
        # and completing that one would kill its scheduled next run.
        old_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=old_id)
        defaultbackend.mark_job_as_queued(job_id)

        accepted = defaultbackend.complete_job(job_id, expected_supervisor_id=old_id)

        assert accepted is False
        assert ORMJob.objects.get(id=job_id).state == State.QUEUED

    def test_fenced_write_with_expected_none_applies_when_unowned(
        self, defaultbackend, simplejob
    ):
        # None is a real expectation (unowned direct execution), not a
        # no-check default.
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id)

        accepted = defaultbackend.complete_job(job_id, expected_supervisor_id=None)

        assert accepted is True
        assert defaultbackend.get_job(job_id).state == State.COMPLETED

    def test_fenced_write_with_expected_none_discarded_when_owned(
        self, defaultbackend, simplejob
    ):
        # An unowned execution loses its job the moment a supervisor claims
        # it; its writes are then discarded like any other disowned writer's.
        supervisor_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        accepted = defaultbackend.complete_job(job_id, expected_supervisor_id=None)

        assert accepted is False
        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == supervisor_id

    def test_fenced_mark_running_does_not_steal_claimed_job(
        self, defaultbackend, simplejob
    ):
        # The claim execute_job makes for external dispatchers (own id with
        # expected None) must not re-stamp ownership over a peer's claim.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        defaultbackend.mark_job_as_running(
            job_id, supervisor_id=old_id, expected_supervisor_id=None
        )

        assert ORMJob.objects.get(id=job_id).supervisor_id == new_id

    def test_mark_job_as_running_reports_applied_write(self, defaultbackend, simplejob):
        supervisor_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)

        applied = defaultbackend.mark_job_as_running(
            job_id, supervisor_id=supervisor_id, expected_supervisor_id=None
        )

        assert applied is True

    def test_mark_job_as_running_reports_discarded_write(
        self, defaultbackend, simplejob
    ):
        # Callers that dispatch an execution off the back of this mark (e.g.
        # WorkerSupervisor.start_next_job) need to know the job is no longer
        # theirs to run.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        applied = defaultbackend.mark_job_as_running(
            job_id, supervisor_id=old_id, expected_supervisor_id=old_id
        )

        assert applied is False

    def test_fenced_progress_update_discarded_after_ownership_loss(
        self, defaultbackend, simplejob
    ):
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        defaultbackend.update_job_progress(job_id, 5, 10, expected_supervisor_id=old_id)

        assert defaultbackend.get_job(job_id).progress == 0

    def test_fenced_metadata_save_discarded_after_ownership_loss(
        self, defaultbackend, simplejob
    ):
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)
        job = defaultbackend.get_job(job_id)
        job.extra_metadata["stale"] = True

        defaultbackend.save_job_meta(job, expected_supervisor_id=old_id)

        assert "stale" not in defaultbackend.get_job(job_id).extra_metadata

    def test_fenced_cancellable_save_discarded_after_ownership_loss(
        self, defaultbackend, simplejob
    ):
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        defaultbackend.save_job_as_cancellable(
            job_id, cancellable=True, expected_supervisor_id=old_id
        )

        assert defaultbackend.get_job(job_id).cancellable is False

    def test_fenced_mark_canceling_discarded_after_ownership_loss(
        self, defaultbackend, simplejob
    ):
        # WorkerSupervisor.shutdown_workers marks its own jobs CANCELING fenced
        # on its id; a job reclaimed by a peer must not be dragged into
        # CANCELING by the disowned supervisor.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        defaultbackend.mark_job_as_canceling(job_id, expected_supervisor_id=old_id)

        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == new_id

    def test_fenced_worker_info_discarded_after_ownership_loss(
        self, defaultbackend, simplejob
    ):
        # Worker identity fields exist to attribute an execution; a fenced-off
        # duplicate execution is exactly when they get read, so a disowned
        # writer must not misattribute the job to itself.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        defaultbackend.save_worker_info(
            job_id, host="stale-host", expected_supervisor_id=old_id
        )

        assert ORMJob.objects.get(id=job_id).worker_host != "stale-host"

    def test_fenced_worker_info_applied_when_owner_matches(
        self, defaultbackend, simplejob
    ):
        supervisor_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        defaultbackend.save_worker_info(
            job_id, host="live-host", expected_supervisor_id=supervisor_id
        )

        assert ORMJob.objects.get(id=job_id).worker_host == "live-host"

    def test_discarded_write_emits_no_hook_events(self, defaultbackend):
        # A discarded write must be invisible to hooks - otherwise observers
        # see state transitions that never happened.
        hook = mock.MagicMock()
        with mock.patch.dict(JobHook._registered_hooks, {"test-hook": hook}):
            backend = Storage()
            old_id = uuid.uuid4().hex
            new_id = uuid.uuid4().hex
            job_id = self._reclaimed_job(backend, Job(id), old_id, new_id)
            hook.reset_mock()

            backend.complete_job(job_id, expected_supervisor_id=old_id)

        assert hook.update.call_count == 0

    def test_check_job_canceled_after_ownership_loss(self, defaultbackend, simplejob):
        # Ownership loss is a cancel signal: there is precedent, since a
        # deleted job is already treated as canceled. This bounds the
        # at-least-once overlap - the disowned execution stops at its next
        # cancellation checkpoint instead of running to completion.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = self._reclaimed_job(defaultbackend, simplejob, old_id, new_id)

        assert (
            defaultbackend.check_job_canceled(job_id, expected_supervisor_id=old_id)
            is True
        )

    def test_check_job_canceled_with_matching_owner(self, defaultbackend, simplejob):
        supervisor_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(simplejob, QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)

        assert (
            defaultbackend.check_job_canceled(
                job_id, expected_supervisor_id=supervisor_id
            )
            is False
        )

    def test_execute_does_not_overwrite_cancel_requested_before_start(
        self, defaultbackend
    ):
        # A cancel can arrive between the dispatching supervisor marking the
        # job RUNNING and the executor thread starting; the executor's
        # RUNNING re-mark must not overwrite CANCELING, or the cancel signal
        # is lost and the job runs to completion.
        supervisor_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(Job(id, args=(9,), cancellable=True), QUEUE)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=supervisor_id)
        defaultbackend.mark_job_as_canceling(job_id)

        defaultbackend.get_job(job_id).execute(supervisor_id=supervisor_id)

        assert defaultbackend.get_job(job_id).state == State.CANCELED

    def test_disowned_cancellable_execution_stops_at_checkpoint(self, defaultbackend):
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        token = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(
            Job(_reclaimed_mid_run, args=(new_id, token), cancellable=True), QUEUE
        )
        defaultbackend.mark_job_as_running(job_id, supervisor_id=old_id)

        defaultbackend.get_job(job_id).execute(supervisor_id=old_id)

        assert token not in _executed_past_checkpoint
        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == new_id

    def test_disowned_execution_does_not_reschedule_repeating_job(self, defaultbackend):
        # reschedule_finished_job_if_needed runs unconditionally after every
        # execution; for a repeating job a disowned executor re-scheduling
        # means QUEUED and a third claim - duplicates compound rather than
        # converge.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = defaultbackend.schedule(
            local_now(),
            Job(_simulate_peer_reclaim, args=(new_id,)),
            QUEUE,
            interval=600,
            repeat=None,
        )
        defaultbackend.mark_job_as_running(job_id, supervisor_id=old_id)

        defaultbackend.get_job(job_id).execute(supervisor_id=old_id)

        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == new_id

    @pytest.mark.django_db(databases="__all__", transaction=True)
    def test_execute_job_does_not_steal_job_claimed_by_another_supervisor(
        self, defaultbackend
    ):
        # A job requeued and reclaimed by a peer between dispatch and the
        # executor thread starting must not be re-stamped or run.
        # transaction=True because execute_job closes the django connection
        # when it finishes - on postgres that is the same connection the test
        # runs on, which breaks the default test transaction wrapper.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        token = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(
            Job(_record_token, args=(token,), cancellable=True), QUEUE
        )
        defaultbackend.mark_job_as_running(job_id, supervisor_id=old_id)
        defaultbackend.mark_job_as_queued(job_id)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=new_id)

        execute_job(job_id, supervisor_id=old_id)

        assert token not in _executed_past_checkpoint
        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == new_id

    @pytest.mark.django_db(databases="__all__", transaction=True)
    def test_execute_job_does_not_run_reclaimed_non_cancellable_job(
        self, defaultbackend
    ):
        # A non-cancellable job has no checkpoint at which to notice it was
        # disowned, so a failed claim must abort the execution outright rather
        # than let the function run a duplicate to completion.
        # transaction=True because execute_job closes the django connection
        # when it finishes - on postgres that is the same connection the test
        # runs on, which breaks the default test transaction wrapper.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        token = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(
            Job(_record_token, args=(token,), cancellable=False), QUEUE
        )
        defaultbackend.mark_job_as_running(job_id, supervisor_id=old_id)
        defaultbackend.mark_job_as_queued(job_id)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=new_id)

        execute_job(job_id, supervisor_id=old_id)

        assert token not in _executed_past_checkpoint
        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == new_id

    @pytest.mark.django_db(databases="__all__", transaction=True)
    def test_execute_job_does_not_overwrite_worker_info_of_reclaiming_peer(
        self, defaultbackend
    ):
        # The worker identity recorded by execute_job must be fenced like any
        # other execution write - a disowned executor's identity would
        # misattribute the peer's run.
        # transaction=True because execute_job closes the django connection
        # when it finishes - on postgres that is the same connection the test
        # runs on, which breaks the default test transaction wrapper.
        old_id = uuid.uuid4().hex
        new_id = uuid.uuid4().hex
        job_id = defaultbackend.enqueue_job(
            Job(_record_token, args=(uuid.uuid4().hex,), cancellable=True), QUEUE
        )
        defaultbackend.mark_job_as_running(job_id, supervisor_id=old_id)
        defaultbackend.mark_job_as_queued(job_id)
        defaultbackend.mark_job_as_running(job_id, supervisor_id=new_id)
        defaultbackend.save_worker_info(job_id, host="peer-host")

        execute_job(job_id, worker_host="stale-host", supervisor_id=old_id)

        assert ORMJob.objects.get(id=job_id).worker_host == "peer-host"


@pytest.mark.django_db(databases="__all__", transaction=True)
class TestWorkerSupervisor:
    @pytest.fixture
    def worker(self):
        w = WorkerSupervisor(regular_workers=1, high_workers=1)
        w.storage.clear(force=True)
        yield w
        w.storage.clear(force=True)
        w.shutdown()

    def test_supervisor_registers_on_startup(self, worker):
        assert worker.supervisor_id is not None
        assert ORMSupervisor.objects.filter(id=worker.supervisor_id).exists()

    def test_supervisor_thread_is_running(self, worker):
        assert worker.supervisor_thread is not None
        assert worker.supervisor_thread.is_alive()

    def test_heartbeat_reconciles_dead_supervisors(self, worker):
        # Reconciliation must happen on every heartbeat, not only at startup.
        dead_id = worker.storage.register_supervisor(
            host="otherhost", process="9999", thread="8888"
        )
        job = Job(id, args=(9,))
        job_id = worker.storage.enqueue_job(job, QUEUE)
        worker.storage.mark_job_as_running(job_id, supervisor_id=dead_id)
        ORMSupervisor.objects.filter(id=dead_id).update(
            last_seen=local_now() - datetime.timedelta(seconds=300)
        )

        worker._do_supervisor_heartbeat()

        # The live worker may already have picked the job back up, so assert
        # it is no longer owned by the dead supervisor rather than a state.
        assert not ORMSupervisor.objects.filter(id=dead_id).exists()
        assert ORMJob.objects.get(id=job_id).supervisor_id != dead_id

    def test_heartbeat_reregisters_after_record_deleted(self, worker):
        # A supervisor wrongly declared dead by a peer must restore its
        # registration on its next heartbeat.
        ORMSupervisor.objects.filter(id=worker.supervisor_id).delete()

        worker._do_supervisor_heartbeat()

        assert ORMSupervisor.objects.filter(id=worker.supervisor_id).exists()

    def test_heartbeat_interval_derived_from_stale_threshold(self):
        # The heartbeat cadence is derived from the stale threshold rather
        # than separately configurable, so the two can never be misconfigured
        # relative to each other.
        with mock.patch.dict(OPTIONS["Tasks"], {"SUPERVISOR_STALE_THRESHOLD": 90}):
            w = WorkerSupervisor(regular_workers=1, high_workers=1)
            try:
                assert w._heartbeat_interval == 30
            finally:
                w.storage.clear(force=True)
                w.shutdown()

    def test_supervisor_unregisters_on_shutdown(self):
        w = WorkerSupervisor(regular_workers=1, high_workers=1)
        supervisor_id = w.supervisor_id
        assert ORMSupervisor.objects.filter(id=supervisor_id).exists()
        w.storage.clear(force=True)
        w.shutdown()
        assert not ORMSupervisor.objects.filter(id=supervisor_id).exists()

    def test_shutdown_keeps_heartbeat_until_workers_drained(self):
        # While workers drain, the loop must keep running (heartbeating) with
        # claiming paused, or a job that outlasts the stale threshold lets a
        # peer declare this supervisor dead and requeue its still-running jobs.
        w = WorkerSupervisor(regular_workers=1, high_workers=1)
        w.storage.clear(force=True)
        observed = {}
        original_shutdown_workers = w.shutdown_workers

        def spy(wait=True):
            observed["loop_running"] = not w.supervisor_thread.shutdown_event.is_set()
            observed["draining"] = w._draining.is_set()
            return original_shutdown_workers(wait=wait)

        w.shutdown_workers = spy
        w.shutdown()

        assert observed["loop_running"] is True
        assert observed["draining"] is True
        ORMSupervisor.objects.all().delete()

    def test_shutdown_does_not_cancel_other_supervisors_running_jobs(self):
        # A supervisor shutting down must only cancel its own jobs - a peer's
        # running jobs are not its business (orphans belong to reconcile).
        w = WorkerSupervisor(regular_workers=1, high_workers=1)
        other_id = w.storage.register_supervisor(
            host="otherhost", process="9999", thread="8888"
        )
        # Schedule in the future so this worker's job checker cannot pick it
        # up before we assign it to the other supervisor.
        job_id = w.storage.enqueue_in(
            datetime.timedelta(hours=1), Job(id, args=(9,)), QUEUE
        )
        w.storage.mark_job_as_running(job_id, supervisor_id=other_id)

        w.shutdown()

        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == other_id
        w.storage.clear(force=True)
        ORMSupervisor.objects.all().delete()

    def test_start_next_job_does_not_steal_job_reclaimed_by_peer(self, worker):
        # The dispatch-time RUNNING mark must be fenced on our own claim -
        # if we were wrongly declared dead between claim and dispatch and a
        # peer reclaimed the job, stamping ourselves back over its ownership
        # is a steal, not a claim.
        peer_id = worker.storage.register_supervisor(
            host="otherhost", process="9999", thread="8888"
        )
        # Schedule in the future so this worker's job checker cannot claim it
        # independently of the start_next_job call under test.
        job_id = worker.storage.enqueue_in(
            datetime.timedelta(hours=1), Job(id, args=(9,)), QUEUE
        )
        job = worker.storage.get_job(job_id)
        worker.storage.mark_job_as_running(job_id, supervisor_id=peer_id)

        worker.start_next_job(job)

        assert ORMJob.objects.get(id=job_id).supervisor_id == peer_id

    def test_start_next_job_skips_dispatch_when_job_no_longer_owned(self, worker):
        # Dispatching anyway would start an execution we already know is
        # disowned - for a non-cancellable job, a guaranteed duplicate run.
        peer_id = worker.storage.register_supervisor(
            host="otherhost", process="9999", thread="8888"
        )
        job_id = worker.storage.enqueue_in(
            datetime.timedelta(hours=1), Job(id, args=(9,)), QUEUE
        )
        job = worker.storage.get_job(job_id)
        worker.storage.mark_job_as_running(job_id, supervisor_id=peer_id)

        future = worker.start_next_job(job)

        assert future is None
        assert job_id not in worker.future_job_mapping

    def test_check_jobs_does_not_finalize_other_supervisors_canceling_jobs(
        self, worker
    ):
        # A CANCELING job owned by a live peer is that peer's to finalize -
        # it may still be actively cancelling the future.
        other_id = worker.storage.register_supervisor(
            host="otherhost", process="9999", thread="8888"
        )
        job_id = worker.storage.enqueue_in(
            datetime.timedelta(hours=1), Job(id, args=(9,)), QUEUE
        )
        worker.storage.mark_job_as_running(job_id, supervisor_id=other_id)
        worker.storage.mark_job_as_canceling(job_id)

        worker.check_jobs()

        assert ORMJob.objects.get(id=job_id).state == State.CANCELING

    def test_check_jobs_finalizes_unowned_canceling_jobs(self, worker):
        # Unowned CANCELING means canceled before pickup - any supervisor may
        # finalize it promptly (idempotent across peers).
        job_id = worker.storage.enqueue_in(
            datetime.timedelta(hours=1), Job(id, args=(9,)), QUEUE
        )
        worker.storage.mark_job_as_canceling(job_id)

        worker.check_jobs()

        assert ORMJob.objects.get(id=job_id).state == State.CANCELED

    def test_worker_execution_writes_are_fenced(self, worker):
        # The fence token must flow from the dispatching supervisor through
        # to the executing job, so that a job reclaimed by a peer mid-run has
        # its terminal write discarded rather than clobbering the peer's
        # claim.
        peer_id = worker.storage.register_supervisor(
            host="otherhost", process="9999", thread="8888"
        )
        job_id = worker.storage.enqueue_job(
            Job(_simulate_peer_reclaim, args=(peer_id,)), QUEUE
        )

        deadline = time.time() + 30
        while (
            ORMJob.objects.get(id=job_id).supervisor_id != peer_id
            or job_id in worker.future_job_mapping
        ):
            assert time.time() < deadline, "Job execution did not finish in time"
            time.sleep(0.1)
        # Give any unfenced straggler writes a chance to land before
        # asserting they did not.
        time.sleep(0.5)

        orm_job = ORMJob.objects.get(id=job_id)
        assert orm_job.state == State.RUNNING
        assert orm_job.supervisor_id == peer_id

    def test_completed_job_has_supervisor_id_cleared(self, worker):
        job = Job(id, args=(9,))
        job_id = worker.storage.enqueue_job(job, QUEUE)

        deadline = time.time() + 30
        while worker.storage.get_job(job_id).state != State.COMPLETED:
            assert time.time() < deadline, "Job did not complete within 30 seconds"
            time.sleep(0.1)

        assert ORMJob.objects.get(id=job_id).supervisor_id is None

    def test_startup_requeues_jobs_of_stale_supervisor(self):
        # A crashed predecessor's record goes quiet; once it passes the stale
        # threshold, a freshly started supervisor requeues its jobs at startup.
        storage = Storage()
        owner_id = storage.register_supervisor(
            host="otherhost", process="9999", thread="8888"
        )
        ORMSupervisor.objects.filter(id=owner_id).update(
            last_seen=local_now()
            - datetime.timedelta(
                seconds=OPTIONS["Tasks"]["SUPERVISOR_STALE_THRESHOLD"] + 1
            )
        )
        job_id = storage.enqueue_in(
            datetime.timedelta(hours=1), Job(id, args=(9,)), QUEUE
        )
        storage.mark_job_as_running(job_id, supervisor_id=owner_id)

        w = WorkerSupervisor(regular_workers=1, high_workers=1)
        try:
            orm_job = ORMJob.objects.get(id=job_id)
            assert orm_job.state == State.QUEUED
            assert orm_job.supervisor_id is None
            assert not ORMSupervisor.objects.filter(id=owner_id).exists()
        finally:
            w.storage.clear(force=True)
            w.shutdown()
            ORMSupervisor.objects.all().delete()
