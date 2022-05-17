import logging

from django.http.response import Http404
from rest_framework import decorators
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from six import string_types

from kolibri.core.tasks.exceptions import JobNotFound
from kolibri.core.tasks.exceptions import JobNotRestartable
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.registry import TaskRegistry


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


class TasksViewSet(viewsets.GenericViewSet):
    serializer_class = TasksSerializer

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
            # Make sure the task is registered
            registered_task = TaskRegistry.validate_task(request_data.get("type"))

            job = registered_task.validate_job_data(request.user, request_data)

            registered_task.check_job_permissions(request.user, job, self)

            validated_jobs.append((registered_task, job))

        return validated_jobs

    def _job_to_response(self, job):
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
            "extra_metadata": job.extra_metadata,
        }
        return output

    def list(self, request):
        """
        Returns a list of jobs that `request.user` has permissions for.

        Accepts a query parameter named `queue` that filters jobs by `queue`.
        """
        queue = request.query_params.get("queue", None)

        all_jobs = job_storage.get_all_jobs(queue=queue)

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

    def create(self, request):
        """
        Enqueues a registered task for async processing.

        If the registered task has a validator then that validator is run with the
        `request` object and the corresponding `request.data` as its arguments. The dict
        returned by the validator is passed as keyword arguments to the task function.

        If the registered task has no validator then `request.data` is passed as keyword
        arguments to the task function.

        API endpoint:
            POST /api/tasks/tasks/

        Request payload parameters:
            - `task` (required): a string representing the dotted path to task function.
            - Other key value pairs.

        Keep in mind:
            In the validator's returning dict we can add any valid keyword arguments for the Job
            object, including args, kwargs, and extra_metadata.
        """
        validated_data = self.validate_create_req_data(request)

        enqueued_jobs_response = []

        # Once we have validated all the tasks, we are good to go!
        for registered_task, job in validated_data:
            # Use job_storage to enqueue rather than using the registered_task wrapper
            # for ease of testing, so we only have to mock job_storage once.
            job_id = job_storage.enqueue_job(
                job, queue=registered_task.queue, priority=registered_task.priority
            )
            enqueued_jobs_response.append(
                self._job_to_response(job_storage.get_job(job_id))
            )

        if len(enqueued_jobs_response) == 1:
            enqueued_jobs_response = enqueued_jobs_response[0]

        return Response(enqueued_jobs_response)

    def _get_job_for_pk(self, request, pk):
        try:
            if not isinstance(pk, string_types):
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

        job_storage.cancel_job(job_id=job_to_cancel.job_id)

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
