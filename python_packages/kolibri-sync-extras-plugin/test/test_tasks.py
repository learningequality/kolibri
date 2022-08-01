from .base import BaseTestCase
from kolibri_sync_extras_plugin.tasks import get_job_id
from kolibri_sync_extras_plugin.tasks import get_job_key
from kolibri_sync_extras_plugin.tasks import set_job_id


class TasksTestCase(BaseTestCase):
    def test_get_job_key(self):
        self.assertEqual("def456_dequeuing_job_id", get_job_key(self.context))

    def test_get_job_id(self):
        self.sync_session.extra_fields = '{"def456_dequeuing_job_id": "xyz789"}'
        self.assertEqual("xyz789", get_job_id(self.context))

    def test_set_job_id(self):
        set_job_id(self.context, "xyz789")
        self.assertEqual(
            '{"def456_dequeuing_job_id": "xyz789"}', self.sync_session.extra_fields
        )
        self.sync_session.save.assert_called_once()
