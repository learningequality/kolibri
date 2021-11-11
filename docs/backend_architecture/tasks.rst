Kolibri backend tasks system
=============================


Kolibri plugins and Django apps can use the backend tasks system to run time consuming processes
asynchronously outside of the HTTP request-response cycle. This frees the HTTP connection for client use.

The kolibri task system is implemented as a core Django app on ``kolibri.core.tasks``.


Defining tasks via ``@register_task`` decorator
------------------------------------------------


When Kolibri starts, the task backend searches for a module named ``tasks.py`` in every Django app and imports
them, there by that module gets to run.

When the ``tasks.py`` module gets run, functions decorated with ``@register_task`` decorator gets registered in the ``JobRegistry``.


The ``@register_task`` decorator is implemented in ``kolibri.core.tasks.decorators``. It registers the decorated
function as a task to the task backend system.

Kolibri plugins and kolibri's Django apps can pass several arguments to the decorator based on their needs.

- ``job_id (string)``: job's id.
- ``queue (string)``: queue in which the job should be enqueued.
- ``validator (callable)``: validator for the job. The details of how validator works is described later.
- ``priority ("high" or "regular")``: priority of the job. It can be ``"high"`` or ``"regular"``. ``"regular"`` priority is for tasks that can wait for some time before it actually starts executing. Tasks that are tracked on task manager should use this priority. ``"high"`` priority is for tasks that want execution as soon as possible. Tasks that might affect user experience (e.g. on screen loading animation) like importing channel metadata.
- ``cancellable (boolean)``: whether the job is cancellable or not.
- ``track_progress (boolean)``: whether to track progress of the job or not.
- ``permission_classes (Django Rest Framework's permission classes)``: a list of DRF permissions user should have in order to enqueue the job.


Example usage
~~~~~~~~~~~~~~


The below code sample shows how we can use the ``@register_task`` decorator to register a function as a task.

We will refer to below sample code in the later sections also.

.. code-block:: python

    from kolibri.core.tasks.decorators import register_task
    from kolibri.core.device.permissions import IsSuperuser

    def add_validator(req, req_data):
        assert isinstance(req_data["a"], int)
        assert isinstance(req_data["b"], int)
        return {
          "a": req_data["a"],
          "b": req_data["b"],
          "extra_metadata": {
            "user": "kolibri"
          }
        }

    @register_task(job_id="02", queue="maths", validator=add_validator, priority="high", cancellable=False, track_progress=True, permission_classes=[IsSuperuser])
    def add(a, b):
        return a + b


Enqueuing tasks via the ``POST /api/tasks/tasks/`` API endpoint
-----------------------------------------------------------------


To enqueue a task that is registered with the ``@register_task`` decorator we use ``POST /api/tasks/tasks/`` endpoint method defined
on ``kolibri.core.tasks.api.BaseViewSet.create``.

The request payload for ``POST /api/tasks/tasks/`` API endpoint should have:

- ``"task" (required)`` having value as string representing the dotted path to the function registered via the ``@register_task`` decorator.
- other key value pairs as per client's choice.

A valid request payload can be:

.. code-block:: python

    {
      "task": "kolibri.core.content.tasks.add",
      "a": 45,
      "b": 59
    }

A successful response looks like this:

.. code-block:: python

    {
      "status": "QUEUED",
      "exception": "",
      "traceback": "",
      "percentage": 0,
      "id": 1,
      "cancellable": False,
      "clearable": False,
    }

When we send a request to ``POST /api/tasks/tasks/`` API endpoint, first, we validate the payload. The request
payload **must** have a ``"task"`` parameter as string and the user should have the permissions mentioned on the
``permission_classes`` argument of decorator. If the user has permissions then we proceed.

Then, we check whether the ``"task"`` function has a validator associated with it or not. If it has a validator, it
gets run. The return value of the validator must be a dictionary. The dictionary is passed to the task function as keyword
arguments. We can add ``extra_metadata`` in the returning dictionary to set extra metadata for the job. If the validator raises
any exception, our API endpoint method will re raise it.

Once the validator is run and no exceptions are raised, we enqueue the ``"task"`` function. Depending on the
``priority`` of the task, the worker pool will run the task.
