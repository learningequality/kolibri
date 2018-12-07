from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets

from kolibri.core.content.api import ChannelMetadataFilter
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.serializers import ChannelMetadataSerializer


class DeviceChannelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChannelMetadataSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelMetadataFilter

    def get_queryset(self):
        return ChannelMetadata.objects.all() \
            .order_by('-last_updated') \
            .select_related('root__lang')
