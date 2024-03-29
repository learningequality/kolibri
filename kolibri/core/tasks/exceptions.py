from concurrent.futures import CancelledError


class UserCancelledError(CancelledError):
    """
    An error raised when the user cancels the current job.
    """

    pass


class JobNotFound(Exception):
    pass


class JobNotRestartable(Exception):
    pass


class JobRunning(Exception):
    pass


class JobNotRunning(Exception):
    pass
