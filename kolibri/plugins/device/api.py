import uuid

from django.db.models import Case
from django.db.models import When
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.exceptions import ParseError
from rest_framework.response import Response
from rest_framework.views import APIView

from kolibri.core.content.api import ChannelMetadataFilter
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.serializers import ChannelMetadataSerializer
from kolibri.core.device.models import ContentCacheKey


class DeviceChannelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChannelMetadataSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelMetadataFilter

    def get_queryset(self):
        return (
            ChannelMetadata.objects.all()
            .order_by("-last_updated")
            .select_related("root__lang")
        )


def validate_uuid(value):
    try:
        uuid.UUID(value, version=4)
        return True
    except ValueError:
        return False


class DeviceChannelOrderView(APIView):
    permission_classes = (CanManageContent,)

    def post(self, request, *args, **kwargs):
        try:
            ids = request.data
            assert isinstance(ids, list)
            assert all(map(validate_uuid, ids))
        except AssertionError:
            raise ParseError("Array of ids not sent in body of request")
        queryset = ChannelMetadata.objects.filter(root__available=True)
        total_channels = queryset.count()
        if len(ids) != total_channels:
            raise ParseError(
                "Expected {} ids, but only received {}".format(total_channels, len(ids))
            )
        if queryset.filter(id__in=ids).count() != len(ids):
            raise ParseError(
                "List of ids does not match the available channels on the server"
            )
        queryset.update(
            order=Case(*(When(id=uuid, then=i + 1) for i, uuid in enumerate(ids)))
        )
        ContentCacheKey.update_cache_key()
        return Response({})
