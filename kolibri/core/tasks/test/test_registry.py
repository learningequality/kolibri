from unittest import mock

from django.test import TestCase

from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.registry import _registry
from kolibri.core.tasks.registry import RegisteredTask
from kolibri.core.tasks.schedules import Enqueue
from kolibri.core.tasks.schedules import Schedule


def _task():
    return RegisteredTask(lambda: None)


class TestRegistryUpdate(TestCase):
    def test_update_from_mapping_populates_entries(self):
        reg = _registry()
        task_a, task_b = _task(), _task()

        reg.update({"a": task_a, "b": task_b})

        self.assertIs(dict.__getitem__(reg, "a"), task_a)
        self.assertIs(dict.__getitem__(reg, "b"), task_b)

    def test_update_from_iterable_of_pairs_populates_entries(self):
        reg = _registry()
        task = _task()

        reg.update([("k", task)])

        self.assertIs(dict.__getitem__(reg, "k"), task)

    def test_update_enforces_registered_task_value_type(self):
        reg = _registry()

        with self.assertRaises(TypeError):
            reg.update({"k": "not a RegisteredTask"})


class TestScheduleAttr(TestCase):
    def test_schedule_stored(self):
        s = Enqueue()
        self.assertIs(RegisteredTask(lambda: None, schedule=s).schedule, s)

    def test_schedule_must_be_schedule_or_none(self):
        with self.assertRaises(TypeError):
            RegisteredTask(lambda: None, schedule=True)


class TestApplySchedules(TestCase):
    def _reg_with_tasks(self, *tasks):
        reg = _registry()
        for i, task in enumerate(tasks):
            dict.__setitem__(reg, str(i), task)
        return reg

    def test_skips_tasks_with_no_schedule(self):
        s = mock.create_autospec(Schedule, instance=True)
        scheduled = RegisteredTask(lambda: None, schedule=s)
        plain = RegisteredTask(lambda: None)
        reg = self._reg_with_tasks(scheduled, plain)

        with mock.patch.object(reg, "_initialize"):
            reg.apply_schedules()

        s.apply.assert_called_once_with(scheduled)

    def test_swallows_job_running(self):
        s = mock.create_autospec(Schedule, instance=True)
        s.apply.side_effect = JobRunning
        task = RegisteredTask(lambda: None, schedule=s)
        reg = self._reg_with_tasks(task)

        with mock.patch.object(reg, "_initialize"):
            reg.apply_schedules()  # must not raise
