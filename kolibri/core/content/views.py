import logging
from base64 import urlsafe_b64decode

from django.http import Http404
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.views.generic.base import View
from rest_framework.generics import get_object_or_404

from kolibri.core.content.hooks import ContentNodeDisplayHook

from .models import ChannelMetadata
from .models import ContentNode

logger = logging.getLogger(__name__)


def get_by_node_id(node_id):
    """
    Function to return a content node based on a node id
    """
    if node_id:
        try:
            return ContentNode.objects.get(id=node_id)
        except (ContentNode.DoesNotExist, ValueError):
            # not found, or the id is invalid
            pass


def get_by_channel_id_and_content_id(channel_id, content_id):
    """
    Function to return a content node based on a channel_id and content_id
    """
    if channel_id and content_id:
        try:
            return ContentNode.objects.filter(
                channel_id=channel_id, content_id=content_id
            ).first()
        except ValueError:
            # Raised if a malformed UUID is passed
            pass


def get_by_content_id(content_id):
    """
    Function to return a content node based on a content_id
    """
    if content_id:
        try:
            return ContentNode.objects.filter(content_id=content_id).first()
        except ValueError:
            # Raised if a malformed UUID is passed
            pass


class ContentPermalinkRedirect(View):
    def get(self, request, *args, **kwargs):
        # extract the GET parameters
        channel_id = request.GET.get("channel_id")
        node_id = request.GET.get("node_id")
        content_id = request.GET.get("content_id")

        # first, try to get the node by the unique node_id
        node = get_by_node_id(node_id)

        # fall back to looking for the content_id in the channel if None
        node = node or get_by_channel_id_and_content_id(channel_id, content_id)

        # if it's still not found, see if we can find anything with the content_id across any channel
        node = node or get_by_content_id(content_id)

        # build up the target topic/content page URL
        if node:
            url = None
            for hook in ContentNodeDisplayHook.registered_hooks:
                url = hook.node_url(node)
            if url:
                return HttpResponseRedirect(url)

        raise Http404


class ChannelThumbnailView(View):
    def get(self, request, channel_id):
        # DRF's get_object_or_404, not Django's: an unparseable channel_id raises
        # ValueError from the UUID field, which only DRF's turns into a 404.
        channel = get_object_or_404(ChannelMetadata, id=channel_id)
        try:
            header, b_64_thumbnail = channel.thumbnail.split(",", 1)
            mimetype = header.split(":")[1].split(";")[0]
        except ValueError:
            raise Http404("No thumbnail available")
        thumbnail = urlsafe_b64decode(b_64_thumbnail)
        return HttpResponse(thumbnail, content_type=mimetype)
