from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from kolibri.auth.models import DeviceOwner


ALLOWED_PATH_LIST = [
    "facility-list",
    "deviceowner-list",
    "kolibri:setupwizardplugin:setupwizard",
    "task-localdrive",
    "task-startremoteimport",
    "task-list",
    "session-list"
]


class SetupWizardMiddleware():
    """
    display the superuser creation app if no superuser exists.
    """
    deviceowner_already_created = False

    def process_request(self, request):
        # If a DeviceOwner has already been created, no need to do anything here
        self.deviceowner_already_created = self.deviceowner_already_created or DeviceOwner.objects.exists()
        if self.deviceowner_already_created:
            if request.path.startswith(reverse("kolibri:setupwizardplugin:setupwizard")):
                return redirect(reverse("kolibri:learnplugin:learn"))
            return

        # Don't redirect for URLs that are required for the setup wizard
        allowed_paths = [reverse(name) for name in ALLOWED_PATH_LIST]
        if any(request.path.startswith(path_prefix) for path_prefix in allowed_paths):
            return

        # If we've gotten this far, we want to redirect to the setup wizard
        return redirect(reverse("kolibri:setupwizardplugin:setupwizard"))
