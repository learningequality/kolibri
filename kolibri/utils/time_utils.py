from django.utils import timezone


def local_now():
    """
    Returns the current time in the local timezone.
    """
    return timezone.localtime(timezone.now())


def utc_now():
    """
    Returns the current time in the UTC timezone.
    """
    return timezone.now()


def naive_utc_datetime(dt):
    return timezone.make_naive(dt, timezone=timezone.utc)
