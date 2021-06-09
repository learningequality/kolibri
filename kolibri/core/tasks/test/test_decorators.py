import pytest

from kolibri.core.tasks.decorators import task
from kolibri.core.tasks.exceptions import FunctionNotRegisteredAsJob
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import RegisteredJob
from kolibri.core.tasks.utils import stringify_func


@pytest.fixture
def registered_jobs():
    JobRegistry.REGISTERED_JOBS.clear()
    yield JobRegistry.REGISTERED_JOBS
    JobRegistry.REGISTERED_JOBS.clear()


class TestTaskDecorators(object):
    def test_task_register_without_args(self, registered_jobs):
        @task.register
        def add(x, y):
            return x + y

        @task.register()
        def subtract(x, y):
            return x - y

        add_funcstr = stringify_func(add)
        subtract_funcstr = stringify_func(subtract)

        assert isinstance(registered_jobs[add_funcstr], RegisteredJob)
        assert isinstance(registered_jobs[subtract_funcstr], RegisteredJob)

    def test_task_register_with_args(self, registered_jobs):
        @task.register(
            job_id="test", validator=id, permission=id, priority=task.priority.HIGH
        )
        def add(x, y):
            return x + y

        add_funcstr = stringify_func(add)

        assert isinstance(registered_jobs[add_funcstr], RegisteredJob)

        assert add.task.job_id == "test"
        assert add.task.validator == id
        assert add.task.permission == id
        assert add.task.priority == task.priority.HIGH

    def test_task_config_without_args(self, registered_jobs):
        @task.config
        @task.register
        def add(x, y):
            return x + y

        @task.config()
        @task.register
        def subtract(x, y):
            return x - y

        assert add.task.group is None
        assert add.task.track_progress is False
        assert add.task.cancellable is False

        assert subtract.task.group is None
        assert subtract.task.track_progress is False
        assert subtract.task.cancellable is False

    def test_config_with_args(self, registered_jobs):
        @task.config(group="math", cancellable=True, track_progress=True)
        @task.register
        def add(x, y):
            return x + y

        assert add.task.group == "math"
        assert add.task.cancellable is True
        assert add.task.track_progress is True

    def test_task_config_without_register(self, registered_jobs):
        with pytest.raises(FunctionNotRegisteredAsJob):

            @task.config
            def add(x, y):
                return x + y

    def test_task_register_config_preserves_functionality(self, registered_jobs):
        @task.config
        @task.register
        def add(x, y):
            return x + y

        assert add(2, 40) == 42
