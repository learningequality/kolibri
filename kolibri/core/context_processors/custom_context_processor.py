import json

from django.conf import settings
from kolibri.auth.api import SessionViewSet


def return_session(request):
    return {'session': json.dumps(SessionViewSet().get_session(request)), 'kolibri': settings.KOLIBRI_CORE_JS_NAME}
