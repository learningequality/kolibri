from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin
from kolibri.core.device.utils import device_provisioned

ALLOWED_PATH_LIST = [
    "deviceprovision",
    "kolibri:setupwizardplugin:setupwizard",
    "kolibri:set_language",
    "session-list"
]


class SetupWizardMiddleware(MiddlewareMixin):
    """
    display the setup wizard if device is not provisioned
    """
    device_provisioned = False

    def process_request(self, request):
        # If a DevicePermissions with is_superuser has already been created, no need to do anything here
        self.device_provisioned = self.device_provisioned or device_provisioned()
        if self.device_provisioned:
            if request.path.startswith(reverse("kolibri:setupwizardplugin:setupwizard")):
                return redirect(reverse("kolibri:learnplugin:learn"))
            return

        # Don't redirect for URLs that are required for the setup wizard
        allowed_paths = [reverse(name) for name in ALLOWED_PATH_LIST]
        if any(request.path.startswith(path_prefix) for path_prefix in allowed_paths):
            return

        # If we've gotten this far, we want to redirect to the setup wizard
        return redirect(reverse("kolibri:setupwizardplugin:setupwizard"))
