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
from kolibri.core.tasks.job import JobRegistry
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import facility_queue
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.main import priority_queue
from kolibri.core.tasks.main import queue


logger = logging.getLogger(__name__)




class BaseViewSet(viewsets.ViewSet):
    queues = []
    permission_classes = []

    # Adding auth classes explicitly until we find a fix for BasicAuth not
    # working on tasks API (in dev settings).
    authentication_classes = [SessionAuthentication, BasicAuthentication]

    def initial(self, request, *args, **kwargs):
        if len(self.permission_classes) == 0:
            self.permission_classes = self.default_permission_classes()
        if self.permission_classes is None:
            self.permission_classes = []
        return super(BaseViewSet, self).initial(request, *args, **kwargs)

    def check_registered_job_permissions(self, request, registered_job, job=None):
        """
        Checks whether the `request` is allowed to proceed.

        If the user is not a superuser we check whether the job's `facility_id` matches
        that of the user. If it doesn't match we raise `PermissionDenied`.

        Other raises `PermissionDenied` if `request.user` is not allowed to proceed based
        on registered_job's permissions.
        """
        job_facility_id = None
        if job:
            job_facility_id = getattr(job, "job_facility_id", None)

        try:
            if not request.user.is_superuser and request.user.is_facility_user:
                if job_facility_id and job_facility_id != request.user.facility_id:
                    raise PermissionDenied
        except AttributeError:
            pass

        for permission in registered_job.permissions:
            if not permission.has_permission(request, self):
                raise PermissionDenied

    def validate_create_req_data(self, request):
        """
        Validates the request data received on POST /api/tasks/.

        If `task` parameter is absent or not a string type then `ValidationError` is raised.

        If `request.user` is authorized to initiate the `task` function, this returns
        a list of `request.data` otherwise raises `PermissionDenied`.
        """
        if isinstance(request.data, list):
            request_data_list = request.data
        else:
            request_data_list = [request.data]

        for request_data in request_data_list:
            if "task" not in request_data:
                raise serializers.ValidationError("The 'task' field is required.")
            if not isinstance(request_data["task"], string_types):
                raise serializers.ValidationError("The 'task' value must be a string.")

            funcstr = request_data.get("task")

            # Make sure the task is registered
            try:
                registered_job = JobRegistry.REGISTERED_JOBS[funcstr]
            except KeyError:
                raise serializers.ValidationError(
                    "'{funcstr}' is not registered.".format(funcstr=funcstr)
                )

            # Check permissions
            self.check_registered_job_permissions(request, registered_job)

        return request_data_list

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
                registered_job = JobRegistry.REGISTERED_JOBS[job.func]
                self.check_registered_job_permissions(request, registered_job, job)
                jobs_response.append(_job_to_response(job))
            except KeyError:
                # Note: Temporarily including unregistered tasks until we complete
                # our transition to to the new tasks API.
                # After completing transition to the new tasks API, we won't be
                # including unregistered tasks to the response list.
                jobs_response.append(_job_to_response(job))
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
            In the validator's returning dict we can add `extra_metadata` as a key value pair
            to set `extra_metadata` for the task.

            `extra_metadata` value must be of dict type.

            The `extra_metadata` dict is not passed to the `task` function.
        """
        request_data_list = self.validate_create_req_data(request)

        enqueued_jobs_response = []

        # Once we have validated all the tasks, we are good to go!
        for request_data in request_data_list:

            funcstr = request_data.pop("task")
            registered_job = JobRegistry.REGISTERED_JOBS[funcstr]

            # Run validator with `request` and `request_data` as its argument.
            if registered_job.validator is not None:
                try:
                    validator_result = registered_job.validator(request, request_data)
                except Exception as e:
                    raise e

                if not isinstance(validator_result, dict):
                    raise serializers.ValidationError("Validator must return a dict.")

                extra_metadata = validator_result.get("extra_metadata")
                if extra_metadata is not None and not isinstance(extra_metadata, dict):
                    raise serializers.ValidationError(
                        "In the dict returned by validator, 'extra_metadata' must be a dict."
                    )

                request_data = validator_result

            try:
                user_facility_id = request.user.facility_id
            except AttributeError:
                user_facility_id = None

            job_id = registered_job.enqueue(
                job_facility_id=user_facility_id, **request_data
            )
            enqueued_jobs_response.append(_job_to_response(job_storage.get_job(job_id)))

        if len(enqueued_jobs_response) == 1:
            enqueued_jobs_response = enqueued_jobs_response[0]

        return Response(enqueued_jobs_response)

    def retrieve(self, request, pk=None):
        """
        Retrieve a task by id only if `request.user` has permissions for it otherwise
        raises `PermissionDenied`.
        """
        try:
            job = job_storage.get_job(job_id=pk)
            registered_job = JobRegistry.REGISTERED_JOBS[job.func]
            self.check_registered_job_permissions(request, registered_job, job)
        except JobNotFound:
            raise Http404("Task with {pk} not found".format(pk=pk))
        except KeyError:
            # Note: Temporarily allowing unregistered tasks until we complete our transition to
            # to the new tasks API.
            # After completing our transition this should raise a ValidationError saying
            # the task is not registered.
            pass

        job_response = _job_to_response(job)
        return Response(job_response)

    @decorators.action(methods=["post"], detail=False)
    def restarttask(self, request):
        """
        Restarts a task with its task id given in the `task_id` parameter.
        """

        if "task_id" not in request.data:
            raise serializers.ValidationError("The 'task_id' field is required.")
        if not isinstance(request.data["task_id"], string_types):
            raise serializers.ValidationError("The 'task_id' should be a string.")

        job_to_restart_id = request.data.get("task_id")

        try:
            job_to_restart = job_storage.get_job(job_id=job_to_restart_id)
        except JobNotFound:
            raise Http404("Task with {pk} not found.".format(pk=job_to_restart_id))

        try:
            registered_job = JobRegistry.REGISTERED_JOBS[job_to_restart.func]
            self.check_registered_job_permissions(
                request, registered_job, job_to_restart
            )
        except KeyError:
            raise serializers.ValidationError(
                "'{funcstr}' is not registered.".format(funcstr=job_to_restart.func)
            )

        try:
            restarted_job_id = job_storage.restart_job(job_id=job_to_restart.job_id)
        except JobNotRestartable:
            raise serializers.ValidationError(
                "Cannot restart job with state={}".format(job_to_restart.state)
            )

        job_response = _job_to_response(job_storage.get_job(job_id=restarted_job_id))
        return Response(job_response)

    def destroy(self, request, pk=None):
        # unimplemented for now.
        pass

    @decorators.action(methods=["post"], detail=False)
    def canceltask(self, request):
        """
        Cancel a task with its task id given in the task_id parameter.
        """

        if "task_id" not in request.data:
            raise serializers.ValidationError("The 'task_id' field is required.")
        if not isinstance(request.data["task_id"], string_types):
            raise serializers.ValidationError("The 'task_id' should be a string.")

        for _queue in self.queues:
            try:
                _queue.cancel(request.data["task_id"])
                break
            except JobNotFound:
                continue

        return Response({})

    @decorators.action(methods=["post"], detail=False)
    def cleartasks(self, request):
        """
        Cancels all running tasks.
        """

        for _queue in self.queues:
            _queue.empty()

        return Response({})

    @decorators.action(methods=["post"], detail=False)
    def cleartask(self, request):
        # Given a single task ID, clear it from the queue
        task_id = request.data.get("task_id")
        if not task_id:
            return Response({})

        for _queue in self.queues:
            _queue.clear_job(task_id)

        return Response({"task_id": task_id})

    @decorators.action(methods=["post"], detail=False)
    def deletefinishedtasks(self, request):
        """
        Delete all tasks that have succeeded, failed, or been cancelled.
        """
        task_id = request.data.get("task_id")
        if task_id:
            for _queue in self.queues:
                _queue.clear_job(task_id)
        else:
            for _queue in self.queues:
                _queue.clear()
        return Response({})

            raise serializers.ValidationError(
            )



        """

        """

            raise serializers.ValidationError(
            )



    @decorators.action(methods=["post"], detail=False)
        """
        """


def _job_to_response(job):
    if not job:
        return {
            "type": None,
            "started_by": None,
            "status": State.SCHEDULED,
            "percentage": 0,
            "progress": [],
            "id": None,
            "cancellable": False,
            "clearable": False,
        }
    output = {
        "status": job.state,
        "exception": str(job.exception),
        "traceback": str(job.traceback),
        "percentage": job.percentage_progress,
        "id": job.job_id,
        "cancellable": job.cancellable,
        "clearable": job.state in [State.FAILED, State.CANCELED, State.COMPLETED],
    }
    output.update(job.extra_metadata)
    return output
