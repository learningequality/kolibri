from __future__ import absolute_import, print_function, unicode_literals

from django.views.generic.base import TemplateView


class LearnView(TemplateView):

    template_name = "learn/learn.html"
