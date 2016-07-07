from __future__ import absolute_import, print_function, unicode_literals

from django.views.generic.base import TemplateView
from kolibri.content.content_db_router import using_content_database
from kolibri.content.models import ContentNode
from kolibri.content.serializers import ContentNodeSerializer
from rest_framework.renderers import JSONRenderer


class LearnView(TemplateView):

    template_name = "learn/learn.html"

    def get_context_data(self, **kwargs):
        channel_id = getattr(self.request, "channel_id", "dummy_db")
        with using_content_database(channel_id):
            context = super(LearnView, self).get_context_data(**kwargs)

            top_level_nodes = ContentNode.objects.get(parent__isnull=True).get_children()
            mcontext = {'request': self.request}
            topics_serializer = ContentNodeSerializer(top_level_nodes, context=mcontext, many=True)
            context['topics'] = JSONRenderer().render(topics_serializer.data)
        return context
