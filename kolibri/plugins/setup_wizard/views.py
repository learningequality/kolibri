from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from django.utils.decorators import method_decorator
from django.views.generic.base import TemplateView

from kolibri.core.decorators import signin_redirect_exempt
from kolibri.core.device.utils import device_provisioned


@method_decorator(signin_redirect_exempt, name='dispatch')
class SetupWizardView(TemplateView):
    template_name = "setup_wizard/setup_wizard.html"

    def dispatch(self, *args, **kwargs):
        if device_provisioned():
            return redirect(reverse('kolibri:core:redirect_user'))
        return super(SetupWizardView, self).dispatch(*args, **kwargs)
