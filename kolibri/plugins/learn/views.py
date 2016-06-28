from __future__ import absolute_import, print_function, unicode_literals

from django.views.generic.base import TemplateView
from kolibri.content.api import get_top_level_topics
from kolibri.content.serializers import ContentNodeSerializer
from rest_framework.renderers import JSONRenderer


class LearnView(TemplateView):

    template_name = "learn/learn.html"

    def get_context_data(self, **kwargs):
        channel_id = getattr(self.request, "channel_id", "dummy_db")
        context = super(LearnView, self).get_context_data(**kwargs)
        topics_serializer = ContentNodeSerializer(get_top_level_topics(channel_id),
                                                  many=True)
        topics_serializer.context["channel_id"] = channel_id
        context['topics'] = JSONRenderer().render(topics_serializer.data)
        return context
