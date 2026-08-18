from base64 import urlsafe_b64decode

from django.http import Http404
from django.http import HttpResponse
from django.views import View
from rest_framework.generics import get_object_or_404

from kolibri.core.content import models
from kolibri.core.utils.pagination import ValuesViewsetPageNumberPagination


class ChannelThumbnailView(View):
    def get(self, request, channel_id):
        channel = get_object_or_404(models.ChannelMetadata, id=channel_id)
        try:
            header, b_64_thumbnail = channel.thumbnail.split(",", 1)
            mimetype = header.split(":")[1].split(";")[0]
        except ValueError:
            raise Http404("No thumbnail available")
        thumbnail = urlsafe_b64decode(b_64_thumbnail)
        return HttpResponse(thumbnail, content_type=mimetype)


class OptionalPageNumberPagination(ValuesViewsetPageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """

    page_size = None
    page_size_query_param = "page_size"
