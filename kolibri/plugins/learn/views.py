from __future__ import absolute_import, print_function, unicode_literals

import logging as logger

from django.views.generic.base import TemplateView
from kolibri.content.utils.channels import get_current_or_first_channel

logging = logger.getLogger(__name__)

class LearnView(TemplateView):
    template_name = "learn/learn.html"

    def get_context_data(self, **kwargs):
        context = super(LearnView, self).get_context_data(**kwargs)

        context['currentChannel'] = []
        channel = get_current_or_first_channel(context['view'].request)
        if channel:
            context['currentChannel'] = channel

        return context
