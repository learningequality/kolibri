import logging

from django.http.response import Http404
from django.utils.decorators import method_decorator
from django.utils.timezone import make_aware
from django.views.decorators.csrf import csrf_protect
from pytz import utc
from rest_framework import decorators
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.exceptions import JobRunning
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.registry import TaskRegistry
from kolibri.core.tasks.validation import EnqueueArgsSerializer


logger = logging.getLogger(__name__)


class TasksSerializer(serializers.Serializer):
    """
    At the moment this is purely for documentation purposes.
    We generate a dummy serializer class that contains fields corresponding to each
    of the tasks in the registry.
    """

    def get_fields(self):
        fields = {}
        for task_name, registered_task in TaskRegistry.items():
            field = registered_task.validator(
                required=False, label=task_name, allow_null=True
            )
            fields[task_name] = field

        return fields


@method_decorator(csrf_protect, name="dispatch")
class TasksViewSet(viewsets.GenericViewSet):
    serializer_class = TasksSerializer

    def get_queryset(self):
        """
        Add this purely to avoid warnings from DRF YASG schema generation.
        """
        return None

    def validate_create_req_data(self, request):
        """
        Validates the request data received on POST /api/tasks/.

        If `type` parameter is absent or not a string type then `ValidationError` is raised.

        If `request.user` is authorized to initiate the `task` function, this returns
        a list of `request.data` otherwise raises `PermissionDenied`.
        """
        if isinstance(request.data, list):
            request_data_list = request.data
        else:
            request_data_list = [request.data]

        validated_jobs = []

        for request_data in request_data_list:
            # Make sure the task is registered.
            registered_task = TaskRegistry.validate_task(request_data.get("type"))

            # Make sure the job's data is valid along with `enqueue_args`.
            job, enqueue_args = registered_task.validate_job_data(
                request.user, request_data
            )

            # Make sure the user has permission to enqueue this job.
            registered_task.check_job_permissions(request.user, job, self)

            # OK - the task passed all our validation, it's good to go!
            validated_jobs.append((registered_task, job, enqueue_args))

        return validated_jobs

    def _job_to_response(self, job):
        orm_job = job_storage.get_orm_job(job_id=job.job_id)
        output = {
            "status": job.state,
            "type": job.func,
            "exception": job.exception,
            "traceback": job.traceback,
            "percentage": job.percentage_progress,
            "id": job.job_id,
            "cancellable": job.cancellable,
            "clearable": job.state in [State.FAILED, State.CANCELED, State.COMPLETED],
            "facility_id": job.facility_id,
            "args": job.args,
            "kwargs": job.kwargs,
            "extra_metadata": job.extra_metadata,
            # Output is UTC naive, coerce to UTC aware.
            "scheduled_datetime": make_aware(orm_job.scheduled_time, utc).isoformat(),
            "repeat": orm_job.repeat,
            "repeat_interval": orm_job.interval,
            "retry_interval": orm_job.retry_interval,
        }
        return output

    def _handle_repeat_query_param(self, repeating):
        if repeating == "true":
            return True
        elif repeating == "false":
            return False
        else:
            return None

    def list(self, request):
        """
        Returns a list of jobs that `request.user` has permissions for.

        Accepts a query parameter named `queue` that filters jobs by `queue`.
        """
        queue = request.query_params.get("queue", None)

        repeating = self._handle_repeat_query_param(
            repeating=request.query_params.get("repeating", None)
        )

        all_jobs = job_storage.get_all_jobs(queue=queue, repeating=repeating)

        jobs_response = []
        for job in all_jobs:
            try:
                registered_task = TaskRegistry[job.func]
                registered_task.check_job_permissions(request.user, job, self)
                jobs_response.append(self._job_to_response(job))
            except KeyError:
                # Note: Temporarily including unregistered tasks until we complete
                # our transition to to the new tasks API.
                # After completing transition to the new tasks API, we won't be
                # including unregistered tasks to the response list.
                jobs_response.append(self._job_to_response(job))
            except PermissionDenied:
                # `request.user` do not have permission for this job hence
                # we we will NOT append this job to the list.
                pass

        return Response(jobs_response)

    def _enqueue_job_based_on_enqueue_args(self, registered_task, job, enqueue_args):
        """
        Enqueues job based on `enqueue_args` arguments.
        """
        if enqueue_args.get("enqueue_at"):
            return job_storage.enqueue_at(
                enqueue_args["enqueue_at"],
                job,
                queue=registered_task.queue,
                priority=enqueue_args.get("priority", registered_task.priority),
                interval=enqueue_args.get("repeat_interval", 0),
                repeat=enqueue_args.get("repeat", 0),
                retry_interval=enqueue_args.get("retry_interval", None),
            )
        elif enqueue_args.get("enqueue_in"):
            return job_storage.enqueue_in(
                enqueue_args["enqueue_in"],
                job,
                queue=registered_task.queue,
                priority=enqueue_args.get("priority", registered_task.priority),
                interval=enqueue_args.get("repeat_interval", 0),
                repeat=enqueue_args.get("repeat", 0),
                retry_interval=enqueue_args.get("retry_interval", None),
            )
        return job_storage.enqueue_job(
            job,
            queue=registered_task.queue,
            priority=enqueue_args.get("priority", registered_task.priority),
            retry_interval=enqueue_args.get("retry_interval", None),
        )

    def create(self, request):
        """
        Enqueue or schedule a registered task for async processing.

        If the registered task has a validator then that validator is run with the
        `request` object and the corresponding `request.data` as its arguments. The dict
        returned by the validator is passed as keyword arguments to the task function.

        If the registered task has no validator then `request.data` is passed as keyword
        arguments to the task function.

        API endpoint:
            POST /api/tasks/tasks/

        Request payload parameters:
            - `type` (required): a string representing the dotted path to task function.
            - `enqueue_args` (optional): a dict for modifying enqueue behaviour.
            - Other key value pairs.

        Keep in mind:
            In the validator's returning dict we can add any valid keyword arguments for the Job
            object, including args, kwargs, and extra_metadata.
        """
        validated_data = self.validate_create_req_data(request)
        enqueued_jobs_response = []

        # Once we have validated all the tasks, we are good to go!
        for registered_task, job, enqueue_args in validated_data:
            job_id = self._enqueue_job_based_on_enqueue_args(
                registered_task, job, enqueue_args
            )

            enqueued_jobs_response.append(
                self._job_to_response(job_storage.get_job(job_id))
            )

        if len(enqueued_jobs_response) == 1:
            enqueued_jobs_response = enqueued_jobs_response[0]

        return Response(enqueued_jobs_response)

    def _get_job_for_pk(self, request, pk):
        try:
            if not isinstance(pk, str):
                raise JobNotFound
            job = job_storage.get_job(job_id=pk)
            registered_task = TaskRegistry[job.func]
            registered_task.check_job_permissions(request.user, job, self)
        except JobNotFound:
            raise Http404("Job with {pk} not found".format(pk=pk))
        except KeyError:
            raise Http404(
                "Job with {pk} found but '{funcstr}' is not registered.".format(
                    pk=pk, funcstr=job.func
                )
            )
        return job

    def retrieve(self, request, pk=None):
        """
        Retrieve a task by id only if `request.user` has permissions for it otherwise
        raises `PermissionDenied`.
        """
        return Response(self._job_to_response(self._get_job_for_pk(request, pk)))

    def update(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        job = self._get_job_for_pk(request, pk)
        # Don't pass partial to the serializer, as for simplicity, we want to
        # require a complete set of arguments for updating the enqueue_args.
        serializer = EnqueueArgsSerializer(data=request.data.pop("enqueue_args"))
        serializer.is_valid(raise_exception=True)
        try:
            self._enqueue_job_based_on_enqueue_args(
                job.task, job, serializer.validated_data
            )
        except JobRunning:
            return Response("Job is already running", status=status.HTTP_409_CONFLICT)

        return self.retrieve(request, pk=pk)

    def delete(self, request, pk=None):
        """
        Delete a task.
        """
        job_to_clear = self._get_job_for_pk(request, pk)

        if job_to_clear.state == State.RUNNING:
            raise serializers.ValidationError(
                "Cannot delete job with state: {}".format(job_to_clear.state)
            )

        job_storage.clear(job_id=job_to_clear.job_id, force=True)

        return Response({})

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @decorators.action(methods=["post"], detail=True)
    def restart(self, request, pk=None):
        """
        Restarts a job with its job id given in the url parameter.
        """

        job_to_restart = self._get_job_for_pk(request, pk)

        try:
            restarted_job_id = job_storage.restart_job(job_id=job_to_restart.job_id)
        except JobNotRestartable:
            raise serializers.ValidationError(
                "Cannot restart job with state: {}".format(job_to_restart.state)
            )

        job_response = self._job_to_response(
            job_storage.get_job(job_id=restarted_job_id)
        )
        return Response(job_response)

    @decorators.action(methods=["post"], detail=True)
    def cancel(self, request, pk=None):
        """
        Cancel a task with its job id given in the url parameter.
        """
        job_to_cancel = self._get_job_for_pk(request, pk)

        if not job_to_cancel.cancellable:
            raise serializers.ValidationError(
                "Cannot cancel job for task: {}".format(job_to_cancel.func)
            )

        job_storage.cancel(job_id=job_to_cancel.job_id)

        return Response({})

    @decorators.action(methods=["post"], detail=True)
    def clear(self, request, pk=None):
        """
        Delete a task that has succeeded, failed, or been cancelled.
        """
        job_to_clear = self._get_job_for_pk(request, pk)

        if job_to_clear.state not in (State.COMPLETED, State.FAILED, State.CANCELED):
            raise serializers.ValidationError(
                "Cannot clear job with state: {}".format(job_to_clear.state)
            )

        job_storage.clear(job_id=job_to_clear.job_id)

        return Response({})

    @decorators.action(methods=["post"], detail=False)
    def clearall(self, request):
        """
        Delete all tasks that have succeeded, failed, or been cancelled.
        """
        queue = request.data.get("queue", None)
        job_storage.clear(queue=queue)
        return Response({})
