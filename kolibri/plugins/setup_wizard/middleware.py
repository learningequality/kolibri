from django.shortcuts import redirect
from kolibri.auth.models import DeviceOwner


# from .views import SetupWizardView


class SetupWizardMiddleware():
    """
    display the superuser creation app if no superuser exists.
    """
    has_superuser = False

    def process_request(self, request):
        if request.path_info == '/setup_wizard/create_deviceowner_api/':
            pass
        elif not self.has_superuser and not request.path_info == '/setup_wizard/create_deviceowner_view/':
            if DeviceOwner.objects.count() < 1:
                # no superuser exists
                return redirect('http://' + request.META['HTTP_HOST'] + '/setup_wizard/create_deviceowner_view/')
            else:
                self.has_superuser = True
