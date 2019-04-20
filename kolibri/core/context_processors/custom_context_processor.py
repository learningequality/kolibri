from django.conf import settings


def developer_mode(request):
    return {"developer_mode": getattr(settings, "DEVELOPER_MODE", False)}
