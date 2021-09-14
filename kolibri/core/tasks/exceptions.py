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

class JobSavedWithError(Exception):
    def __init__(self, prior_type, message="This job had an error before it was saved to the database."):
        self.prior_type = prior_type
        super().__init__(message)
    def __str__(self):
        return "{} Exception type: {}".format(self.message, self.prior_type)
