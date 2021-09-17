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


class ErrorSavedWithJob(Exception):
    def __init__(self, message, prior_type):
        if message is None or message == "":
            message = "This job had an error before it was saved to the database."
        self.prior_type = prior_type
        super().__init__(message)


    def __str__(self):
        return "{} Exception type: {}".format(self.message, self.prior_type)
