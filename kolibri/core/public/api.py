import json
import platform

from django.db.models import Q
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from morango.models import InstanceIDModel
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

import kolibri
from .. import error_constants
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.serializers import PublicChannelSerializer


class InfoViewSet(viewsets.ViewSet):
    """
    An equivalent endpoint in studio which allows kolibri devices to know
    if this device can serve content.
    Spec doc: https://docs.google.com/document/d/1XKXQe25sf9Tht6uIXvqb3T40KeY3BLkkexcV08wvR9M/edit#
    """

    def list(self, request):
        """Returns metadata information about the device"""

        instance_model = InstanceIDModel.get_or_create_current_instance()[0]

        info = {'application': 'kolibri',
                'kolibri_version': kolibri.__version__,
                'instance_id': instance_model.id,
                'device_name': instance_model.hostname,
                'operating_system': platform.system()
                }
        return Response(info)


def _get_channel_list(version, params, identifier=None):
    if version == "v1":
        return _get_channel_list_v1(params, identifier=identifier)
    else:
        raise LookupError()


def _get_channel_list_v1(params, identifier=None):
    keyword = params.get('keyword', '').strip()
    language_id = params.get('language', '').strip()

    channels = None
    if identifier:
        channels = ChannelMetadata.objects.filter(pk=identifier)
    else:
        channels = ChannelMetadata.objects.all()

    if keyword != "":
        channels = channels.filter(
            Q(name__icontains=keyword) | Q(description__icontains=keyword)
        )

    if language_id != "":
        matching_tree_ids = (
            ContentNode.objects.prefetch_related("files")
            .filter(
                Q(lang__id__icontains=language_id)
                | Q(files__lang__id__icontains=language_id)
            )
            .values_list("tree_id", flat=True)
        )
        channels = channels.filter(
            Q(root__lang__id__icontains=language_id)
            | Q(root__tree_id__in=matching_tree_ids)
        )

    return channels.filter(root__available=True).distinct()


@api_view(['GET'])
def get_public_channel_list(request, version):
    """ Endpoint: /public/<version>/channels/?=<query params> """
    try:
        channel_list = _get_channel_list(version, request.query_params)
    except LookupError:
        return HttpResponseNotFound(json.dumps({'id': error_constants.NOT_FOUND, 'metadata': {'view': ''}}), content_type='application/json')
    return HttpResponse(json.dumps(PublicChannelSerializer(channel_list, many=True).data), content_type='application/json')


@api_view(['GET'])
def get_public_channel_lookup(request, version, identifier):
    """ Endpoint: /public/<version>/channels/lookup/<identifier> """
    try:
        channel_list = _get_channel_list(version, request.query_params, identifier=identifier.strip().replace('-', ''))
    except LookupError:
        return HttpResponseNotFound(json.dumps({'id': error_constants.NOT_FOUND, 'metadata': {'view': ''}}), content_type='application/json')

    if not channel_list.exists():
        return HttpResponseNotFound(json.dumps({'id': error_constants.NOT_FOUND, 'metadata': {'view': ''}}), content_type='application/json')
    return HttpResponse(json.dumps(PublicChannelSerializer(channel_list, many=True).data), content_type='application/json')
