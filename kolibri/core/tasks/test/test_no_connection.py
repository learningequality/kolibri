import pytest


@pytest.mark.django_db(databases="__all__", transaction=True)
def test_importing_job_storage_no_open_connection():
    from kolibri.core.tasks.main import job_storage

    job_storage.clear(force=True)
