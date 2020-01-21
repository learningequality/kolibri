from django.utils import timezone


def local_now():
    return timezone.localtime(timezone.now())


def naive_utc_datetime(dt):
    return timezone.make_naive(dt, timezone=timezone.utc)
