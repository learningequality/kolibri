from __future__ import absolute_import, print_function, unicode_literals
from django.views.generic.base import TemplateView


class CoachToolsView(TemplateView):
    template_name = "coach_tools/coach_tools.html"
