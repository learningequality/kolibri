from django.utils import timezone


def local_now():
    return timezone.localtime(timezone.now())
