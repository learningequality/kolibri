from django.test import TestCase

from kolibri.core.tasks.registry import _registry
from kolibri.core.tasks.registry import RegisteredTask


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
