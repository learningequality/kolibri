from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import logging as logger

from django.views.generic.base import TemplateView

logging = logger.getLogger(__name__)

class LearnView(TemplateView):
    template_name = "learn/learn.html"
