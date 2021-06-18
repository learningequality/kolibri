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


class FunctionNotRegisteredAsJob(Exception):
    """
    Raised when task.permission_classes decorator is applied without
    first applying task.register decorator.
    """

    pass
