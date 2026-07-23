from unittest import mock

import task_reconciler


def _make_work_info(request_id, tags):
    """Build a fake WorkInfo whose getId()/getTags() mirror the Java bridge."""
    work_info = mock.MagicMock()
    work_info.getId.return_value = request_id
    work_info.getTags.return_value.toArray.return_value = list(tags)
    return work_info


def test_extract_work_ids_splits_job_ids_and_request_ids():
    work_infos = [
        _make_work_info(
            "req-a",
            [
                "kolibri:job:job-a",
                "org.learningequality.Kolibri.task.TaskWorker",
            ],
        ),
        _make_work_info(
            "req-b",
            [
                "kolibri:job:job-b",
                "androidx.work.impl.workers.SomeWorker",
            ],
        ),
    ]

    job_ids, request_ids = task_reconciler._extract_work_ids(work_infos)

    assert job_ids == {"job-a", "job-b"}
    assert request_ids == {"req-a", "req-b"}


def test_do_reconciliation_reconciles_stalled_jobs_first_with_live_set():
    request_ids = {"req-a", "req-b"}
    manager = mock.Mock()

    with (
        mock.patch.object(task_reconciler, "job_storage") as job_storage,
        mock.patch.object(
            task_reconciler,
            "_get_active_work",
            return_value=(set(), request_ids),
        ),
        mock.patch.object(
            task_reconciler, "_get_kolibri_active_jobs", return_value={}
        ) as get_kolibri_active_jobs,
    ):
        manager.attach_mock(
            job_storage.reconcile_stalled_jobs, "reconcile_stalled_jobs"
        )
        manager.attach_mock(get_kolibri_active_jobs, "get_kolibri_active_jobs")

        task_reconciler._do_reconciliation()

    job_storage.reconcile_stalled_jobs.assert_called_once_with(
        live_supervisor_ids=request_ids
    )

    call_names = [c[0] for c in manager.mock_calls]
    assert call_names.index("reconcile_stalled_jobs") < call_names.index(
        "get_kolibri_active_jobs"
    )
