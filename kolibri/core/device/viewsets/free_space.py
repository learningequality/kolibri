from django.http.response import HttpResponseBadRequest
from rest_framework import mixins
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import Serializer

from kolibri.utils.conf import OPTIONS
from kolibri.utils.system import get_free_space


class FreeSpaceView(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        """
        Add this purely to avoid warnings from DRF YASG schema generation.
        """
        return Serializer

    def get_queryset(self):
        """
        Add this purely to avoid warnings from DRF YASG schema generation.
        """
        return None

    def list(self, request):
        path = request.query_params.get("path")
        if path != "Content":
            return HttpResponseBadRequest("Invalid path")
        free = get_free_space(OPTIONS["Paths"]["CONTENT_DIR"])

        return Response({"freespace": free})
