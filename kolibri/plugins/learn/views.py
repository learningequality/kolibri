from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.views.generic.base import TemplateView


class LearnView(TemplateView):
    template_name = "learn/learn.html"
