from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from kolibri.auth.models import DeviceOwner


class SetupWizardMiddleware():
    """
    display the superuser creation app if no superuser exists.
    """
    has_superuser = False

    def process_request(self, request):
        if request.path.startswith(reverse("facility-list")) or request.path.startswith(reverse("deviceowner-list")):
            pass  # the api endpoint to create DeviceOwner
        elif not self.has_superuser and not request.path.startswith(reverse("kolibri:setupwizardplugin:setupwizard")):
            if DeviceOwner.objects.count() < 1:
                # no superuser exists, redirect to the DeviceOwner creation UI
                return redirect(reverse("kolibri:setupwizardplugin:setupwizard"))
            else:
                self.has_superuser = True
