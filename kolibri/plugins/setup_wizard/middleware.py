from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from kolibri.auth.models import DeviceOwner


class SetupWizardMiddleware():
    """
    display the superuser creation app if no superuser exists.
    """
    deviceowner_already_created = False

    def process_request(self, request):
        # If a DeviceOwner has already been created, no need to do anything here
        self.deviceowner_already_created = self.deviceowner_already_created or DeviceOwner.objects.exists()
        if self.deviceowner_already_created:
            return

        # Don't redirect for URLs that are required for the setup wizard
        allowed_paths = [reverse(name) for name in ["facility-list", "deviceowner-list", "kolibri:setupwizardplugin:setupwizard"]]
        if any(request.path.startswith(path_prefix) for path_prefix in allowed_paths):
            return

        # If we've gotten this far, we want to redirect to the setup wizard
        return redirect(reverse("kolibri:setupwizardplugin:setupwizard"))
