from __future__ import absolute_import, print_function, unicode_literals
from django.views.generic.base import TemplateView


class CoachView(TemplateView):
    template_name = "coach/coach.html"
