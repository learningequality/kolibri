import time

from django.utils.functional import wraps


def retry(exceptions, tries=3, delay=1, backoff=2):
    """
    A decorator that retries a function with exponential backoff.

    :param exceptions: An exception or tuple of exceptions to catch.
    :param tries: Total number of times to try the function.
    :param delay: Initial delay between retries in seconds.
    :param backoff: Multiplier applied to delay after each retry.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            attempt_tries, attempt_delay = tries, delay
            while attempt_tries > 1:
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    time.sleep(attempt_delay)
                    attempt_tries -= 1
                    attempt_delay *= backoff

            return func(*args, **kwargs)  # Final attempt without catching

        return wrapper

    return decorator
