from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.storage import Storage

DEFAULT_QUEUE = "ICEQUBE_DEFAULT_QUEUE"


class Queue(object):
    def __init__(self, queue=DEFAULT_QUEUE, connection=None):
        if connection is None:
            raise ValueError("Connection must be defined")
        self.name = queue
        self.storage = Storage(connection)

    def __len__(self):
        return self.storage.count_all_jobs(self.name)

    @property
    def job_ids(self):
        return [job.job_id for job in self.storage.get_all_jobs(self.name)]

    @property
    def jobs(self):
        """
        Return all the jobs scheduled, queued, running, failed or completed.
        Returns: A list of all jobs.

        """
        return self.storage.get_all_jobs(self.name)

    def enqueue(self, func, *args, **kwargs):
        """
        Enqueues a function func for execution.

        One special parameter is track_progress. If passed in and not None, the func will be passed in a
        keyword parameter called update_progress:

        def update_progress(progress, total_progress, stage=""):

        The running function can call the update_progress function to notify interested parties of the function's
        current progress.

        Another special parameter is the "cancellable" keyword parameter. When passed in and not None, a special
        "check_for_cancel" parameter is passed in. When called, it raises an error when the user has requested a job
        to be cancelled.

        The caller can also pass in any pickleable object into the "extra_metadata" parameter. This data is stored
        within the job and can be retrieved when the job status is queried.

        All other parameters are directly passed to the function when it starts running.

        :type func: callable or str
        :param func: A callable object that will be scheduled for running.
        :return: a string representing the job_id.
        """

        # if the func is already a job object, just schedule that directly.
        if isinstance(func, Job):
            job = func
        # else, turn it into a job first.
        else:
            job = Job(func, *args, **kwargs)

        job.state = State.QUEUED

        job_id = self.storage.enqueue_job(job, self.name)
        return job_id

    def cancel(self, job_id):
        """
        Mark a job as canceling, and let the worker pick this up to initiate
        the cancel of the job.

        :param job_id: the job_id of the Job to cancel.
        """
        self.storage.mark_job_as_canceling(job_id)

    def fetch_job(self, job_id):
        """
        Returns a Job object corresponding to the job_id. From there, you can query for the following attributes:

        - function string to run
        - its current state (see Job.State for the list of states)
        - progress (returning an int), total_progress (returning an int), and percentage_progress
        (derived from running job.progress/total_progress)
        - the job.exception and job.traceback, if the job's function returned an error

        :param job_id: the job_id to get the Job object for
        :return: the Job object corresponding to the job_id
        """
        return self.storage.get_job(job_id)

    def empty(self):
        """
        Clear all jobs.
        """
        self.storage.clear(force=True, queue=self.name)

    def clear(self):
        """
        Clear all succeeded, failed, or cancelled jobs.
        """
        self.storage.clear(force=False, queue=self.name)

    def clear_job(self, job_id):
        """
        Clear a job if it has succeeded, failed, or been cancelled.
        :type job_id: str
        :param job_id: id of job to clear.
        """
        self.storage.clear(job_id=job_id, force=False)
