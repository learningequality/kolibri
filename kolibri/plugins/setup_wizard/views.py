from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.views.generic.base import TemplateView

class SetupWizardView(TemplateView):
    template_name = "setup_wizard/setup_wizard.html"
