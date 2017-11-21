import json

from django.conf import settings
from kolibri.auth.api import SessionViewSet


def return_session(request):
    return {'session': json.dumps(SessionViewSet().get_session(request)), 'kolibri': settings.KOLIBRI_CORE_JS_NAME}

def supported_browser(request):
    if 'supported_browser' not in request.session:

        is_ie = 'msie' in request.META['HTTP_USER_AGENT'].lower()
        if is_ie:
            ie_version = int(request.META['HTTP_USER_AGENT'].lower().split('msie')[1].split('.')[0].strip())
            request.session['supported_browser'] = ie_version > 10
        else:
            request.session['supported_browser'] = True
    return {'supported_browser': request.session['supported_browser']}
