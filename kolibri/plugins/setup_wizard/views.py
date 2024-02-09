from django.shortcuts import redirect
from django.urls import reverse
from django.views.generic.base import TemplateView

from kolibri.core.device.utils import device_provisioned


class SetupWizardView(TemplateView):
    template_name = "setup_wizard/setup_wizard.html"

    def dispatch(self, *args, **kwargs):
        if device_provisioned():
            return redirect(reverse("kolibri:core:redirect_user"))
        return super(SetupWizardView, self).dispatch(*args, **kwargs)
