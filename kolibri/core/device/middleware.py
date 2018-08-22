from django.core.exceptions import MiddlewareNotUsed
from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.middleware.locale import LocaleMiddleware
from django.shortcuts import redirect
from django.utils import translation
from django.utils.deprecation import MiddlewareMixin

from .translation import get_language_from_request
from kolibri.core.device.hooks import SetupHook
from kolibri.core.device.utils import device_provisioned


class KolibriLocaleMiddleware(LocaleMiddleware):

    def process_request(self, request):
        language = get_language_from_request(request)
        translation.activate(language)
        request.LANGUAGE_CODE = translation.get_language()


class IgnoreGUIMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response
        # One-time configuration and initialization.

    def __call__(self, request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.

        response = self.get_response(request)

        # Code to be executed for each request/response after
        # the view is called.

        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.META.get("HTTP_USER_AGENT", None) == "Kolibri session":
            return HttpResponse('')
        return None


ALLOWED_PATH_LIST = [
    "kolibri:deviceprovision",
    "kolibri:setupwizardplugin:setupwizard",
    "kolibri:set_language",
    "kolibri:session-list"
]

SETUP_WIZARD_URLS = [hook.url for hook in SetupHook().registered_hooks]


class SetupMiddleware(MiddlewareMixin):
    """
    display the setup wizard if device is not provisioned
    """
    device_provisioned = False

    def __init__(self, get_response):
        self.get_response = get_response
        self.device_provisioned = self.device_provisioned or device_provisioned()
        if self.device_provisioned:
            # Device is already provisioned
            raise MiddlewareNotUsed('Device has already been provisioned, no setup redirect used')

    def process_request(self, request):
        # If a DevicePermissions with is_superuser has already been created, no need to do anything here
        self.device_provisioned = self.device_provisioned or device_provisioned()
        if self.device_provisioned:
            if any(map(lambda x: request.path.startswith(x), SETUP_WIZARD_URLS)):
                return redirect(reverse("kolibri:redirect_user"))
            return

        # Don't redirect for URLs that are required for the setup wizard
        allowed_paths = [reverse(name) for name in ALLOWED_PATH_LIST]
        if any(request.path.startswith(path_prefix) for path_prefix in allowed_paths):
            return
        if SETUP_WIZARD_URLS:
            # If we've gotten this far, we want to redirect to the setup wizard
            return redirect(SETUP_WIZARD_URLS[0])
