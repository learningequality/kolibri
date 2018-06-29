from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin

from kolibri.core.device.utils import device_provisioned

ALLOWED_PATH_LIST = [
    "deviceprovision",
    "kolibri:setupwizardplugin:setupwizard",
    "kolibri:set_language",
    "session-list"
]

SETUP_WIZARD_URL = reverse("kolibri:setupwizardplugin:setupwizard")

# Workaround for https://github.com/learningequality/kolibri/issues/3852
# Uses a meta tag redirect rather than a 302 to prevent extra load by Windows GUI polling
redirect_page_content = """
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="refresh" content="0;URL='{url}'" />
  </head>
</html>
""".format(url=SETUP_WIZARD_URL)


class SetupWizardMiddleware(MiddlewareMixin):
    """
    display the setup wizard if device is not provisioned
    """
    device_provisioned = False

    def process_request(self, request):
        # If a DevicePermissions with is_superuser has already been created, no need to do anything here
        self.device_provisioned = self.device_provisioned or device_provisioned()
        if self.device_provisioned:
            if request.path.startswith(SETUP_WIZARD_URL):
                return redirect(reverse("kolibri:learnplugin:learn"))
            return

        # Don't redirect for URLs that are required for the setup wizard
        allowed_paths = [reverse(name) for name in ALLOWED_PATH_LIST]
        if any(request.path.startswith(path_prefix) for path_prefix in allowed_paths):
            return

        # If we've gotten this far, we want to redirect to the setup wizard
        return HttpResponse(redirect_page_content)
