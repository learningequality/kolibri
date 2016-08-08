from __future__ import absolute_import, print_function, unicode_literals

from django.conf import settings
from django.views.generic.base import TemplateView
from kolibri.content.content_db_router import using_content_database
from kolibri.content.models import ChannelMetadataCache, ContentNode
from kolibri.content.serializers import ChannelMetadataCacheSerializer, ContentNodeSerializer
from rest_framework.renderers import JSONRenderer


class LearnView(TemplateView):

    template_name = "learn/learn.html"

    def get_context_data(self, **kwargs):
        channel_id = getattr(self.request, "channel_id", "7199dde695db4ee4ab392222d5af1e51")
        context = super(LearnView, self).get_context_data(**kwargs)
        with using_content_database(channel_id):
            root_node = ContentNode.objects.get(parent__isnull=True)
            top_level_nodes = root_node.get_children()
            mcontext = {'request': self.request}
            topics_serializer = ContentNodeSerializer(top_level_nodes, context=mcontext, many=True)
            root_node_serializer = ContentNodeSerializer(root_node, context=mcontext)
            context['nodes'] = JSONRenderer().render(topics_serializer.data)
            context['rootnode'] = JSONRenderer().render(root_node_serializer.data)
        context['kolibri'] = settings.KOLIBRI_CORE_JS_NAME
        context['channel_id'] = channel_id

        channel_serializer = ChannelMetadataCacheSerializer(ChannelMetadataCache.objects.all(), many=True)
        channels = JSONRenderer().render(channel_serializer.data)
        context['channels'] = channels
        return context
