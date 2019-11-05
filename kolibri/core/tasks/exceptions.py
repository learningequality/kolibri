from concurrent.futures import CancelledError


class UserCancelledError(CancelledError):
    """
    An error raised when the user cancels the current job.
    """

    pass


class JobNotFound(Exception):
    pass
