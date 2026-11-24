import pytest

from kolibri.core.tasks.registry import TaskRegistry


@pytest.fixture(autouse=True, scope="module")
def restore_task_registry():
    registered_tasks = TaskRegistry.copy()
    yield
    TaskRegistry.clear()
    TaskRegistry.update(registered_tasks)
